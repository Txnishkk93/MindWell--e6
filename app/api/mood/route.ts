import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const moodSchema = z.object({
  mood: z.number().min(1).max(4, 'Mood must be between 1 and 4'),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mood, notes } = moodSchema.parse(body)

    // Check if mood entry already exists for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existingEntry = await prisma.moodEntry.findFirst({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: today,
        },
      },
    })

    let moodEntry

    if (existingEntry) {
      moodEntry = await prisma.moodEntry.update({
        where: { id: existingEntry.id },
        data: { mood, notes },
      })
    } else {
      moodEntry = await prisma.moodEntry.create({
        data: {
          userId: session.user.id,
          mood,
          notes: notes || null,
        },
      })
    }

    return NextResponse.json(moodEntry)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('[v0] Mood API error:', error)
    return NextResponse.json(
      { error: 'Failed to save mood' },
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
    const days = parseInt(searchParams.get('days') || '7')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const moodEntries = await prisma.moodEntry.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const moodLabels = ['😢', '😕', '😊', '😄']

    const chartData = []
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (days - 1 - i))
      date.setHours(0, 0, 0, 0)

      const entry = moodEntries.find((m) => {
        const mDate = new Date(m.createdAt)
        mDate.setHours(0, 0, 0, 0)
        return mDate.getTime() === date.getTime()
      })

      chartData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        mood: entry?.mood || null,
        label: entry ? moodLabels[entry.mood - 1] : '—',
      })
    }

    return NextResponse.json({ entries: moodEntries, chartData })
  } catch (error) {
    console.error('[v0] Mood GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch mood data' },
      { status: 500 }
    )
  }
}
