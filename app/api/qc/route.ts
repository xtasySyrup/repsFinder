import { NextRequest, NextResponse } from 'next/server'
import type { SearchResult } from '../search/route'

interface QCItem {
  itemID: string
  qcUrl: string
  imageUrl?: string
  sources: Array<{ title: string; url: string }>
}

function extractWeidianIDs(text: string): string[] {
  const ids: string[] = []
  const regex = /itemID(?:=|%3D)(\d{6,12})/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    ids.push(match[1])
  }
  return ids
}

async function fetchWeidianImage(itemID: string): Promise<string | undefined> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)
  try {
    const res = await fetch(`https://weidian.com/item.html?itemID=${itemID}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RepsFinder/1.0)' },
    })
    if (!res.ok) return undefined
    const html = await res.text()
    // First try the product image (class="item-img"), both src attribute orders
    const m =
      html.match(/<img[^>]+class=["'][^"']*item-img[^"']*["'][^>]+src=["']([^"']+)["']/i) ??
      html.match(/<img[^>]+src=["']([^"']+)["'][^>]+class=["'][^"']*item-img[^"']*["']/i)
    return m?.[1] ?? undefined
  } catch {
    return undefined
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { results } = (await req.json()) as { results: SearchResult[] }

    if (!Array.isArray(results)) {
      return NextResponse.json({ error: 'Invalid results' }, { status: 400 })
    }

    const seen = new Set<string>()
    // Map itemID → sources list (collect all posts that mention the same ID)
    const sourceMap = new Map<string, Array<{ title: string; url: string }>>()

    for (const result of results) {
      const combined = [result.url, result.snippet, result.title].join(' ')
      const ids = extractWeidianIDs(combined)

      for (const id of ids) {
        if (!sourceMap.has(id)) sourceMap.set(id, [])
        const sources = sourceMap.get(id)!
        // Avoid duplicate sources for the same itemID
        if (!sources.some((s) => s.url === result.url)) {
          sources.push({ title: result.title || result.url, url: result.url })
        }
        seen.add(id)
      }
    }

    // Build items list (preserve insertion order)
    const itemIDs = [...seen]
    // Cap at 9 to keep image fetches fast
    const capped = itemIDs.slice(0, 9)

    // Fetch product images in parallel
    const images = await Promise.all(capped.map((id) => fetchWeidianImage(id)))

    const items: QCItem[] = capped.map((id, i) => ({
      itemID: id,
      qcUrl: `https://finderqc.com/product/Weidian/${id}`,
      imageUrl: images[i],
      sources: sourceMap.get(id) ?? [],
    }))

    return NextResponse.json({ items })
  } catch (err) {
    console.error('[qc]', err)
    return NextResponse.json({ error: 'QC extraction failed' }, { status: 500 })
  }
}
