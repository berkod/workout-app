# 531 Tracker

A mobile-first web app for tracking 5/3/1 weightlifting workouts. Reads and writes directly to a Google Sheet.

## Features

- **Routine selection** — choose from Day 1 (Press), Day 2 (RDL), or Day 3 (Bench)
- **Collapsible sections** — sets organized by type (warm-up, main, FSL, accessory)
- **Inline editing** — tap target weight or reps to modify
- **Auto-save** — actual reps save to the sheet immediately
- **Auto-advance** — sections collapse when complete, next section opens
- **Complete workout** — one button to finalize, filling empty reps with 0

## Google Sheet Setup

Your Google Sheet must have these columns in row 1:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| DATE | ROUTINE | SET TYPE | EXERCISE | TARGET REPS | TARGET WEIGHT | ACTUAL REPS |

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name it (e.g., "531 Tracker") and click **Create**

### 2. Enable the Google Sheets API

1. In the Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google Sheets API"
3. Click **Enable**

### 3. Create a Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Name it (e.g., "531-tracker") and click **Create and Continue**
4. Skip the optional role/access steps and click **Done**
5. Click on the new service account email
6. Go to the **Keys** tab → **Add Key** → **Create new key** → **JSON**
7. Save the downloaded JSON file securely

### 4. Share Your Google Sheet

1. Open your Google Sheet
2. Click **Share**
3. Add the service account email (found in the JSON file as `client_email`)
4. Give it **Editor** access
5. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`

### 5. Configure Environment Variables

Create `.env.local` in the project root:

```
GOOGLE_SHEET_ID=your-sheet-id-here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

The `GOOGLE_PRIVATE_KEY` value is the `private_key` field from your service account JSON file. Keep the `\n` characters as-is.

## Local Development

```bash
nvm use           # Uses Node v24 from .nvmrc
npm install
npm run dev       # Starts at http://localhost:3000
```

## Testing

```bash
npm test          # Run all tests
npm run test:watch # Watch mode
```

## Deploying to Opalstack

### Prerequisites

- An Opalstack account with a **Node.js** application type available
- SSH access to your Opalstack server

### 1. Create a Node.js Application in Opalstack

1. Log in to your [Opalstack dashboard](https://my.opalstack.com/)
2. Go to **Applications** → **Add Application**
3. Select **Node.js** as the type
4. Name it (e.g., "531-tracker")
5. Note the assigned port number

### 2. Create a Site and Route

1. Go to **Sites** → **Add Site**
2. Select your domain
3. Add a **Route** pointing `/` to your Node.js application

### 3. Deploy the App

SSH into your Opalstack server:

```bash
ssh your-username@your-server.opalstack.com
cd ~/apps/531-tracker  # Your app directory
```

Clone your repository and set up:

```bash
git clone <your-repo-url> .
nvm install 24
nvm use 24
npm install
npm run build
```

### 4. Set Environment Variables

Create `.env.local` on the server with your Google credentials (same as local development).

### 5. Configure the Start Script

Edit the `start` script or create a `start.sh`:

```bash
#!/bin/bash
export PORT=<your-opalstack-port>
cd ~/apps/531-tracker
source ~/.nvm/nvm.sh
nvm use 24
npm start
```

Make it executable:

```bash
chmod +x start.sh
```

### 6. Restart the Application

In the Opalstack dashboard, click **Restart** on your application, or:

```bash
# Opalstack uses supervisord
supervisorctl restart 531-tracker
```

Your app should now be live at your configured domain.

## Tech Stack

- **Next.js** (App Router) — React framework with server-side API routes
- **Tailwind CSS** — Utility-first styling
- **Google Sheets API** — Data storage via `googleapis` npm package
- **Vitest** — Test framework
