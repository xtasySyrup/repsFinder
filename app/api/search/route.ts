import { NextRequest, NextResponse } from 'next/server'

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 })
    }

    const results: SearchResult[] = []
    let redditCount = 0
    let googleCount = 0
    let googleError: string | null = null

    // ── Reddit JSON API ──────────────────────────────────────────────────────
    try {
      const q = encodeURIComponent(`${query} weidian spreadsheet`)
      const redditUrl = `https://www.reddit.com/search.json?q=${q}&sort=relevance&limit=25&t=all`

      const redditRes = await fetch(redditUrl, {
        headers: { 'User-Agent': 'RepsFinder/1.0 (community tool)' },
        next: { revalidate: 0 },
      })

      if (redditRes.ok) {
        const data = await redditRes.json()
        const posts: unknown[] = data?.data?.children ?? []

        for (const child of posts) {
          const post = (child as { data: Record<string, string> }).data
          results.push({
            title: post.title ?? '',
            url: post.url ?? `https://reddit.com${post.permalink ?? ''}`,
            snippet: (post.selftext ?? '').slice(0, 1000),
          })
        }
        redditCount = posts.length
      } else {
        console.warn('[search] Reddit non-ok:', redditRes.status)
      }
    } catch (e) {
      console.warn('[search] Reddit error:', e)
    }

    // ── Google Custom Search ─────────────────────────────────────────────────
    const googleKey = process.env.GOOGLE_API_KEY
    const googleCx = process.env.GOOGLE_CX

    if (googleKey && googleCx) {
      try {
        const q = encodeURIComponent(`${query} weidian`)
        const googleUrl =
          `https://www.googleapis.com/customsearch/v1?key=${googleKey}&cx=${googleCx}&q=${q}&num=10`

        const googleRes = await fetch(googleUrl, { next: { revalidate: 0 } })
        const data = await googleRes.json()

        if (googleRes.ok) {
          const items: unknown[] = data?.items ?? []
          for (const item of items) {
            const i = item as Record<string, string>
            results.push({
              title: i.title ?? '',
              url: i.link ?? '',
              snippet: i.snippet ?? '',
            })
          }
          googleCount = items.length
        } else {
          // Surface the actual error message from Google
          googleError = data?.error?.message ?? `HTTP ${googleRes.status}`
          console.warn('[search] Google error:', googleError)
        }
      } catch (e) {
        googleError = e instanceof Error ? e.message : 'Unknown error'
        console.warn('[search] Google fetch error:', e)
      }
    } else {
      googleError = 'Keys not configured (GOOGLE_API_KEY / GOOGLE_CX missing)'
    }

    return NextResponse.json({ results, meta: { redditCount, googleCount, googleError } })
  } catch (err) {
    console.error('[search]', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
