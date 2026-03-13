'use client'

import { useState, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize conversation
  useEffect(() => {
    setConversationId(uuidv4())
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: uuidv4(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Failed to send message')
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
        return
      }

      const data = await response.json()
      const assistantMessage: Message = {
        id: data.id,
        content: data.content,
        role: 'assistant',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      toast.error('An error occurred while sending the message')
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'linear-gradient(to bottom, white, #f5f1e8)' }}>
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-6">
        <h1 className="text-2xl font-bold" style={{ color: '#6b8e73' }}>Your Wellness Companion</h1>
        <p className="text-gray-600 text-sm mt-1">
          Chat with MindWell about stress, anxiety, or anything on your mind
        </p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#f5f1e8' }}>
                <span className="text-3xl">🌿</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h2>
              <p className="text-gray-600">
                I'm here to listen and support you. Feel free to share what's on your mind or ask for advice.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-xs lg:max-w-md xl:max-w-lg px-6 py-4 rounded-lg"
                style={message.role === 'user'
                  ? { backgroundColor: '#6b8e73', color: 'white', borderBottomRightRadius: '0' }
                  : { backgroundColor: 'white', color: '#111827', border: '1px solid #e5e7eb', borderBottomLeftRadius: '0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }
                }
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <Card className="px-6 py-4 bg-white border-gray-200">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#6b8e73' }} />
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-6">
        <form onSubmit={handleSendMessage} className="flex gap-4">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 border-gray-200"
          />
          <Button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="text-white"
            style={{ backgroundColor: '#6b8e73' }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Rate limited to 20 messages per hour. This helps us provide quality support.
        </p>
      </div>
    </div>
  )
}
