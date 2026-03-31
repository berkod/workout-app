# Tech Stack

## Frontend

- **React** (via Next.js) — component-based UI for collapsible sections, inline editing, and state management
- **Tailwind CSS** — utility-first styling, mobile-first responsive design, fall color theme

## Backend

- **Next.js** (App Router) — API routes handle Google Sheets authentication and data operations server-side, keeping credentials secure
- **Node.js** runtime

## Database

- **Google Sheets** — sole data source; the app reads and writes directly via the Google Sheets API
- **`googleapis` npm package** — official Google API client for Node.js

## Hosting

- **Opalstack** — self-hosted deployment
- Next.js runs as a Node.js application on Opalstack's platform

## Setup Notes

- Google Cloud project required for Sheets API credentials (service account)
- README.md will include step-by-step instructions for:
  - Creating a Google Cloud project and enabling the Sheets API
  - Creating a service account and downloading credentials
  - Sharing the Google Sheet with the service account email
  - Configuring environment variables
  - Deploying Next.js on Opalstack
