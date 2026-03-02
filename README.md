# RepsFinder

> Upload a photo of any clothing item → AI identifies it → instantly find community QC photos from Weidian sellers.

## How it works

```
📸 Upload photo
      ↓
🤖 Claude Vision identifies the item  (e.g. "Nike Air Force 1 Low White")
      ↓
✏️  Confirm (or edit) the item name
      ↓
🔍 Search Reddit + Google for community spreadsheets
      ↓
🧵 Extract Weidian itemIDs via regex
      ↓
🖼️  Display QC photo links → finderqc.com/product/Weidian/{itemID}
```

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS 3 |
| AI Vision | Anthropic `claude-opus-4-6` |
| Search | Reddit JSON API + Google Custom Search |
| QC photos | [finderqc.com](https://finderqc.com) |

## Getting started

### 1. Clone & install

```bash
git clone https://github.com/xtasySyrup/repsFinder.git
cd repsFinder
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...          # Required — get at console.anthropic.com
GOOGLE_API_KEY=AIza...                # Optional — broadens results
GOOGLE_CX=...                         # Optional — your Google Custom Search engine ID
```

> **Reddit** is queried anonymously via the public JSON API — no credentials needed.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API routes

| Route | Method | Description |
|---|---|---|
| `/api/identify` | `POST` | Sends base64 image to Claude vision, returns `{ itemName }` |
| `/api/search` | `POST` | Queries Reddit + Google CSE for `"{item} weidian spreadsheet"`, returns raw results |
| `/api/qc` | `POST` | Runs Weidian itemID regex over all results, returns `{ items[] }` with finderqc URLs |

## Weidian itemID extraction

All three text sources (URL, title, snippet) from every search result are scanned with:

```ts
/itemID(?:=|%3D)(\d{6,12})/gi
```

This catches both plain and URL-encoded forms of `itemID=1234567890`.

Each found ID maps to:
- **QC photos** → `https://finderqc.com/product/Weidian/{itemID}`
- **Seller listing** → `https://weidian.com/item.html?itemID={itemID}`

## Project structure

```
repsFinder/
├── app/
│   ├── api/
│   │   ├── identify/route.ts   ← Anthropic vision
│   │   ├── search/route.ts     ← Reddit + Google CSE
│   │   └── qc/route.ts         ← Weidian regex + finderqc formatter
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                ← Full client UI
├── .env.local.example
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## Setting up Google Custom Search (optional)

1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Create a new engine — set it to search the entire web
3. Copy the **Search engine ID** → `GOOGLE_CX`
4. Get an API key from [Google Cloud Console](https://console.cloud.google.com/) → `GOOGLE_API_KEY`

Without Google CSE the app still works; Reddit alone surfaces most community spreadsheets.

## License

MIT
