import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'

const messageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000),
  conversationId: z.string().optional(),
})

const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')

const SYSTEM_PROMPT = `You are MindWell, a compassionate and supportive mental wellness assistant designed specifically for Indian students and young professionals. Your role is to:

1. Provide empathetic, non-judgmental support for stress, anxiety, and burnout
2. Listen actively and validate emotions
3. Suggest healthy coping strategies grounded in evidence-based practices
4. Offer perspective shifts without minimizing concerns
5. Encourage professional help when needed
6. Be culturally sensitive to Indian context and challenges
7. Use warm, encouraging language
8. Keep responses concise but meaningful

Remember: You are not a replacement for professional mental health services. If someone expresses thoughts of self-harm, encourage them to contact a mental health professional immediately.

Current date: ${new Date().toLocaleDateString()}`

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { message, conversationId } = messageSchema.parse(body)

    // Rate limiting check (20 requests per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentMessages = await prisma.chatMessage.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: oneHourAgo },
      },
    })

    if (recentMessages >= 20) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in an hour.' },
        { status: 429 }
      )
    }

    // Save user message to database
    const userMessage = await prisma.chatMessage.create({
      data: {
        userId: session.user.id,
        content: message,
        role: 'user',
        conversationId: conversationId || undefined,
      },
    })

    // Get conversation history for context
    const previousMessages = conversationId
      ? await prisma.chatMessage.findMany({
          where: {
            userId: session.user.id,
            conversationId,
            createdAt: { lt: userMessage.createdAt },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
      : []

    // Build chat history for context
    const chatHistory = previousMessages
      .reverse()
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }))

    // Stream response from Gemini
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: SYSTEM_PROMPT,
    })

    const result = await chat.sendMessageStream(message)

    // Collect full response for saving to DB
    let fullResponse = ''
    for await (const chunk of result.stream) {
      fullResponse += chunk.text()
    }

    // Save assistant response to database
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        userId: session.user.id,
        content: fullResponse,
        role: 'assistant',
        conversationId: userMessage.conversationId,
      },
    })

    return NextResponse.json({
      id: assistantMessage.id,
      content: fullResponse,
      conversationId: assistantMessage.conversationId,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('[v0] Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID required' },
        { status: 400 }
      )
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        userId: session.user.id,
        conversationId,
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('[v0] Chat history error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    )
  }
}
