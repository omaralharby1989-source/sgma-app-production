# SGMA APP — Google Play Graphics

## Required image sizes

| Asset | Size | Format | Status |
|---|---|---|---|
| Feature graphic | 1024 × 500 px | PNG | ✅ Ready |
| App icon (listing) | 512 × 512 px | PNG | ✅ Use `artifacts/sgma-app2/public/sgma-app-icon.png` |
| Phone screenshots (≥ 2, up to 8) | ≥ 320 px wide | PNG/JPG | ✅ 6 captured — see `screenshots/` |

## Files in this folder

| File | Dimensions | Status |
|---|---|---|
| `feature-graphic-1024x500.png` | 1024 × 500 px | ✅ Ready for upload |

## Feature graphic design

- SGMA brand blue gradient background (`#0a2e5e` → `#2a7de8`)
- SGMA logo (from `artifacts/sgma-app2/public/sgma-app-icon.png`)
- Arabic headline: **تطبيق سِجما**
- Arabic tagline: منصة رقمية للتواصل والخدمات والمحتوى الطبي
- Domain watermark: `sgma-app.org`
- No fake store badges, no patient images, no private data

## Notes

- The feature graphic is generated at exactly 1024 × 500 px (Google Play requirement).
- If you want to regenerate it, run the puppeteer script documented in the project.
- The app icon for the Play listing (512 × 512 PNG) already exists at
  `artifacts/sgma-app2/public/sgma-app-icon.png` — upload it directly.
