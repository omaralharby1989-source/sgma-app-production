# SGMA APP — Google Play Phone Screenshots

Google Play requires at least 2 phone screenshots. Up to 8 are allowed.
Orientation: **portrait**. Recommended device frame: Pixel 7 or similar.

## Screenshot status

| File | Page | Dimensions | Status |
|---|---|---|---|
| `01-login.png` | `/login` — Login screen | 780 × 1688 px | ✅ Ready |
| `02-home.png` | `/home` — Member home | 780 × 1688 px | ✅ Ready |
| `03-news.png` | `/news` — News listing | 780 × 1688 px | ✅ Ready |
| `04-articles.png` | `/articles` — Articles listing | 780 × 1688 px | ✅ Ready |
| `05-board.png` | `/board/current` — Board of Directors | 780 × 1688 px | ✅ Ready |
| `06-more.png` | `/more` — More / links page | 780 × 1688 px | ✅ Ready |
| `01-login.jpg` | Legacy sample — login | — | ⚠️ Superseded by 01-login.png |
| `02-register.jpg` | Legacy sample — register | — | ⚠️ Optional: retake from device |

Screenshots were captured automatically from the live dev server using the `playreviewer`
demo MEMBER account, at viewport 390 × 844 px with 2× device pixel ratio (effective 780 × 1688 px).
No real member private data, no admin screens, no sensitive content.

## Optional additional screenshots (manual capture from real device)

| Suggested file | URL | Notes |
|---|---|---|
| `07-news-detail.png` | `/news/:id` | Open any published article |
| `08-articles-detail.png` | `/articles/:id` | Open any approved article |
| `09-member-profile.png` | `/member/profile` | Own profile — no other member data visible |
| `10-about-sgma.png` | `/about-sgma` | Public informational page |

## Rules for all screenshots

- Portrait orientation only
- No admin / super-admin / moderator screens
- No real member private data, passwords, or IDs
- No database / internal management pages
- Use the demo reviewer account (`playreviewer`) or safe public pages only
- Minimum resolution: 320 px wide (ideal: 1080 × 1920 or 1080 × 2340)

For the final Play Store upload, re-capture from a real Android device or emulator
running the signed release APK for the most polished presentation.
