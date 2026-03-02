import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { image, mediaType } = await req.json()

    if (!image || !mediaType) {
      return NextResponse.json({ error: 'Missing image or mediaType' }, { status: 400 })
    }

    const validMediaTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
    if (!validMediaTypes.includes(mediaType)) {
      return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 128,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as (typeof validMediaTypes)[number],
                data: image,
              },
            },
            {
              type: 'text',
              text: 'Identify this clothing/footwear item. Reply with ONLY the item name in a short, searchable format suitable for finding replica product listings (e.g. "Nike Air Force 1 Low White", "Supreme Box Logo Hoodie Red", "Louis Vuitton Monogram Canvas Tote"). No punctuation, no explanation — just the item name.',
            },
          ],
        },
      ],
    })

    const block = response.content[0]
    if (block.type !== 'text' || !block.text.trim()) {
      return NextResponse.json({ error: 'Could not identify item' }, { status: 422 })
    }

    return NextResponse.json({ itemName: block.text.trim() })
  } catch (err) {
    console.error('[identify]', err)
    return NextResponse.json({ error: 'Failed to identify item' }, { status: 500 })
  }
}
