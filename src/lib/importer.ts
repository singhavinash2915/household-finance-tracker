// ---------------------------------------------------------------------------
// Bank / card statement paste-import. Typing transactions by hand is the thing
// that kills a tracker, so this takes whatever rows you copy out of a statement
// or CSV, works out the date / amount / description, and guesses a category.
// Everything is shown in an editable preview before anything is imported.
// ---------------------------------------------------------------------------

import type { Payer } from './types'

export interface ParsedRow {
  key: string
  date: string // YYYY-MM-DD
  description: string
  amount: number
  /** Credits (salary, refunds) are detected so they can be excluded. */
  isCredit: boolean
  category: string
  paidBy: Payer
  include: boolean
  raw: string
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Handles dd/mm/yyyy, dd-mm-yy, yyyy-mm-dd and "05 Sep 2026" / "05-Sep-26". */
export function parseDate(text: string): string | null {
  const iso = text.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/)
  if (iso) return `${iso[1]}-${pad(+iso[2])}-${pad(+iso[3])}`

  const named = text.match(/\b(\d{1,2})[-\s/]([A-Za-z]{3,})[-\s/](\d{2,4})\b/)
  if (named) {
    const m = MONTHS[named[2].slice(0, 3).toLowerCase()]
    if (m) {
      const y = +named[3]
      return `${y < 100 ? 2000 + y : y}-${pad(m)}-${pad(+named[1])}`
    }
  }

  // Indian statements are overwhelmingly day-first.
  const dmy = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/)
  if (dmy) {
    const y = +dmy[3]
    return `${y < 100 ? 2000 + y : y}-${pad(+dmy[2])}-${pad(+dmy[1])}`
  }
  return null
}

const AMOUNT_RE = /-?(?:₹|rs\.?|inr)?\s?-?\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?|-?\d+(?:\.\d{1,2})?/gi

function toNumber(token: string): number {
  return Number(token.replace(/[^\d.-]/g, ''))
}

/**
 * Pull the transaction amount out of a row. Statements usually end with a
 * running balance, and often have separate debit/credit columns, so the last
 * number on the line is the least likely to be what we want.
 */
function extractAmount(fields: string[], line: string): { amount: number; isCredit: boolean } | null {
  const creditFlag = /\b(cr|credit|deposit|received|refund|salary|neft.*cr)\b/i.test(line)
  const debitFlag = /\b(dr|debit|withdrawal|paid|purchase|upi\/p2m)\b/i.test(line)

  // Column-shaped input: prefer a numeric column that is not the last one.
  const numericCols = fields
    .map((f, i) => ({ i, n: toNumber(f), text: f }))
    .filter((c) => c.text.trim() !== '' && Number.isFinite(c.n) && /\d/.test(c.text) && !/^\d{1,2}[-/.]\d{1,2}/.test(c.text.trim()))

  if (fields.length >= 3 && numericCols.length >= 2) {
    const candidate = numericCols[numericCols.length - 2]
    if (candidate && Math.abs(candidate.n) > 0) {
      return { amount: Math.abs(candidate.n), isCredit: creditFlag && !debitFlag }
    }
  }

  const matches = line.match(AMOUNT_RE)?.map(toNumber).filter((n) => Number.isFinite(n) && Math.abs(n) > 0) ?? []
  // Drop anything that was actually part of the date.
  const usable = matches.filter((n) => Math.abs(n) > 31 || String(n).includes('.'))
  if (usable.length === 0) return null
  const amount = usable.length > 1 ? usable[usable.length - 2] : usable[0]
  return { amount: Math.abs(amount), isCredit: creditFlag && !debitFlag ? true : amount > 0 && creditFlag }
}

/** Merchant keywords → the default category names shipped with the app. */
const KEYWORD_RULES: Array<[RegExp, string]> = [
  [/swiggy|zomato|dominos|pizza|restaurant|cafe|coffee|starbucks|dineout|eatsure|barbeque/i, 'Dining Out & Food Delivery'],
  [/bigbasket|dmart|d-mart|blinkit|zepto|instamart|grofers|jiomart|reliance fresh|kirana|grocer|supermarket/i, 'Groceries & Household'],
  [/amazon|flipkart|myntra|ajio|nykaa|meesho|tatacliq|decathlon|ikea|croma|reliance trends|lifestyle|shoppers stop/i, 'Shopping'],
  [/netflix|spotify|prime video|hotstar|jiocinema|sonyliv|zee5|youtube premium|apple\.com\/bill|icloud|google one|adobe|chatgpt|openai/i, 'Subscriptions'],
  [/bookmyshow|pvr|inox|cinema|movie|theatre/i, 'Entertainment & OTT'],
  [/uber|ola|rapido|indianoil|iocl|hpcl|bharat petroleum|bpcl|shell|fuel|petrol|fastag|metro|irctc|redbus|parking/i, 'Transport & Fuel'],
  [/electricity|bescom|tneb|msedcl|adani electricity|torrent power|gas|indane|hp gas|airtel|jio|vodafone|vi postpaid|bsnl|act fibernet|hathway|broadband|wifi|tata play|dish tv/i, 'Electricity/Gas/Wifi/Phone'],
  [/lic |hdfc life|icici pru|max life|star health|niva bupa|policybazaar|insurance|premium|term plan/i, 'Insurance Premiums'],
  [/school|tuition|fees|daycare|creche|byju|vedantu|unacademy|kumon/i, 'School Fees/Child Care'],
  [/makemytrip|goibibo|cleartrip|yatra|airbnb|oyo|indigo|air india|vistara|spicejet|hotel|resort|travel/i, 'Travel & Vacations'],
  [/salon|spa|barber|urban company|gym|cult\.fit|fitness|pharmacy|apollo|1mg|pharmeasy|netmeds/i, 'Personal Care'],
  [/gift|festival|donation|temple|wedding/i, 'Gifts & Social'],
  [/sip|mutual fund|groww|zerodha coin|kuvera|indmoney|nippon|axis mutual|hdfc mf|icici pru mf|elss/i, 'Mutual Fund SIP/ELSS'],
  [/zerodha|upstox|angel one|dhan|stock|equity|broker/i, 'Direct Stocks'],
  [/ppf|public provident/i, 'PPF'],
  [/nps|national pension/i, 'NPS Voluntary'],
  [/sgb|sovereign gold|gold bond|digital gold|augmont|safegold/i, 'Gold/SGB'],
  [/emi|home loan|housing loan|car loan|personal loan|loan repay/i, 'Rent/Home Loan EMI'],
  [/rent/i, 'Rent/Home Loan EMI'],
  [/maid|housekeep|domestic|cook |driver salary/i, 'Domestic Help'],
]

export function guessCategory(description: string, available: string[]): string {
  for (const [pattern, category] of KEYWORD_RULES) {
    if (pattern.test(description) && available.includes(category)) return category
  }
  // Fall back to a direct name match, so custom categories work too.
  const lower = description.toLowerCase()
  const direct = available.find((c) => c && lower.includes(c.toLowerCase().split(/[\s/&]/)[0]))
  return direct ?? ''
}

function splitFields(line: string): string[] {
  if (line.includes('\t')) return line.split('\t')
  if ((line.match(/,/g)?.length ?? 0) >= 2) return line.split(',')
  if (/\s{2,}/.test(line)) return line.split(/\s{2,}/)
  return [line]
}

const HEADER_RE = /^(date|txn|transaction|particulars|description|narration|withdrawal|deposit|debit|credit|balance)/i

export function parseStatement(text: string, categories: string[], defaultPayer: Payer): ParsedRow[] {
  const rows: ParsedRow[] = []
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  lines.forEach((line, index) => {
    const fields = splitFields(line).map((f) => f.trim().replace(/^"|"$/g, ''))
    if (fields.every((f) => HEADER_RE.test(f) || f === '')) return

    const date = parseDate(line)
    const money = extractAmount(fields, line)
    if (!date || !money) return

    // Description = the wordiest field that isn't a date or a number.
    const description =
      fields
        .filter((f) => /[a-z]{3,}/i.test(f) && !parseDate(f) && !HEADER_RE.test(f))
        .sort((a, b) => b.length - a.length)[0] ?? line

    const clean = description.replace(/\s+/g, ' ').trim().slice(0, 80)
    rows.push({
      key: `${index}-${date}-${money.amount}`,
      date,
      description: clean,
      amount: money.amount,
      isCredit: money.isCredit,
      category: money.isCredit ? '' : guessCategory(clean, categories),
      paidBy: defaultPayer,
      include: !money.isCredit,
      raw: line,
    })
  })

  return rows
}
