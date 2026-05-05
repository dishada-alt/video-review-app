# Video Review App

A beginner-friendly React + Vite app for reviewing videos from a CSV file.

The CSV must include a required `video_url` column. Any other columns (for example `score`, `views`, `category`, `notes`) are shown as metadata under each video.

## Features

- Paste a public Google Sheets CSV URL.
- Fetch and parse CSV data in the browser (no backend).
- Render each row as a card with an HTML `<video>` player.
- Show only selected ad-performance columns using an info toggle button.
- Global controls: **Play All**, **Pause All**, **Reset All**.
- Videos are muted by default to allow simultaneous playback.
- Text search filter across selected columns.
- Numeric sorting with ascending/descending order.
- Graceful handling of missing video URLs and "-" values.
- Responsive card layout with configurable batch loading (default 10).

## 1) Install dependencies

```bash
npm install
```

## 2) Run locally

```bash
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`).

## 3) Use a Google Sheets CSV URL

1. In Google Sheets, open the sheet you want to use.
2. Publish/share it so it is publicly readable.
3. Use a CSV export URL, such as:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/gviz/tq?tqx=out:csv
```

4. Paste the URL into the app and click **Load CSV**.

### CSV format example

```csv
video_url,score,views,category,notes
https://example.com/video1.mp4,8.4,1250,Tutorial,Strong intro
https://example.com/video2.mp4,6.9,542,Review,Needs better audio
```

## 4) Build for production

```bash
npm run build
```

Preview production build locally:

```bash
npm run preview
```

## 5) Deploy to Vercel or Netlify

Because this is a static Vite app, deployment is straightforward.

### Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Vercel, import the project.
3. Use build command: `npm run build`
4. Use output directory: `dist`
5. Deploy.

### Netlify

1. Push this repo to your Git provider.
2. In Netlify, add a new project from your repo.
3. Use build command: `npm run build`
4. Use publish directory: `dist`
5. Deploy.

## Notes

- If your CSV cannot be fetched, check that the sheet is public and the URL points to CSV output.
- Some hosts may block video playback or cross-origin requests for certain MP4 URLs.
