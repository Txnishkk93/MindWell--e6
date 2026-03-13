import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'

const journalSchema = z.object({
  content: z.string().min(10, 'Journal entry must be at least 10 characters'),
  entryId: z.string().optional(),
})

const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')

async function generateEmotionalSummary(content: string): Promise<string> {
  try {
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `Analyze this journal entry and provide a brief (2-3 sentences) emotional analysis. Identify the main emotions, themes, and suggest one healthy coping strategy if applicable. Keep it warm and supportive.

Journal entry: "${content}"`

    const result = await model.generateContent(prompt)
    const response = result.response.text()
    return response
  } catch (error) {
    console.error('[v0] Emotional summary error:', error)
    return 'Reflection saved. Take a moment to sit with your feelings.'
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content, entryId } = journalSchema.parse(body)

    const emotionalSummary = await generateEmotionalSummary(content)

    let entry

    if (entryId) {
      entry = await prisma.journalEntry.update({
        where: { id: entryId },
        data: { content, emotionalSummary, updatedAt: new Date() },
      })
    } else {
      entry = await prisma.journalEntry.create({
        data: {
          userId: session.user.id,
          content,
          emotionalSummary,
        },
      })
    }

    return NextResponse.json(entry)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('[v0] Journal API error:', error)
    return NextResponse.json(
      { error: 'Failed to save journal entry' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const entryId = searchParams.get('entryId')

    if (entryId) {
      const entry = await prisma.journalEntry.findFirst({
        where: {
          id: entryId,
          userId: session.user.id,
        },
      })

      if (!entry) {
        return NextResponse.json(
          { error: 'Entry not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(entry)
    }

    const entries = await prisma.journalEntry.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error('[v0] Journal GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch journal entries' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const entryId = searchParams.get('entryId')

    if (!entryId) {
      return NextResponse.json(
        { error: 'Entry ID required' },
        { status: 400 }
      )
    }

    const entry = await prisma.journalEntry.findFirst({
      where: {
        id: entryId,
        userId: session.user.id,
      },
    })

    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      )
    }

    await prisma.journalEntry.delete({
      where: { id: entryId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Journal DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete entry' },
      { status: 500 }
    )
  }
}
