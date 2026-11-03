# Bnaa — Flat Finishing Estimator

Estimate the cost, materials and time needed to finish a flat, track the actual results, and use the difference to sharpen future estimates.

Bnaa is a static web app: no server, no database, no account. It works on desktop and phones, in English and Arabic, and offline once installed.

## Features

- **Materials library**: each material has a category, a unit (m, m², m³, piece, …), a material price, a worker price and the days needed per unit. Prices and days are `from – to` ranges; an empty `to` equals `from`.
- **Finishing steps**: reusable steps (plumbing, electric, plaster, paint, …) with the material categories they use, in their usual order. A step can be marked to start together with the previous one.
- **Categories**: separate room and material category lists, prefilled and fully editable.
- **Flats**:
  - **Rooms** with length, width and height (3 m by default) and a room category.
  - **Steps** that apply to every room or to selected rooms, each with its own materials and the steps it must wait for.
  - **Estimate** of material cost, worker cost, total cost and duration, broken down by step and by material, with a timeline chart.
- **Actual results**: record the start and end dates and actual costs, optionally per step. Setting the end date moves the flat to *Finished* and shows the estimate next to the actual results, so you can adjust prices and times.
- **Reports**: select several flats (in progress or finished) to compare materials, workers and time per flat, with shared totals. Save the report as a PDF.
- **Your data**: everything is saved in the browser. Export it to a JSON file to back it up or move it to another device, and import it again later.

## How the estimate works

- Each material has a **quantity basis**: floor area, wall area, ceiling area, perimeter, volume, a fixed amount per room, or a manual quantity. That basis is multiplied by a **factor**. For example, wall area × 1.0 for paint, floor area × 1.1 for tiles with 10 % waste, or 6 points per bathroom.
- A material can be limited to certain room categories, such as wall ceramic only in bathrooms and kitchens. Any room's quantity can be overridden inside a flat.
- Cost and days are `quantity × price` and `quantity × days per unit`, always shown as a min – max range.
- Within one step the work is done one item after another. A step starts once every step it waits for has finished, and steps that don't wait for each other overlap. The flat's duration is therefore its longest chain of steps.

## Getting started

Requires Node.js 18+.

```sh
npm install
npm run dev        # development server at http://localhost:5173
npm test           # unit tests for the estimation engine
npm run build      # production build in dist/
npm run preview    # serve the production build locally
```

### Deploying

Upload the contents of `dist/` to any static host (GitHub Pages, Netlify, Cloudflare Pages, …). It works from a sub-path. The host must serve it over HTTPS for offline mode to work.

### Offline and installing

- The production build includes a service worker that caches the whole app, so after the first visit the app opens without internet.
- To install it, use the browser's install option or **Settings → Install app**. On iPhone, use **Share → Add to Home Screen**.
- When a new version is deployed, open copies of the app show an **Update now** banner.
- Offline mode is switched off in `npm run dev`. To try it locally, run `npm run build && npm run preview`.

### PDF reports

**Download PDF** opens the browser's print dialog; choose **Save as PDF**. Printing through the browser keeps Arabic text rendered correctly.

## Data and backups

Data is stored in the browser's `localStorage` under the key `bnaa:data:v1`. It stays on that device and in that browser, and clearing site data deletes it. Use **Settings → Export data** regularly to keep a backup.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/estimate.ts` | Estimation engine: quantities, costs, step scheduling (tested in `estimate.test.ts`) |
| `src/store.tsx` | App state, local storage, import validation, number and date formatting |
| `src/i18n.ts` | English and Arabic text (right-to-left layout is applied automatically) |
| `src/defaults.ts` | Built-in categories, sample materials and steps |
| `src/flatOps.ts` | Creating flats and steps, duplicating flats |
| `src/pages/`, `src/components/` | User interface |
| `src/pwa.ts` | Service worker registration, update banner, install prompt |
| `sw.template.js` | Service worker source; the build fills in the cached file list (see `vite.config.ts`) |
| `scripts/gen-icons.mjs` | Generates the app icons in `public/icons/` (`node scripts/gen-icons.mjs`) |
