import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'

const surveySchema = z.object({
  emotionalExhaustion: z.number().min(0).max(6),
  depersonalization: z.number().min(0).max(6),
  personalAccomplishment: z.number().min(0).max(6),
})

const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')

function calculateBurnoutScore(
  emotionalExhaustion: number,
  depersonalization: number,
  personalAccomplishment: number
): {
  score: number
  level: string
  interpretation: string
} {
  const score = emotionalExhaustion + depersonalization + (6 - personalAccomplishment)

  if (score <= 8) {
    return {
      score,
      level: 'Low',
      interpretation: 'You appear to be managing well with good resilience',
    }
  } else if (score <= 16) {
    return {
      score,
      level: 'Moderate',
      interpretation: 'You may be experiencing some stress; consider taking action',
    }
  } else if (score <= 24) {
    return {
      score,
      level: 'High',
      interpretation:
        'You show signs of significant burnout; professional support is recommended',
    }
  } else {
    return {
      score,
      level: 'Very High',
      interpretation:
        'You are at critical risk of burnout; please seek professional mental health support',
    }
  }
}

async function generateAIRecommendations(
  score: number,
  level: string
): Promise<string> {
  try {
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `Based on a burnout assessment score of ${score} (Level: ${level}), provide 3-4 specific, actionable recommendations for managing burnout and improving mental wellness for an Indian student or young professional. Keep it concise and practical.`

    const result = await model.generateContent(prompt)
    const response = result.response.text()
    return response
  } catch (error) {
    console.error('[v0] AI recommendations error:', error)
    return 'Please consult with a mental health professional for personalized recommendations.'
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { emotionalExhaustion, depersonalization, personalAccomplishment } =
      surveySchema.parse(body)

    const burnoutResult = calculateBurnoutScore(
      emotionalExhaustion,
      depersonalization,
      personalAccomplishment
    )

    const recommendations = await generateAIRecommendations(
      burnoutResult.score,
      burnoutResult.level
    )

    const surveyResponse = await prisma.surveyResponse.create({
      data: {
        userId: session.user.id,
        emotionalExhaustion,
        depersonalization,
        personalAccomplishment,
        score: burnoutResult.score,
        level: burnoutResult.level,
        recommendations,
      },
    })

    return NextResponse.json({
      id: surveyResponse.id,
      ...burnoutResult,
      recommendations,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('[v0] Survey API error:', error)
    return NextResponse.json(
      { error: 'Failed to process survey' },
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

    const latestSurvey = await prisma.surveyResponse.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(latestSurvey)
  } catch (error) {
    console.error('[v0] Survey GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch survey data' },
      { status: 500 }
    )
  }
}
