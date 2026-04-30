# PDF Downloads

Drop blog-post PDF files here, named exactly after the post slug.

Examples:
- `best-hotels-seville-2026.pdf` → served at `https://jetmeaway.co.uk/downloads/best-hotels-seville-2026.pdf`
- `best-hotels-milan-2026.pdf` → served at `https://jetmeaway.co.uk/downloads/best-hotels-milan-2026.pdf`

The `<DownloadPdfCard slug="..." />` component in MDX assumes this naming convention.

The lead-magnet email (sent by `/api/pdf-download`) links directly to `/downloads/${slug}.pdf` — so the file MUST exist at that path before the card goes live, otherwise users get a 404 after submitting their email.

## Workflow

1. Generate / receive the PDF
2. Save it as `${slug}.pdf` in this folder
3. Commit and push — Vercel CDN serves it from production within ~2 min
