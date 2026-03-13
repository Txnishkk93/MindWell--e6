'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Loader2, Send, Copy, Check, AlertTriangle, MessageCircle,
  Plus, Clock, Trash2, GripVertical, PanelLeftClose, PanelLeftOpen,
  ThumbsUp, ThumbsDown, Mic, MicOff,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Global type declarations ─────────────────────────────────────────────────

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  helpful?: boolean | null
  isStreaming?: boolean
}

interface ConversationPreview {
  conversationId: string
  preview: string
  lastMessageAt: Date
  role: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  "I'm feeling overwhelmed with studies",
  "Help me with a breathing exercise",
  "I'm burned out and can't focus",
  "I feel anxious before exams",
]

const CRISIS_KEYWORDS = [
  'suicide', 'end my life', "can't go on", 'kill myself',
  'want to die', 'no reason to live', 'self harm', 'hurt myself',
]

const STORAGE_KEY = 'mindwell_conversation_id'
const SIDEBAR_WIDTH_KEY = 'mindwell_sidebar_width'
const MIN_SIDEBAR = 180
const MAX_SIDEBAR = 480
const DEFAULT_SIDEBAR = 260

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isCrisisMessage(text: string): boolean {
  return CRISIS_KEYWORDS.some((kw) => text.toLowerCase().includes(kw))
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatRelativeDate(date: Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ─── CopyButton ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-400"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

// ─── FeedbackButtons ──────────────────────────────────────────────────────────

function FeedbackButtons({ messageId, initial }: { messageId: string; initial?: boolean | null }) {
  const [value, setValue] = useState<boolean | null>(initial ?? null)
  const [saving, setSaving] = useState(false)

  async function submit(helpful: boolean) {
    if (saving || value === helpful) return
    setSaving(true)
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'feedback', messageId, helpful }),
      })
      setValue(helpful)
      toast.success(helpful ? 'Glad that helped!' : 'Thanks for the feedback')
    } catch {
      toast.error('Could not save feedback')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
      <button
        onClick={() => submit(true)}
        title="Helpful"
        className={`p-1 rounded transition-colors ${
          value === true
            ? 'text-green-500 bg-green-50 dark:bg-green-950/30'
            : 'text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30'
        }`}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => submit(false)}
        title="Not helpful"
        className={`p-1 rounded transition-colors ${
          value === false
            ? 'text-red-500 bg-red-50 dark:bg-red-950/30'
            : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
        }`}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── TypingIndicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-gray-100 dark:bg-zinc-800 rounded-2xl rounded-bl-sm px-5 py-3.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

// ─── CrisisBanner ─────────────────────────────────────────────────────────────

function CrisisBanner() {
  return (
    <div className="mx-6 mb-3 flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 shrink-0">
      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
      <div className="text-sm">
        <p className="font-medium text-red-700 dark:text-red-400">
          If you're in crisis, please reach out immediately:
        </p>
        <p className="text-red-600 dark:text-red-300 mt-0.5">
          Tele-MANAS: <strong>14416</strong> · iCall: <strong>9152987821</strong>
        </p>
      </div>
    </div>
  )
}

// ─── DeleteButton ─────────────────────────────────────────────────────────────

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirming) {
      onDelete()
      setConfirming(false)
    } else {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
    }
  }
  return (
    <button
      onClick={handleClick}
      title={confirming ? 'Click again to confirm' : 'Delete'}
      className={`shrink-0 p-1 rounded transition-all ${
        confirming
          ? 'opacity-100 text-red-500 bg-red-50 dark:bg-red-950/30'
          : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
      }`}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  )
}

// ─── VoiceButton ──────────────────────────────────────────────────────────────

function VoiceButton({
  onTranscript,
  disabled,
}: {
  onTranscript: (t: string) => void
  disabled: boolean
}) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  type SpeechRecognitionConstructor = new () => SpeechRecognition

  const getSR = (): SpeechRecognitionConstructor | null => {
    if (typeof window === 'undefined') return null
    return (
      (window as Window & { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor })
        .webkitSpeechRecognition ||
      null
    )
  }

  const supported = typeof window !== 'undefined' && getSR() !== null

  function toggle() {
    const SR = getSR()
    if (!SR) {
      toast.error('Voice input not supported in this browser')
      return
    }

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const recognition = new SR()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript
      onTranscript(transcript)
    }
    recognition.onerror = () => {
      toast.error('Voice input failed')
      setListening(false)
    }
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={listening ? 'Stop recording' : 'Voice input'}
      className={`p-2 rounded-xl transition-colors shrink-0 ${
        listening
          ? 'bg-red-100 dark:bg-red-950/40 text-red-500 animate-pulse'
          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
      }`}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  )
}

// ─── HistorySidebar ───────────────────────────────────────────────────────────

interface SidebarProps {
  conversations: ConversationPreview[]
  activeId: string
  onSelect: (id: string) => void
  onNewChat: () => void
  onDelete: (id: string) => void
  loading: boolean
  width: number
  onResize: (w: number) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

function HistorySidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  loading,
  width,
  onResize,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true
      startX.current = e.clientX
      startWidth.current = width
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [width]
  )

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current) return
      const delta = e.clientX - startX.current
      onResize(Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, startWidth.current + delta)))
    }
    function onMouseUp() {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [onResize])

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-4 gap-3 border-r border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 w-12 shrink-0">
        <button
          onClick={onToggleCollapse}
          title="Expand"
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
        <button
          onClick={onNewChat}
          title="New chat"
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex shrink-0 h-full" style={{ width }}>
      <div className="flex flex-col h-full w-full border-r border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 overflow-hidden">
        {/* Header */}
        <div className="px-3 py-3 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
              Chat History
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onNewChat}
              title="New chat"
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onToggleCollapse}
              title="Collapse"
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-gray-400 text-center px-4 py-8">No conversations yet</p>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.conversationId === activeId
              return (
                <div
                  key={conv.conversationId}
                  onClick={() => onSelect(conv.conversationId)}
                  className={`group w-full flex items-start gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-white dark:bg-zinc-800 border-r-2 border-gray-900 dark:border-gray-100'
                      : 'hover:bg-gray-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <div
                    className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-200 dark:bg-zinc-700'
                    }`}
                  >
                    <MessageCircle
                      className={`w-3 h-3 ${
                        isActive ? 'text-white dark:text-gray-900' : 'text-gray-500'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs truncate leading-snug ${
                        isActive
                          ? 'text-gray-900 dark:text-gray-100 font-medium'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {conv.preview}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {formatRelativeDate(conv.lastMessageAt)}
                    </p>
                  </div>
                  <DeleteButton onDelete={() => onDelete(conv.conversationId)} />
                </div>
              )
            })
          )}
        </div>

        <div className="px-3 py-2.5 border-t border-gray-200 dark:border-zinc-800 shrink-0">
          <p className="text-[10px] text-gray-400 text-center">Private & confidential</p>
        </div>
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1 hover:w-1.5 bg-transparent hover:bg-gray-300 dark:hover:bg-zinc-600 cursor-col-resize transition-all shrink-0 flex items-center justify-center group"
        title="Drag to resize"
      >
        <GripVertical className="w-2.5 h-2.5 text-gray-300 opacity-0 group-hover:opacity-100" />
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string>('')
  const [showCrisis, setShowCrisis] = useState(false)
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [proactiveGreeting, setProactiveGreeting] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Restore sidebar width
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY)
    if (saved) setSidebarWidth(Number(saved))
  }, [])

  function handleResize(w: number) {
    setSidebarWidth(w)
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w))
  }

  async function loadConversations() {
    try {
      setHistoryLoading(true)
      const res = await fetch('/api/chat?list=true')
      const data = await res.json()
      if (Array.isArray(data)) setConversations(data)
    } catch {
      // non-critical
    } finally {
      setHistoryLoading(false)
    }
  }

  async function loadMessages(convId: string) {
    try {
      const res = await fetch(`/api/chat?conversationId=${convId}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setMessages(
          data.map(
            (m: {
              id: string
              content: string
              role: string
              createdAt: string
              helpful?: boolean
            }) => ({
              id: m.id,
              content: m.content,
              role: m.role === 'USER' ? 'user' : 'assistant',
              timestamp: new Date(m.createdAt),
              helpful: m.helpful,
            })
          )
        )
      }
    } catch {
      toast.error('Failed to load conversation')
    }
  }

  async function loadCheckin() {
    try {
      const res = await fetch('/api/chat?checkin=true')
      const data = await res.json()
      if (data.greeting) setProactiveGreeting(data.greeting)
    } catch {
      // non-critical
    }
  }

  // On mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setConversationId(stored)
      loadMessages(stored)
    } else {
      const newId = uuidv4()
      setConversationId(newId)
      localStorage.setItem(STORAGE_KEY, newId)
    }
    loadConversations()
    loadCheckin()
  }, [])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  function handleNewChat() {
    const newId = uuidv4()
    setConversationId(newId)
    localStorage.setItem(STORAGE_KEY, newId)
    setMessages([])
    setShowCrisis(false)
    setProactiveGreeting(null)
  }

  function handleSelectConversation(convId: string) {
    if (convId === conversationId) return
    setConversationId(convId)
    localStorage.setItem(STORAGE_KEY, convId)
    setMessages([])
    setShowCrisis(false)
    loadMessages(convId)
  }

  async function handleDeleteConversation(convId: string) {
    try {
      const res = await fetch(`/api/chat?conversationId=${convId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setConversations((prev) => prev.filter((c) => c.conversationId !== convId))
      if (convId === conversationId) handleNewChat()
      toast.success('Conversation deleted')
    } catch {
      toast.error('Failed to delete conversation')
    }
  }

  // ── Streaming send ──────────────────────────────────────────────────────────
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const text = inputValue.trim()
    if (isCrisisMessage(text)) setShowCrisis(true)
    else setShowCrisis(false)

    setProactiveGreeting(null)

    const userMessage: Message = {
      id: uuidv4(),
      content: text,
      role: 'user',
      timestamp: new Date(),
    }

    const streamingId = uuidv4()
    const streamingMsg: Message = {
      id: streamingId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isStreaming: true,
    }

    setMessages((prev) => [...prev, userMessage, streamingMsg])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId }),
      })

      if (!response.ok || !response.body) {
        const error = await response.json().catch(() => ({ error: 'Failed to send message' }))
        toast.error(error.error || 'Failed to send message')
        setMessages((prev) =>
          prev.filter((m) => m.id !== userMessage.id && m.id !== streamingId)
        )
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const parsed = JSON.parse(line.slice(6))

            if (parsed.text) {
              accumulatedText += parsed.text
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingId ? { ...m, content: accumulatedText } : m
                )
              )
            }

            if (parsed.done) {
              const finalId = parsed.id ?? streamingId
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingId
                    ? { ...m, id: finalId, content: accumulatedText, isStreaming: false }
                    : m
                )
              )
              loadConversations()
            }

            if (parsed.error) {
              toast.error('AI response failed')
              setMessages((prev) => prev.filter((m) => m.id !== streamingId))
            }
          } catch {
            // malformed SSE line, skip
          }
        }
      }
    } catch {
      toast.error('An error occurred while sending the message')
      setMessages((prev) =>
        prev.filter((m) => m.id !== userMessage.id && m.id !== streamingId)
      )
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex bg-white dark:bg-zinc-950 overflow-hidden">
      {/* Sidebar */}
      <HistorySidebar
        conversations={conversations}
        activeId={conversationId}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
        loading={historyLoading}
        width={sidebarWidth}
        onResize={handleResize}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                आत्mann
              </h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Private · Confidential · Always here
              </p>
            </div>
          </div>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            {messages.length > 0 ? `${messages.length} messages` : 'New conversation'}
          </span>
        </div>

        {/* Crisis banner */}
        {showCrisis && <CrisisBanner />}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Proactive greeting */}
          {proactiveGreeting && messages.length === 0 && (
            <div className="flex justify-start">
              <div className="max-w-xs lg:max-w-md xl:max-w-lg">
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 px-1 block mb-1">
                  MindWell AI
                </span>
                <div className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed">
                  {proactiveGreeting}
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {messages.length === 0 && !proactiveGreeting && (
            <div className="flex flex-col items-center justify-center h-full gap-7">
              <div className="text-center max-w-sm">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl">🌿</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  How are you feeling today?
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  I'm here to listen. Share what's on your mind or pick a topic below.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 w-full max-w-md">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInputValue(prompt)}
                    className="text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 text-sm text-gray-700 dark:text-gray-300 transition-colors leading-snug"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex group ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex flex-col gap-1 max-w-xs lg:max-w-md xl:max-w-lg ${
                  message.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 px-1">
                  {message.role === 'user' ? 'You' : 'आत्mann AI'}
                </span>

                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed relative ${
                    message.role === 'user'
                      ? 'bg-gray-900 text-white rounded-br-sm dark:bg-gray-100 dark:text-gray-900'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm dark:bg-zinc-800 dark:text-gray-100'
                  }`}
                >
                  {message.content}
                  {message.isStreaming && (
                    <span className="inline-block w-0.5 h-4 bg-gray-500 dark:bg-gray-300 ml-0.5 animate-pulse align-middle" />
                  )}
                </div>

                {/* Timestamp + actions */}
                <div
                  className={`flex items-center gap-1.5 px-1 ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {formatTime(message.timestamp)}
                  </span>
                  {message.role === 'assistant' && !message.isStreaming && (
                    <>
                      <CopyButton text={message.content} />
                      <FeedbackButtons messageId={message.id} initial={message.helpful} />
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing dots — only while first chunk hasn't arrived yet */}
          {isLoading && messages[messages.length - 1]?.content === '' && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-4 shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2.5 items-center">
            <VoiceButton
              onTranscript={(t) => setInputValue((prev) => (prev ? prev + ' ' + t : t))}
              disabled={isLoading}
            />
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(e)
                }
              }}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 rounded-xl text-sm placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-gray-300 dark:focus-visible:ring-zinc-600"
            />
            <Button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-gray-900 hover:bg-gray-700 text-white dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300 rounded-xl px-4 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
            20 messages/hour · Your conversations are private and confidential
          </p>
        </div>
      </div>
    </div>
  )
}