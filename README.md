# ALON-PH — Catalog & Inquiry Site

An [Astro](https://astro.build) static site whose catalog is read from **Google Sheets at build time**, letting visitors browse products, build an inquiry list, and submit it **by email** for a quotation.

```
Google Sheet (Categories / Products / Variants)
        │  fetched at BUILD time via Google Sheets API v4 (key stays server-side)
        ▼
Astro build  ──►  static HTML  ──►  catalog + inquiry list  ──►  email (mailto)
```

Because the sheet is read during the build, **your API key never reaches the browser** — visitors only get the finished catalog HTML.

## Project layout

| Path | Purpose |
|---|---|
| `src/pages/index.astro` | The page — renders the catalog + the inquiry-list island |
| `src/lib/catalog.js` | Fetches & joins the 3 sheet tabs at build time; falls back to sample data |
| `src/layouts/Base.astro` | Layout + global styles |
| `.env.example` | Environment template (copy to `.env`) |
| `.env` | Your real values — **git-ignored**, never committed |
| `.github/workflows/deploy.yml` | Build-from-Sheets + deploy to GitHub Pages |
| `astro.config.mjs` | Astro config |
| `docs/` | Project description, sheet schema, and catalog data |

## Quick start

```bash
npm install
npm run dev          # http://localhost:4321
```

With no `.env`, the site runs on **sample data** so you can see the UI right away. Add your `.env` (below) to load the real sheet.

Scripts:
- `npm run dev` — dev server with live reload
- `npm run build` — production build into `dist/` (fetches the sheet)
- `npm run preview` — serve the built `dist/` locally

## One-time Google setup

1. **Share the sheet:** open it → **Share → General access → "Anyone with the link" → Viewer.**
   (An API key can only read link-shared sheets.)
2. **Enable the API:** [Google Cloud Console](https://console.cloud.google.com/) → create/select a project → **APIs & Services → Library →** search **Google Sheets API → Enable.**
3. **Create the key:** **APIs & Services → Credentials → Create credentials → API key.**
   Recommended — restrict it:
   - **API restrictions:** limit to **Google Sheets API** only.
   - (For a purely build-time key, application restrictions aren't required since it's never exposed in the browser.)

## Configure locally

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | What it is |
|---|---|
| `SHEET_ID` | The id in the sheet URL: `.../spreadsheets/d/<SHEET_ID>/edit` (already prefilled) |
| `SHEET_API_KEY` | The API key from the step above |
| `INQUIRY_EMAIL` | Where inquiry lists are sent (primary channel) |
| `TAB_CATEGORIES` / `TAB_PRODUCTS` / `TAB_VARIANTS` | Tab names — only change if yours differ |

Then `npm run dev` — the real catalog loads on refresh.

## Deploy to GitHub Pages (easy .env → Secrets)

The same variable names work in CI, so there's no separate config to maintain.

1. **Add secrets:** Repo → **Settings → Secrets and variables → Actions → New repository secret.** Add (same names as `.env`):
   - `SHEET_ID`
   - `SHEET_API_KEY`
   - `INQUIRY_EMAIL`
   - *(optional)* `TAB_CATEGORIES`, `TAB_PRODUCTS`, `TAB_VARIANTS`
2. **Enable Pages:** Repo → **Settings → Pages → Build and deployment → Source: "GitHub Actions".**
3. **Push to `main`.** The workflow builds from your sheet and deploys.

Updating content:
- **Edit the sheet**, then either push a commit, click **Actions → Deploy → "Run workflow"**, or wait for the **hourly scheduled rebuild** (configured in `deploy.yml`).

> Deploying a **project site** (`https://<user>.github.io/<repo>`)? Uncomment and set `site` and `base` in `astro.config.mjs`.

## How the sheet maps to the UI

- **Categories** → filter chips (`active`, `sort_order` respected).
- **Products** → cards. `main_image` is required and is the fallback for variants.
- **Variants** → the option dropdown on each card. `attributes` like `price=105; moq=100` are parsed; `price` shows in the dropdown and the inquiry email.
- Blank `variant_image` → falls back to the product's `main_image`.
- Google Drive share links are auto-converted to viewable image URLs.
- A row is shown unless its `active` column is explicitly `FALSE` (blank trailing cells from the Sheets API still count as active).

## Inquiry flow

- **Email is the primary channel.** "Send inquiry by email" opens the visitor's mail app prefilled with their list; Messenger/phone are follow-ups.
- The inquiry list persists in `localStorage` — no account needed.
- Prices are starting references only; final pricing is sent in the quotation.

## Notes

- `.env` and `dist/` are git-ignored.
- See `docs/sheets-schema.md` for the exact sheet columns and `docs/products/` for the catalog data.
