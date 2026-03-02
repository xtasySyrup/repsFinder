import { NextRequest, NextResponse } from 'next/server'
import type { SearchResult } from '../search/route'

interface QCItem {
  itemID: string
  qcUrl: string
}

/**
 * Extracts Weidian itemIDs from any text.
 * Matches patterns like:
 *   itemID=1234567890
 *   itemID%3D1234567890   (URL-encoded)
 */
function extractWeidianIDs(text: string): string[] {
  const ids: string[] = []
  // Match both plain and percent-encoded `=`
  const regex = /itemID(?:=|%3D)(\d{6,12})/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    ids.push(match[1])
  }
  return ids
}

export async function POST(req: NextRequest) {
  try {
    const { results } = (await req.json()) as { results: SearchResult[] }

    if (!Array.isArray(results)) {
      return NextResponse.json({ error: 'Invalid results' }, { status: 400 })
    }

    const seen = new Set<string>()
    const items: QCItem[] = []

    for (const result of results) {
      // Combine all text sources for a thorough scan
      const combined = [result.url, result.snippet, result.title].join(' ')
      const ids = extractWeidianIDs(combined)

      for (const id of ids) {
        if (!seen.has(id)) {
          seen.add(id)
          items.push({
            itemID: id,
            qcUrl: `https://finderqc.com/product/Weidian/${id}`,
          })
        }
      }
    }

    return NextResponse.json({ items })
  } catch (err) {
    console.error('[qc]', err)
    return NextResponse.json({ error: 'QC extraction failed' }, { status: 500 })
  }
}
