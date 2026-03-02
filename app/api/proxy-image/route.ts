import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_HOSTS = ['si.geilicdn.com', 'img.weidian.com', 'gw.alicdn.com']

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')

  if (!url) {
    return new NextResponse('Missing url param', { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return new NextResponse('Invalid url', { status: 400 })
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return new NextResponse('Host not allowed', { status: 403 })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Referer: 'https://weidian.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return new NextResponse('Image fetch failed', { status: 502 })
    }

    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new NextResponse('Image fetch failed', { status: 502 })
  }
}
