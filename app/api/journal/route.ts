import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'

// ─── Notion-like Block Schema ────────────────────────────────────────────────
// Each block has a type (paragraph, heading1, heading2, heading3, bullet,
// numbered, toggle, code, quote, divider, callout) and its text payload.
const blockSchema = z.object({
  id: z.string(),
  type: z.enum([
    'paragraph',
    'heading1',
    'heading2',
    'heading3',
    'bullet',
    'numbered',
    'toggle',
    'code',
    'quote',
    'divider',
    'callout',
  ]),
  content: z.string().default(''),
  // Toggle blocks can have nested children
  children: z.array(z.lazy((): z.ZodTypeAny => blockSchema)).optional(),
  // Code block language hint
  language: z.string().optional(),
  // Callout icon (emoji)
  icon: z.string().optional(),
  // Whether toggle is expanded
  expanded: z.boolean().optional(),
})

const journalSchema = z.object({
  // Legacy plain-text content (kept for backwards compat)
  content: z.string().optional(),

  // ── Notion-like features ──────────────────────────────────────────────────

  // 1. RICH TEXT BLOCKS — structured block content (replaces raw content)
  blocks: z.array(blockSchema).optional(),

  // 2. COVER & ICON — per-entry visual identity
  icon: z.string().max(10).optional(),        // emoji e.g. "📝"
  coverColor: z.string().optional(),           // hex or tailwind token
  coverImageUrl: z.string().url().optional(),  // external image URL

  // 3. TITLE — separate from body content (Notion style)
  title: z.string().max(255).optional(),

  // 4. TAGS — multi-tag categorisation
  tags: z.array(z.string().max(40)).max(20).optional(),

  // 5. PINNED / FAVORITE — star/pin an entry
  pinned: z.boolean().optional(),

  // Existing field
  entryId: z.string().optional(),
})

type Block = z.infer<typeof blockSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract plain text from blocks (for AI analysis & word-count). */
function blocksToPlainText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      const base = b.content
      const kids = b.children ? blocksToPlainText(b.children) : ''
      return [base, kids].filter(Boolean).join(' ')
    })
    .join('\n')
}

/** Word count from plain text. */
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/** Reading time in minutes (avg 200 wpm). */
function readingTime(words: number): number {
  return Math.max(1, Math.ceil(words / 200))
}

// ─── AI ──────────────────────────────────────────────────────────────────────

const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')

async function generateEmotionalSummary(content: string): Promise<string> {
  try {
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const prompt = `Analyze this journal entry and provide a brief (2-3 sentences) emotional analysis. Identify the main emotions, themes, and suggest one healthy coping strategy if applicable. Keep it warm and supportive.

Journal entry: "${content}"`
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (error) {
    console.error('[journal] Emotional summary error:', error)
    return 'Reflection saved. Take a moment to sit with your feelings.'
  }
}

/** Auto-suggest tags from content using Gemini. */
async function suggestTags(content: string): Promise<string[]> {
  try {
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const prompt = `Given this journal entry, suggest 3-5 concise single-word or short-phrase tags (lowercase, no hashtags) that best categorise its themes. Return ONLY a JSON array of strings, nothing else.

Journal entry: "${content.slice(0, 800)}"`
    const result = await model.generateContent(prompt)
    const raw = result.response.text().trim()
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed: unknown = JSON.parse(cleaned)
    if (Array.isArray(parsed)) return (parsed as string[]).slice(0, 5)
    return []
  } catch {
    return []
  }
}

// ─── POST — create or update ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = journalSchema.parse(body)
    const {
      content,
      blocks,
      icon,
      coverColor,
      coverImageUrl,
      title,
      tags,
      pinned,
      entryId,
    } = parsed

    // Derive plain text for AI + metadata
    let plainText = content ?? ''
    if (blocks && blocks.length > 0) {
      plainText = blocksToPlainText(blocks)
    }

    if (plainText.length < 10) {
      return NextResponse.json(
        { error: 'Journal entry must be at least 10 characters' },
        { status: 400 }
      )
    }

    // ── Feature 5: Word count & reading time ─────────────────────────────────
    const words = wordCount(plainText)
    const readMins = readingTime(words)

    // ── AI emotional summary ─────────────────────────────────────────────────
    const emotionalSummary = await generateEmotionalSummary(plainText)

    // ── Feature 4: Auto-suggest tags if none provided ────────────────────────
    let resolvedTags = tags
    if (!resolvedTags || resolvedTags.length === 0) {
      resolvedTags = await suggestTags(plainText)
    }

    // Serialise blocks to JSON string for storage
    const blocksJson = blocks ? JSON.stringify(blocks) : undefined

    const data = {
      // Legacy plain content (kept for search / fallback)
      content: plainText,
      emotionalSummary,

      // Notion-like fields (add these columns to your Prisma schema — see below)
      ...(blocksJson !== undefined && { blocks: blocksJson }),
      ...(title !== undefined && { title }),
      ...(icon !== undefined && { icon }),
      ...(coverColor !== undefined && { coverColor }),
      ...(coverImageUrl !== undefined && { coverImageUrl }),
      ...(resolvedTags !== undefined && { tags: JSON.stringify(resolvedTags) }),
      ...(pinned !== undefined && { pinned }),
      wordCount: words,
      readingTime: readMins,
      updatedAt: new Date(),
    }

    let entry

    if (entryId) {
      // Verify ownership before update
      const existing = await prisma.journalEntry.findFirst({
        where: { id: entryId, userId: session.user.id },
      })
      if (!existing) {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
      }

      entry = await prisma.journalEntry.update({
        where: { id: entryId },
        data,
      })
    } else {
      entry = await prisma.journalEntry.create({
        data: { userId: session.user.id, ...data },
      })
    }

    return NextResponse.json(deserialiseEntry(entry))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('[journal] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to save journal entry' },
      { status: 500 }
    )
  }
}

// ─── GET — list or single ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const entryId = searchParams.get('entryId')
    const tag = searchParams.get('tag')           // Feature 4: filter by tag
    const pinnedOnly = searchParams.get('pinned') // Feature 3: filter pinned

    if (entryId) {
      const entry = await prisma.journalEntry.findFirst({
        where: { id: entryId, userId: session.user.id },
      })
      if (!entry) {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
      }
      return NextResponse.json(deserialiseEntry(entry))
    }

    // Build dynamic where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: session.user.id }

    if (pinnedOnly === 'true') {
      where.pinned = true
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      orderBy: [
        { pinned: 'desc' },      // Feature 3: pinned entries float to top
        { createdAt: 'desc' },
      ],
      take: 50,
    })

    let result = entries.map(deserialiseEntry)

    // Feature 4: in-memory tag filter (move to DB if using a relation table)
    if (tag) {
      result = result.filter((e) =>
        Array.isArray(e.tags) && e.tags.includes(tag)
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[journal] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch journal entries' },
      { status: 500 }
    )
  }
}

// ─── PATCH — toggle pin / update single field ─────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { entryId, pinned, icon, coverColor, tags } = body as {
      entryId: string
      pinned?: boolean
      icon?: string
      coverColor?: string
      tags?: string[]
    }

    if (!entryId) {
      return NextResponse.json({ error: 'entryId required' }, { status: 400 })
    }

    const existing = await prisma.journalEntry.findFirst({
      where: { id: entryId, userId: session.user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = { updatedAt: new Date() }
    if (pinned !== undefined) data.pinned = pinned
    if (icon !== undefined) data.icon = icon
    if (coverColor !== undefined) data.coverColor = coverColor
    if (tags !== undefined) data.tags = JSON.stringify(tags)

    const entry = await prisma.journalEntry.update({
      where: { id: entryId },
      data,
    })

    return NextResponse.json(deserialiseEntry(entry))
  } catch (error) {
    console.error('[journal] PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update entry' },
      { status: 500 }
    )
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const entryId = searchParams.get('entryId')

    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 })
    }

    const entry = await prisma.journalEntry.findFirst({
      where: { id: entryId, userId: session.user.id },
    })
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    await prisma.journalEntry.delete({ where: { id: entryId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[journal] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete entry' },
      { status: 500 }
    )
  }
}

// ─── Deserialise stored JSON strings back to JS values ────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserialiseEntry(entry: any) {
  return {
    ...entry,
    blocks: entry.blocks ? JSON.parse(entry.blocks as string) : null,
    tags: entry.tags ? JSON.parse(entry.tags as string) : [],
  }
}