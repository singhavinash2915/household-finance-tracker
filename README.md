# Household Finance Tracker

A private, offline personal-finance dashboard for a **dual-income Indian household**. Budget against the 50/30/20 rule, log expenses, track net worth month by month, size your emergency fund, plan investments, and work backwards from goals to the monthly SIP each one needs.

**Everything stays in your browser.** There is no backend, no login, and no API calls — all data is saved to `localStorage`. The flip side: your data lives in *this* browser on *this* device, so use **Export data as JSON** to keep a backup.

**Built for the phone.** It installs to your home screen as a PWA and runs fully offline — the app shell is precached by a service worker, so it opens with no network at all. On a phone you get a bottom tab bar, card layouts instead of wide tables, thumb-sized controls, and no accidental zoom when you tap a number field.

## The idea: stop typing transactions

Most trackers die because logging every purchase is a second job. This one assumes you won't. Each budget category picks **how it fills its Actual**, and the total is the sum of all three sources — so nothing is ever silently dropped:

| Mode | Effort | Use it for |
| --- | --- | --- |
| **Auto** | None, ever | Rent/EMI, insurance, school fees, domestic help, SIPs, EPF, subscriptions — anything with a fixed amount on a fixed date. Set it once and it posts itself every month, including in months you haven't opened yet. |
| **Monthly** | One number a month | Groceries, fuel, utilities, shopping — variable, but you can read the total off a statement in ten seconds. |
| **Detailed** | Itemised rows | Only where the detail earns its keep. Backed by the statement importer, so it still isn't typing. |

Out of the box that's **12 automatic categories, 8 monthly numbers, and 2 itemised** — a month closes in about two minutes. The Dashboard shows a checklist of what's left, and the Budget page collects every outstanding monthly total in one grid at the top.

### Income, including freelance

Salaries for both earners are fixed and carry across months. Freelance, consulting, rent and bonuses are recorded **against the month you were paid**, because they genuinely vary — a ₹32,000 freelance month raises that month's 50/30/20 targets and its investible surplus, and leaves every other month alone. Add them under **Dashboard → Monthly income**.

### Paste a statement instead of typing it

**Expense Log → Paste a statement** takes rows copied straight out of netbanking, a card statement or a CSV. It:

- reads `dd/mm/yyyy`, `dd-mm-yy`, `yyyy-mm-dd` and `05 Sep 2026` dates;
- picks the transaction amount out of debit/credit/balance columns rather than grabbing the running balance;
- detects credits (salary, refunds) and leaves them out by default;
- guesses a category from the merchant — Swiggy and Zomato to Dining, BigBasket and DMart to Groceries, IOCL and Uber to Transport, Netflix to Subscriptions, Zerodha to Direct Stocks, and so on;
- shows everything in an editable preview before a single row is imported.

Importing into a category switches it to Detailed and clears that month's typed total, so the same spending is never counted twice.

## What flows into what

Numbers are entered once and travel:

```
Income (Dashboard)
   └─> 50/30/20 targets ─> Budget
Budget actuals
   ├─> Dashboard ratios and charts
   ├─> Needs total ─> Emergency Fund "monthly essentials"
   └─> Savings total ─> Investment Plan surplus ─> Goals affordability check
Net Worth
   ├─> assets ─> Emergency Fund balance (optional auto-tracking)
   └─> next month starts from this month + this month's contributions
```

One-click actions that write across pages:

- **Net Worth → Roll forward + add contributions** — carries last month's balances over and adds what the Savings categories actually contributed (EPF to EPF Balance, SIP to Mutual Funds, and so on). Only market movement and loan balances need a human.
- **Investment Plan → Apply to budget** — writes the plan's rupee amounts into the month's Savings budget lines.
- **Emergency Fund → Fund it over 12 months** — sizes the top-up needed to close the shortfall in a year and rebalances the Investment Plan around it.
- **Budget → Match budget to actuals** — snaps a bucket's budgeted figures to what actually happened.
- **Month rollover** — a new month inherits every category, mode and auto amount automatically. Saved months are never overwritten.

## Pages

| Page | What it does |
| --- | --- |
| **Dashboard** | Month-close checklist, editable take-home pay for both earners plus per-month freelance/other income, Needs/Wants/Savings totals, and ratio cards — savings rate, needs ratio, emergency-fund months, net worth, debt-to-income — each with a green/amber/red badge. Charts compare actuals against the 50/30/20 target and plot the net-worth trend. Every card is a link to the page behind it. |
| **Monthly Budget** | Needs/Wants/Savings tables with a mode switch per category, budgeted vs actual vs variance, and a quick-fill grid for outstanding monthly totals. Add or remove categories freely. |
| **Expense Log** | Quick-add bar plus the statement importer. Filter by category, payer or date range, search notes, and scope to the current month or all history. |
| **Net Worth** | Assets and liabilities per month, month-on-month change, and a trend chart. |
| **Emergency Fund** | Target months, balance (typed or auto-tracked from chosen net-worth assets), shortfall, months covered, and progress. |
| **Investment Plan** | Splits the investible surplus across PPF, NPS, mutual funds, stocks, emergency top-up and gold, with live amounts, a 100% check, and each instrument's lock-in and tax treatment in a line. |
| **Goals & SIP** | Required monthly SIP per goal, the total across all goals, and whether your surplus covers it. |
| **Settings & Data** | Export to JSON, import from JSON, reset behind a confirmation. |

Money is formatted throughout with the Indian numbering system (`₹1,50,000`, not `₹150,000`), and negative amounts appear in parentheses in red. Large figures compact to `₹1.23 Cr` / `₹12.4 L` in charts and tight spaces.

### Ratio thresholds

| Metric | 🟢 Green | 🟡 Amber | 🔴 Red |
| --- | --- | --- | --- |
| Savings rate | ≥ 20% | 10–20% | < 10% |
| Emergency fund months | ≥ 6 | 3–6 | < 3 |
| Debt-to-income | ≤ 35% | 35–50% | > 50% |
| Needs ratio | ≤ 50% | 50–60% | > 60% |

Debt-to-income uses actual spend on Needs categories whose names look like debt servicing (`EMI`, `Loan`, `Credit Card`) divided by combined take-home income.

**Investible surplus** is the month's Savings actual *minus* anything not mapped to an instrument — EPF, notably, which is deducted at source and isn't yours to allocate. The Investment Plan's percentages apply to that figure, so "apply to budget" stays stable instead of inflating the total each time.

### SIP formula

```
SIP = FV × r / (((1 + r)^n − 1) × (1 + r))
```

where `r` is the monthly rate (annual return ÷ 12) and `n` is the number of months (years × 12). This is the SIP-due form, which assumes each contribution is made at the *start* of the month.

## Example data

The app ships with a **fully populated example household** — Avinash and Amrita, three months of budgets, monthly totals and itemised transactions, net-worth snapshots, and five goals — so nothing looks empty on first load. It is clearly labelled with an amber banner, which disappears the moment you edit anything. To start from scratch, go to **Settings & Data → Reset all data**, then clear the fields (or import your own JSON export).

## Install it on your phone

Once deployed (or served over HTTPS / localhost):

- **iPhone (Safari)** — open the URL, tap Share, then **Add to Home Screen**. It launches full-screen with no browser chrome.
- **Android (Chrome)** — open the URL and accept the **Install app** prompt, or use the ⋮ menu → **Add to Home screen**.

After the first load it works with no connection at all. Note that each install keeps its own `localStorage`, so use Export/Import to move data between your phone and desktop.

## Run it locally

```bash
npm install && npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

Other scripts:

```bash
npm run build     # type-check and produce a production build in dist/
npm run preview   # serve the production build locally
```

## Deploy to GitHub Pages

`.github/workflows/deploy.yml` builds the app and publishes `dist/` to a `gh-pages` branch on every push to `main`.

1. Push this repository to GitHub with `main` as the default branch.
2. In the repo, go to **Settings → Pages**, set **Source** to **Deploy from a branch**, choose the **`gh-pages`** branch and the **`/ (root)`** folder, and save.
3. Push to `main` (or run the workflow manually from the **Actions** tab). The first run creates the `gh-pages` branch; if the branch did not exist when you visited the Pages settings, set the source after that first run.
4. Your app appears at `https://<your-username>.github.io/<your-repo-name>/`.

The workflow needs no secrets — it uses the built-in `GITHUB_TOKEN`, which requires **Settings → Actions → General → Workflow permissions** to be set to **Read and write permissions**.

### About the base path

A GitHub Pages project site is served from a subdirectory, so Vite has to be told where assets live. The workflow derives this from the repository name automatically:

```yaml
run: BASE_PATH="/${GITHUB_REPOSITORY#*/}/" npm run build
```

So the repo can be named anything — no code change needed. For a local production build, `vite.config.ts` falls back to `/household-finance-tracker/`; override it with `BASE_PATH=/ npm run build` if you are serving from a domain root (e.g. a user site at `<username>.github.io`, or Netlify/Vercel).

## Tech

React 18 · Vite 5 · TypeScript (strict) · Tailwind CSS 3 · Recharts 2 · vite-plugin-pwa (Workbox)

All state is one JSON object under the `localStorage` key `household-finance-tracker:v1`, written with a 400 ms debounce so typing doesn't thrash storage. The header shows a Saving/Saved indicator, and warns instead if the browser is refusing to persist (private mode, blocked storage). Older saved data is migrated forward on load rather than discarded.

## A note on the numbers

This is a planning tool, not financial advice. Expected returns are your assumptions, figures are nominal (they ignore inflation and taxes unless you account for that yourself), and the emergency-fund guidance (3–6 months for a dual-income household, 6–12 for single-income) is a common rule of thumb, not a rule.
