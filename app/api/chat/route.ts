import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Groq from 'groq-sdk'
import { z } from 'zod'

const messageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000),
  conversationId: z.string().optional(),
})

const feedbackSchema = z.object({
  messageId: z.string(),
  helpful: z.boolean(),
})

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM_PROMPT = `You are MindWell, a compassionate and supportive mental wellness assistant designed specifically for Indian students and young professionals. Your role is to:

1. Provide empathetic, non-judgmental support for stress, anxiety, and burnout
2. Listen actively and validate emotions
3. Suggest healthy coping strategies grounded in evidence-based practices
4. Offer perspective shifts without minimizing concerns
5. Encourage professional help when needed
6. Be culturally sensitive to Indian context and challenges
7. Use warm, encouraging language
8. Keep responses concise but meaningful

Remember: You are not a replacement for professional mental health services. If someone expresses thoughts of self-harm, encourage them to contact Tele-MANAS (14416) or iCall (9152987821) immediately.`

// ─── POST /api/chat — streaming response ─────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Handle feedback submission
    if (body.type === 'feedback') {
      const { messageId, helpful } = feedbackSchema.parse(body)
      const updated = await prisma.chatMessage.updateMany({
        where: { id: messageId, userId: session.user.id },
        data: { helpful },
      })
      if (updated.count === 0) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 })
      }
      return NextResponse.json({ success: true })
    }

    const { message, conversationId } = messageSchema.parse(body)

    // Rate limiting
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentMessages = await prisma.chatMessage.count({
      where: { userId: session.user.id, createdAt: { gte: oneHourAgo } },
    })
    if (recentMessages >= 40) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in an hour.' },
        { status: 429 }
      )
    }

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        userId: session.user.id,
        content: message,
        role: 'USER',
        conversationId: conversationId || undefined,
      },
    })

    // Load conversation history
    const previousMessages = conversationId
      ? await prisma.chatMessage.findMany({
          where: {
            userId: session.user.id,
            conversationId,
            createdAt: { lt: userMessage.createdAt },
          },
          orderBy: { createdAt: 'asc' },
          take: 10,
        })
      : []

    const trimmed = [...previousMessages]
    while (trimmed.length > 0 && trimmed[0].role !== 'USER') trimmed.shift()

    const alternating = trimmed.filter((msg, index) => {
      if (index === 0) return true
      const expectedRole = trimmed[index - 1].role === 'USER' ? 'ASSISTANT' : 'USER'
      return msg.role === expectedRole
    })

    // ── Stream response from Groq ──────────────────────────────────────────
    const stream = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...alternating.map((msg) => ({
          role: msg.role === 'USER' ? ('user' as const) : ('assistant' as const),
          content: msg.content,
        })),
        { role: 'user', content: message },
      ],
      max_tokens: 500,
      stream: true,
    })

    // Collect full response while streaming to client
    let fullResponse = ''
    const convId = userMessage.conversationId

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || ''
            if (text) {
              fullResponse += text
              // SSE format: "data: <text>\n\n"
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }

          // Save assistant message to DB after stream completes
          const assistantMessage = await prisma.chatMessage.create({
            data: {
              userId: session.user.id,
              content: fullResponse,
              role: 'ASSISTANT',
              conversationId: convId,
            },
          })

          // ── Background: mood detection ─────────────────────────────────
          detectAndSaveMood(session.user.id, message).catch(() => {})

          // ── Background: session summary after 10+ messages ────────────
          const totalMessages = await prisma.chatMessage.count({
            where: { userId: session.user.id, conversationId: convId ?? undefined },
          })
          if (totalMessages >= 10 && totalMessages % 10 === 0) {
            generateSessionSummary(session.user.id, convId ?? '', alternating, fullResponse).catch(() => {})
          }

          // Send final metadata so client knows message ID
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                id: assistantMessage.id,
                conversationId: convId,
              })}\n\n`
            )
          )
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`)
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[v0] Chat API error:', error)
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 })
  }
}

// ─── Background: mood detection ───────────────────────────────────────────────
async function detectAndSaveMood(userId: string, userMessage: string) {
  const result = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content:
          'Classify the mood in this message. Reply with exactly one word: happy, neutral, stressed, or burned_out. No punctuation, no explanation.',
      },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 5,
  })

  const raw = result.choices[0]?.message?.content?.trim().toLowerCase() || ''
  const moodMap: Record<string, 'HAPPY' | 'NEUTRAL' | 'STRESSED' | 'BURNED_OUT'> = {
    happy: 'HAPPY',
    neutral: 'NEUTRAL',
    stressed: 'STRESSED',
    burned_out: 'BURNED_OUT',
  }
  const mood = moodMap[raw]
  if (!mood) return

  // Only save one mood entry per hour to avoid spam
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recent = await prisma.moodEntry.count({
    where: { userId, createdAt: { gte: oneHourAgo } },
  })
  if (recent > 0) return

  await prisma.moodEntry.create({
    data: { userId, mood, note: 'Auto-detected from chat' },
  })
}

// ─── Background: session summary → journal ────────────────────────────────────
async function generateSessionSummary(
  userId: string,
  conversationId: string,
  messages: Array<{ role: string; content: string }>,
  lastResponse: string
) {
  const transcript = messages
    .slice(-10)
    .map((m) => `${m.role === 'USER' ? 'User' : 'AI'}: ${m.content}`)
    .join('\n')

  const result = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content:
          'You are a wellness journal assistant. Write a 2-3 sentence summary of this chat session for the user\'s journal. Start with "Today you...". Be warm and reflective.',
      },
      { role: 'user', content: transcript + '\nAI: ' + lastResponse },
    ],
    max_tokens: 150,
  })

  const summary = result.choices[0]?.message?.content?.trim()
  if (!summary) return

  await prisma.journalEntry.create({
    data: {
      userId,
      title: `Chat session summary – ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
      content: summary,
      aiSummary: summary,
    },
  })
}

// ─── GET /api/chat ─────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    const list = searchParams.get('list')
    const checkin = searchParams.get('checkin')

    // GET ?checkin=true — proactive check-in greeting based on last mood
    if (checkin === 'true') {
      const lastMood = await prisma.moodEntry.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
      })

      if (!lastMood) return NextResponse.json({ greeting: null })

      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const isRecent = lastMood.createdAt > yesterday

      if (!isRecent) return NextResponse.json({ greeting: null })

      const greetingMap: Record<string, string> = {
        BURNED_OUT:
          "I noticed you were feeling burned out recently. How are you doing today? Remember, it's okay to take things slow. 🌿",
        STRESSED:
          "You seemed stressed in your last session. I hope today is a bit lighter — I'm here if you want to talk. 💬",
        NEUTRAL:
          "Welcome back! How are you feeling today? I'm here whenever you need support. 🙂",
        HAPPY:
          "Great to see you back! You were in good spirits last time — hope that's continued. How can I help today? ✨",
      }

      return NextResponse.json({
        greeting: greetingMap[lastMood.mood] ?? null,
      })
    }

    // GET ?list=true — all conversations preview
    if (list === 'true') {
      const allMessages = await prisma.chatMessage.findMany({
        where: { userId: session.user.id, conversationId: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { conversationId: true, content: true, role: true, createdAt: true },
      })

      const convMap = new Map<
        string,
        { conversationId: string; preview: string; lastMessageAt: Date; role: string }
      >()

      for (const msg of allMessages) {
        if (!msg.conversationId) continue
        if (!convMap.has(msg.conversationId)) {
          convMap.set(msg.conversationId, {
            conversationId: msg.conversationId,
            preview: msg.content.slice(0, 60) + (msg.content.length > 60 ? '...' : ''),
            lastMessageAt: msg.createdAt,
            role: msg.role,
          })
        }
      }

      return NextResponse.json(Array.from(convMap.values()))
    }

    // GET ?conversationId=xxx — messages for a conversation
    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 })
    }

    const messages = await prisma.chatMessage.findMany({
      where: { userId: session.user.id, conversationId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('[v0] Chat history error:', error)
    return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 })
  }
}

// ─── DELETE /api/chat?conversationId=xxx ──────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 })
    }

    const count = await prisma.chatMessage.count({
      where: { userId: session.user.id, conversationId },
    })

    if (count === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    await prisma.chatMessage.deleteMany({
      where: { userId: session.user.id, conversationId },
    })

    return NextResponse.json({ success: true, deleted: count })
  } catch (error) {
    console.error('[v0] Delete conversation error:', error)
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
  }
}