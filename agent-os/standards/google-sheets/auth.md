---
name: Google Sheets Auth
description: How to authenticate with Google Sheets API using a service account
type: standard
---

# Google Sheets Auth

Create a new auth client per API call via `getSheets()`.

```ts
function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}
```

- Do NOT cache a module-level singleton
- `GOOGLE_PRIVATE_KEY` env var uses `\n` literals — always call `.replace(/\\n/g, '\n')`
- Credentials live in `.env.local`, never committed
