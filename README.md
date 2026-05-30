# TLC Management System

A web application for managing Teacher Learning Communities (TLCs) — tracking coaches, teachers, TLC groups, attendance, and analytics. The attendance tracker runs as a **Progressive Web App (PWA)** that works fully offline and syncs automatically when connectivity is restored.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Running Locally](#running-locally)
   - [Backend (.NET 8 API)](#backend-net-8-api)
   - [Frontend (React + Vite)](#frontend-react--vite)
4. [PWA & Offline Mode](#pwa--offline-mode)
   - [How it works](#how-it-works)
   - [Files added](#files-added)
5. [Deploying to Azure](#deploying-to-azure)
   - [Backend — Azure App Service](#backend--azure-app-service)
   - [Frontend — Azure Static Web Apps](#frontend--azure-static-web-apps)
   - [Post-deployment checklist](#post-deployment-checklist)
6. [Installing the App on Mobile](#installing-the-app-on-mobile)
   - [Android (Chrome)](#android-chrome)
   - [iPhone / iPad (Safari)](#iphone--ipad-safari)
7. [Using the Offline Attendance Tracker](#using-the-offline-attendance-tracker)
8. [User Roles](#user-roles)
9. [API Reference](#api-reference)
10. [Database Management](#database-management)
11. [Azure AD Setup](#azure-ad-setup)
12. [Bulk Upload Excel Format](#bulk-upload-excel-format)
13. [Troubleshooting](#troubleshooting)

---

## Architecture

```
C:\000_CEQUE_TLC\
├── backend\
│   ├── TLC.API\              Controllers, DTOs, middleware, Program.cs
│   ├── TLC.Core\             Domain models, services (code gen, Excel import)
│   ├── TLC.Infrastructure\   EF Core DbContext, repositories, migrations
│   └── TLC.Tests\            xUnit tests
└── frontend\
    └── tlc-app\
        ├── public\           Static assets, PWA icon, staticwebapp.config.json
        └── src\
            ├── components\   Layout, OfflineBanner, SyncStatus, ...
            ├── context\      AuthContext, SyncContext
            ├── db\           localDb.ts  (Dexie / IndexedDB)
            ├── hooks\        useOnlineStatus.ts
            ├── pages\        TLCAttendancePage, Dashboard, Reports, ...
            ├── services\     apiClient.ts, offlineApi.ts, syncService.ts
            └── types\        TypeScript interfaces
```

**Backend stack:** .NET 8 · ASP.NET Core · EF Core 8 · SQLite · Azure AD (Microsoft.Identity.Web)

**Frontend stack:** React 19 · TypeScript · Vite 8 · Material UI v9 · React Router v7 · Axios · Dexie (IndexedDB) · Recharts

**PWA stack:** vite-plugin-pwa · Workbox (service worker + asset caching + NetworkFirst API caching)

---

## Prerequisites

| Tool                      | Version     | Install                                                       |
| ------------------------- | ----------- | ------------------------------------------------------------- |
| .NET SDK                  | 8.x         | https://dotnet.microsoft.com/download/dotnet/8.0              |
| Node.js                   | 18 or later | https://nodejs.org                                            |
| dotnet-ef CLI             | 8.0.4       | `dotnet tool install --global dotnet-ef --version 8.0.4`      |
| Azure CLI _(deploy only)_ | latest      | https://learn.microsoft.com/en-us/cli/azure/install-azure-cli |

Verify:

```bash
dotnet --version          # 8.x.x
node --version            # v18 or later
npm --version             # 9.x or later
dotnet ef --version       # 8.0.4
```

---

## Running Locally

### Backend (.NET 8 API)

#### 1. Configure Azure AD (or skip for local dev)

Open `backend\TLC.API\appsettings.Development.json` and add your tenant/client IDs, or leave the placeholders and disable auth temporarily (see [Troubleshooting](#troubleshooting)).

```json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "YOUR-TENANT-ID",
    "ClientId": "YOUR-CLIENT-ID"
  },
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=tlc_management.db"
  },
  "CorsOrigins": ["http://localhost:5173"]
}
```

#### 2. Restore, build, and run

```bash
cd backend
dotnet restore TLC.Management.sln
dotnet build  TLC.Management.sln

cd TLC.API
dotnet run
```

The API starts at:

| URL                             | Purpose                       |
| ------------------------------- | ----------------------------- |
| `http://localhost:5210`         | HTTP API                      |
| `https://localhost:7100`        | HTTPS API                     |
| `http://localhost:5210/swagger` | Swagger UI (interactive docs) |

Migrations run automatically on startup. The SQLite file is created at `backend\TLC.API\tlc_management.db`.

---

### Frontend (React + Vite)

#### 1. Install dependencies

```bash
cd frontend\tlc-app
npm install
```

#### 2. Set the API URL

Create (or edit) `frontend\tlc-app\.env.local`:

```env
VITE_API_BASE_URL=http://localhost:5210/api
```

#### 3. Start the dev server

```bash
npm run dev
```

The app opens at **http://localhost:5173**.

> **Note:** The service worker does **not** activate in `npm run dev` mode. To test PWA / offline behaviour locally, run a production preview:
>
> ```bash
> npm run build
> npm run preview
> ```
>
> Then open **http://localhost:4173**.

---

## PWA & Offline Mode

### How it works

The TLC Attendance page is designed **offline-first**:

```
User fills in form → Submit
        │
        ▼
  Save record to IndexedDB (always instant, works offline)
        │
        ├─── Online? ──YES──► POST to API ──► Mark "synced"
        │                                        │
        │                                        ▼
        │                              "Recorded and synced"
        │
        └─── Offline? ──────────────► Stay in pending queue
                                             │
                                             ▼
                               Amber chip in top bar shows
                               pending count (e.g. "3")
                                             │
                               Internet returns (online event)
                                             │
                                             ▼
                               Auto-sync: all pending records
                               POSTed to API, marked synced
```

**Master data is also cached.** Districts, blocks, TLC groups, and teachers are stored in IndexedDB the first time they load. If you open the attendance page without internet, the dropdowns are still populated from the local cache.

### Service Worker (Workbox)

`vite-plugin-pwa` generates a Workbox service worker at build time (`dist/sw.js`). It:

- **Precaches** all app assets (HTML, JS, CSS, images) so the app shell loads instantly without network.
- **NetworkFirst** strategy for all `/api/*` calls — tries the live API first (5 s timeout), falls back to a cached response if offline.
- **Registers automatically** via `dist/registerSW.js`.

### Sync context

`SyncContext` (in `src/context/SyncContext.tsx`) runs throughout the app:

- Listens to `window.addEventListener('online', ...)` — triggers immediate sync on reconnect.
- Polls every 15 seconds to refresh the pending badge count.
- Exposes `sync()` so pages can request a manual flush after saving.

### Files added

| File                               | Role                                                            |
| ---------------------------------- | --------------------------------------------------------------- |
| `src/db/localDb.ts`                | Dexie schema: `masterDataCache` and `pendingAttendance` tables  |
| `src/services/offlineApi.ts`       | Cache-first wrappers for districts, blocks, groups, teachers    |
| `src/services/syncService.ts`      | Flushes pending records to the API; marks synced/failed         |
| `src/context/SyncContext.tsx`      | React context: `pendingCount`, `sync()`, auto-sync on reconnect |
| `src/hooks/useOnlineStatus.ts`     | Reactive `navigator.onLine` hook                                |
| `src/components/OfflineBanner.tsx` | Yellow banner shown at top of page when offline                 |
| `src/components/SyncStatus.tsx`    | Amber chip in AppBar with pending count; tap to force sync      |
| `public/pwa-icon.svg`              | SVG app icon used in the PWA manifest                           |

---

## Deploying to Azure

You will need two Azure resources:

| Resource                              | Purpose                  | Free tier?             |
| ------------------------------------- | ------------------------ | ---------------------- |
| **Azure App Service** (Linux, .NET 8) | Hosts the backend API    | F1 free tier (limited) |
| **Azure Static Web Apps**             | Hosts the React frontend | Free tier available    |

HTTPS is **required** for service workers and the PWA install prompt. Both services provide HTTPS automatically.

---

### Backend — Azure App Service

#### Step 1 — Create the App Service

```bash
# Log in
az login

# Create a resource group (skip if you have one)
az group create --name tlc-rg --location eastus

# Create an App Service Plan (B1 is the smallest paid tier; F1 is free but limited)
az appservice plan create \
  --name tlc-api-plan \
  --resource-group tlc-rg \
  --sku B1 \
  --is-linux

# Create the Web App
az webapp create \
  --name tlc-api-app \
  --resource-group tlc-rg \
  --plan tlc-api-plan \
  --runtime "DOTNETCORE:8.0"
```

#### Step 2 — Configure application settings

```bash
az webapp config appsettings set \
  --name tlc-api-app \
  --resource-group tlc-rg \
  --settings \
    ASPNETCORE_ENVIRONMENT=Production \
    "ConnectionStrings__DefaultConnection=Data Source=/home/site/wwwroot/data/tlc_management.db" \
    AzureAd__TenantId="<your-tenant-id>" \
    AzureAd__ClientId="<your-client-id>" \
    "CorsOrigins__0=https://<your-static-web-app>.azurestaticapps.net"
```

> **SQLite note:** The path `/home/site/wwwroot/data/` is persistent on Linux App Service. Create the directory on first deploy or let the app create it automatically. For production workloads with more than a handful of concurrent users, consider migrating to Azure SQL or PostgreSQL.

#### Step 3 — Publish and deploy

```bash
cd backend

# Publish to a local folder
dotnet publish TLC.API -c Release -o ./publish

# Zip it
cd publish
zip -r ../api.zip .
cd ..

# Deploy
az webapp deploy \
  --name tlc-api-app \
  --resource-group tlc-rg \
  --src-path api.zip \
  --type zip
```

#### Step 4 — Enable HTTPS only

```bash
az webapp update \
  --name tlc-api-app \
  --resource-group tlc-rg \
  --https-only true
```

Your API is now live at:

```
https://tlc-api-app.azurewebsites.net
https://tlc-api-app.azurewebsites.net/swagger  (Development mode only)
```

---

### Frontend — Azure Static Web Apps

#### Step 1 — Set the production API URL

Create `frontend\tlc-app\.env.production`:

```env
VITE_API_BASE_URL=https://tlc-api-app.azurewebsites.net/api
```

> This variable is baked in at build time. You must rebuild after changing it.

#### Step 2 — Build the frontend

```bash
cd frontend\tlc-app
npm run build
```

This produces `dist\` containing:

- `index.html` — app shell
- `assets\` — JS, CSS bundles
- `sw.js` — Workbox service worker
- `manifest.webmanifest` — PWA manifest (name, icons, start URL)
- `staticwebapp.config.json` — SPA routing rules + MIME types

#### Step 3 — Create the Static Web App

```bash
# Install the SWA CLI (once)
npm install -g @azure/static-web-apps-cli

# Create the resource in Azure
az staticwebapp create \
  --name tlc-frontend \
  --resource-group tlc-rg \
  --location eastus2

# Get the deployment token
az staticwebapp secrets list \
  --name tlc-frontend \
  --resource-group tlc-rg \
  --query "properties.apiKey" -o tsv
```

#### Step 4 — Deploy

```bash
cd frontend\tlc-app

swa deploy ./dist \
  --deployment-token <token-from-step-3> \
  --env production
```

Your app is now live at:

```
https://tlc-frontend.azurestaticapps.net
```

---

### Post-deployment checklist

- [ ] Backend HTTPS URL responds at `/api/districts` (expect 200 or 401)
- [ ] CORS: frontend origin is listed in `CorsOrigins__0` app setting
- [ ] Frontend loads without console errors
- [ ] Swagger disabled in Production (`ASPNETCORE_ENVIRONMENT=Production`)
- [ ] SQLite database folder has write permissions
- [ ] "Add to Home Screen" install prompt appears in Chrome on Android
- [ ] Offline test: load the app, switch to airplane mode, open TLC Attendance, fill and submit — confirm "Saved locally" message appears

---

## Installing the App on Mobile

The TLC app is a **Progressive Web App**. There is nothing to download from an app store — users install it directly from the browser in two taps. The installed app has its own icon on the home screen, opens without browser chrome, and works offline.

> **Requirement:** The site must be served over **HTTPS**. The Azure Static Web Apps URL (`azurestaticapps.net`) satisfies this.

---

### Android (Chrome)

1. Open **Chrome** on your Android device.
2. Go to `https://<your-static-web-app>.azurestaticapps.net`
3. Log in with your role credentials.
4. Chrome shows a banner at the bottom of the screen:

   > **"Add TLC Management System to Home screen"** → tap **Add**

   If the banner does not appear automatically:
   - Tap the **three-dot menu** (top right) → **Add to Home screen** → **Add**

5. The TLC app icon appears on your home screen.
6. Tap the icon — the app opens in standalone mode (no browser address bar).

> **Android tip:** If you see "Install app" in the menu instead of a banner, that is the same action. Some Android versions word it differently.

---

### iPhone / iPad (Safari)

> The install prompt must be done from **Safari**. Chrome on iOS cannot install PWAs.

1. Open **Safari** on your iPhone or iPad.
2. Go to `https://<your-static-web-app>.azurestaticapps.net`
3. Log in with your role credentials.
4. Tap the **Share** button (the box with an arrow pointing up) at the bottom of the screen.
5. Scroll down in the Share sheet and tap **"Add to Home Screen"**.
6. Edit the name if desired (default: _TLC_), then tap **Add**.
7. The app icon appears on your home screen.
8. Tap it — the app opens in standalone mode (full screen, no Safari chrome).

---

## Using the Offline Attendance Tracker

This section is a guide for **TLC Managers** using the app in the field, where internet may be unavailable.

### Before going offline — prepare your device

1. Open the installed TLC app (tap the icon on your home screen).
2. Log in while you still have connectivity.
3. Navigate to **Attendance → TLC Attendance**.
4. The page loads district, block, TLC group, and teacher data and caches it locally.
5. You are now ready to work offline.

---

### Recording attendance offline

1. Switch your phone to **airplane mode** (or go somewhere without signal).
2. Open the TLC app from your home screen — it loads instantly from the device cache.
3. At the top of the page you will see a yellow banner:
   > **"You are offline — attendance will be saved locally and synced when reconnected."**
4. Fill in the TLC Details as normal — district, block, group, date, location, led by, topic.
5. Add attendees using the **Add Attendee** button. For teachers not in the list, choose **New** and type their name.
6. Tap **Submit Attendance**.
7. You will see a green message:
   > **"Saved locally — will sync automatically when online."**
8. The amber chip in the top bar shows how many records are waiting to sync (e.g., **☁ 1**).
9. Repeat for additional sessions — each submission adds to the pending queue.

---

### Syncing when back online

When you return to an area with connectivity:

1. The app detects the connection automatically (within a few seconds).
2. All pending records are uploaded to the server in the background.
3. The amber chip disappears and is replaced by a green checkmark (✔).
4. If a record fails to sync (server error), the chip stays amber and shows the count. You can tap it to retry manually.

You do **not** need to do anything — syncing is automatic. You can also tap the amber chip at any time to trigger an immediate sync attempt.

---

### What data is available offline

| Data                | Available offline? | Notes                                 |
| ------------------- | ------------------ | ------------------------------------- |
| Districts, Blocks   | Yes                | Cached on first load online           |
| TLC Groups          | Yes                | Cached on first load online           |
| Teachers list       | Yes                | Cached on first load online           |
| Submit attendance   | Yes                | Queued locally, synced later          |
| Dashboard / Reports | Partial            | Cached API responses (up to 24 h old) |
| Master data CRUD    | No                 | Write operations require connectivity |

---

## User Roles

| Role                 | Access                                                       |
| -------------------- | ------------------------------------------------------------ |
| `TLCManager`         | TLC attendance entry (offline-enabled), view reports         |
| `SustainabilityLead` | Masterclass attendance entry, user management, view reports  |
| `TechMETeam`         | All master data CRUD, bulk uploads, user management, reports |
| `CEO`                | View all dashboards and reports                              |

The login page (`/login`) shows a **development role picker**. In production, replace it with MSAL authentication (see [Azure AD Setup](#azure-ad-setup)).

---

## API Reference

Swagger UI is available at `http://localhost:5210/swagger` in Development mode.

| Group       | Endpoints                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Master Data | `GET/POST /api/districts`, `GET/POST /api/blocks`, `GET/POST /api/coaches`, `GET/POST /api/teachers`, `GET/POST /api/tlcgroups` |
| TLC Members | `GET /api/tlcgroups/{id}/members`                                                                                               |
| Attendance  | `POST /api/attendance/tlc`, `POST /api/attendance/masterclass`                                                                  |
| Bulk Upload | `POST /api/upload/coaches`, `/teachers`, `/tlcgroups`, `/teacherleaders`, `/tlcandmasterclass`                                  |
| Analytics   | `GET /api/analytics/dashboard`, `/yearend-summary`, `/longitudinal`, `/tlcgroup/{id}`                                           |
| Users       | `GET/POST /api/users`, `PATCH /api/users/{id}/activate`, `/deactivate`                                                          |

---

## Database Management

### Apply migrations

Migrations run automatically on startup. To apply manually:

```bash
cd backend
dotnet ef database update --project TLC.Infrastructure --startup-project TLC.API
```

### Add a migration (after model changes)

```bash
cd backend
dotnet ef migrations add <MigrationName> --project TLC.Infrastructure --startup-project TLC.API
```

### Roll back a migration

```bash
cd backend
dotnet ef database update <PreviousMigrationName> \
  --project TLC.Infrastructure --startup-project TLC.API
dotnet ef migrations remove \
  --project TLC.Infrastructure --startup-project TLC.API
```

### Back up the SQLite database

```bash
# Windows
copy backend\TLC.API\tlc_management.db backups\tlc_backup_%date:~-4,4%%date:~-7,2%%date:~0,2%.db

# Linux / Azure App Service (via SSH or Kudu)
cp /home/site/wwwroot/data/tlc_management.db /home/site/wwwroot/data/tlc_backup_$(date +%Y%m%d).db
```

---

## Azure AD Setup

1. Go to **Azure Portal → Azure Active Directory → App registrations → New registration**.
2. Note the **Application (client) ID** and **Directory (tenant) ID**.
3. Under **Expose an API**, add a scope (e.g. `TLC.Access`).
4. Under **Authentication**, add platform **Single-page application** with redirect URI:
   - Local: `http://localhost:5173`
   - Production: `https://<your-static-web-app>.azurestaticapps.net`
5. Update `appsettings.json`:
   ```json
   "AzureAd": {
     "Instance": "https://login.microsoftonline.com/",
     "TenantId": "<Directory (tenant) ID>",
     "ClientId": "<Application (client) ID>"
   }
   ```
6. In the frontend, replace the dev login page with MSAL:
   ```bash
   npm install @azure/msal-browser @azure/msal-react
   ```
   See the [MSAL React docs](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-react) for integration steps.

---

## Bulk Upload Excel Format

Row 1 is a header (skipped). All files must be `.xlsx`.

| Upload type       | Column order                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| Coaches           | DistrictId · BlockId · EmpNo · Name                                                              |
| Teachers          | Name · School · DistrictId · BlockId · Gender · Mobile · Email · IsTipTeacher (Y/N) · YearsInTip |
| TLC Groups        | DistrictId · BlockId · Location · DateFormed · GroupShortForm · TeacherLeaderId                  |
| Teacher Leaders   | TlcGroupId · TeacherId                                                                           |
| TLC & Masterclass | Type (TLC/Masterclass) · Status · TlcGroupId · DistrictId · BlockId · Topic                      |

---

## Troubleshooting

**The app doesn't install (no "Add to Home Screen" option)**
The PWA install prompt only appears when the site is served over HTTPS. Confirm the deployed URL starts with `https://`. Localhost is an exception — it works without HTTPS for development.

**The amber sync chip is stuck with pending records**
Tap the chip to retry. If it fails repeatedly:

1. Check the browser DevTools (Application → IndexedDB → tlc_offline_db → pendingAttendance) to see the `lastError` field.
2. Verify the API is reachable at `VITE_API_BASE_URL`.
3. If the record is corrupted, you can delete it from IndexedDB manually in DevTools.

**The app shows stale data after master data was updated**
The cache has no expiry by default. To force a refresh, go online and reload the attendance page — it fetches fresh data from the API and overwrites the cache.

**Offline banner doesn't disappear after reconnecting**
The `online`/`offline` events are fired by the browser. On some Android WebViews the event fires slightly delayed. Wait a few seconds or close and reopen the app.

**Backend won't start — "could not open database"**
The process needs write access to the folder containing `tlc_management.db`. On Azure App Service (Linux), use `/home/site/wwwroot/data/` and ensure the path is set in `ConnectionStrings__DefaultConnection`.

**CORS errors in browser**
Add the frontend origin (exact URL, no trailing slash) to `CorsOrigins` in `appsettings.json` or the App Service application settings (`CorsOrigins__0`), then restart the API.

**401 Unauthorized on every request**

- Verify `AzureAd:TenantId` and `AzureAd:ClientId` are correct.
- For local dev without Azure AD: comment out `app.UseAuthentication()` and `app.UseAuthorization()` in `Program.cs` temporarily.

**`VITE_API_BASE_URL` not taking effect in production**
`VITE_*` variables are baked in at build time. You must set the variable in `.env.production` and then run `npm run build` again before deploying.

**Frontend shows blank page after Azure SWA deployment**
Check that `staticwebapp.config.json` was included in the `dist/` folder. The file must exclude static assets from the SPA fallback rule so the service worker (`sw.js`, `workbox-*.js`) and manifest are served correctly.

**Service worker not updating after a new deploy**
`vite-plugin-pwa` is configured with `registerType: 'autoUpdate'`. On next page load, the new service worker installs and activates automatically. If users report seeing an old version, ask them to close all tabs of the app and reopen.
