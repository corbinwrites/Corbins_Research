# gmail-cli

This replaces the abandoned OAuth-based prototype with a local Gmail CLI that uses your existing Google Chrome session.

## Requirements

- Gmail is open in Google Chrome.
- In Chrome, enable `View > Developer > Allow JavaScript from Apple Events`.
- You are already signed in to Gmail in that Chrome profile.

## Commands

```bash
cd /Users/corbin/Hal9000/gmail-cli
node index.js status
node index.js search 'from:irs after:2025/01/01'
node index.js tax-search --limit 25
node index.js read
node index.js read 1972d8e8d4d3c123
```

## What `tax-search` does

`tax-search` runs a broader Gmail query for likely 2025 tax material, including messages about:

- tax or taxes
- accountant
- IRS
- W-2, 1099, 1098, K-1
- brokerage or investment income
- mortgage interest or property tax
- donation receipts
- health insurance forms
- tuition, 529, HSA, and medical expenses

The results are printed as JSON with sender, subject, snippet, date, URL, and thread id when Gmail exposes it.

## Notes

- This is intentionally local-first. It does not require Google Cloud credentials.
- Gmail DOM selectors can change. If Google updates the inbox UI, the extraction selectors in `index.js` may need a refresh.
