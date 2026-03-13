'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Loader2, Trash2, ChevronLeft, Pin, PinOff,
  Plus, Tag, BookOpen, Clock, Hash, ChevronDown, ChevronRight,
  Type, Heading1, Heading2, List, ListOrdered, Code, Quote,
  Minus, AlertCircle, Sparkles
} from 'lucide-react'
import { nanoid } from 'nanoid'

// ─── Types (mirrors route.ts) ────────────────────────────────────────────────

type BlockType =
  | 'paragraph' | 'heading1' | 'heading2' | 'heading3'
  | 'bullet' | 'numbered' | 'toggle' | 'code'
  | 'quote' | 'divider' | 'callout'

interface Block {
  id: string
  type: BlockType
  content: string
  children?: Block[]
  language?: string
  icon?: string
  expanded?: boolean
}

interface JournalEntry {
  id: string
  content: string
  emotionalSummary: string
  createdAt: string
  updatedAt: string
  // Notion-like fields
  title?: string
  icon?: string
  coverColor?: string
  coverImageUrl?: string
  blocks?: Block[]
  tags?: string[]
  pinned?: boolean
  wordCount?: number
  readingTime?: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COVER_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#533483',
  '#2d6a4f', '#1b4332', '#774936', '#582f0e',
  '#212529', '#343a40',
]

const BLOCK_ICONS: Record<BlockType, { label: string; icon: React.ReactNode }> = {
  paragraph:  { label: 'Text',       icon: <Type className="w-3.5 h-3.5" /> },
  heading1:   { label: 'Heading 1',  icon: <Heading1 className="w-3.5 h-3.5" /> },
  heading2:   { label: 'Heading 2',  icon: <Heading2 className="w-3.5 h-3.5" /> },
  heading3:   { label: 'Heading 3',  icon: <Heading2 className="w-3.5 h-3.5" /> },
  bullet:     { label: 'Bullet',     icon: <List className="w-3.5 h-3.5" /> },
  numbered:   { label: 'Numbered',   icon: <ListOrdered className="w-3.5 h-3.5" /> },
  toggle:     { label: 'Toggle',     icon: <ChevronRight className="w-3.5 h-3.5" /> },
  code:       { label: 'Code',       icon: <Code className="w-3.5 h-3.5" /> },
  quote:      { label: 'Quote',      icon: <Quote className="w-3.5 h-3.5" /> },
  divider:    { label: 'Divider',    icon: <Minus className="w-3.5 h-3.5" /> },
  callout:    { label: 'Callout',    icon: <AlertCircle className="w-3.5 h-3.5" /> },
}

const DEFAULT_CALLOUT_ICON = '💡'

// ─── Block Renderer ───────────────────────────────────────────────────────────

function BlockEditor({
  block,
  index,
  onChange,
  onKeyDown,
  onAddBelow,
  onDelete,
  onTypeChange,
  inputRef,
}: {
  block: Block
  index: number
  onChange: (id: string, content: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>, id: string, index: number) => void
  onAddBelow: (id: string) => void
  onDelete: (id: string) => void
  onTypeChange: (id: string, type: BlockType) => void
  inputRef: (el: HTMLTextAreaElement | null) => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const [toggleOpen, setToggleOpen] = useState(block.expanded ?? false)

  const blockClass = {
    paragraph: 'text-[15px] text-gray-800 leading-relaxed',
    heading1:  'text-3xl font-bold text-gray-900 tracking-tight',
    heading2:  'text-2xl font-semibold text-gray-900',
    heading3:  'text-xl font-semibold text-gray-700',
    bullet:    'text-[15px] text-gray-800',
    numbered:  'text-[15px] text-gray-800',
    code:      'font-mono text-sm text-emerald-300 bg-transparent',
    quote:     'text-[15px] italic text-gray-600',
    divider:   '',
    callout:   'text-[15px] text-gray-800',
    toggle:    'text-[15px] font-medium text-gray-800',
  }[block.type]

  if (block.type === 'divider') {
    return (
      <div className="group flex items-center gap-2 py-1">
        <hr className="flex-1 border-gray-200" />
        <button
          onClick={() => onDelete(block.id)}
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    )
  }

  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
    inputRef(el)
  }

  return (
    <div className="group relative flex items-start gap-1.5 py-0.5">
      {/* Block type prefix */}
      {block.type === 'bullet' && (
        <span className="mt-[6px] w-4 shrink-0 text-gray-400 text-lg leading-none select-none">•</span>
      )}
      {block.type === 'numbered' && (
        <span className="mt-[5px] w-5 shrink-0 text-gray-400 text-sm font-mono select-none">{index + 1}.</span>
      )}
      {block.type === 'callout' && (
        <span className="mt-[3px] shrink-0 text-base select-none">{block.icon || DEFAULT_CALLOUT_ICON}</span>
      )}
      {block.type === 'toggle' && (
        <button
          onClick={() => setToggleOpen(!toggleOpen)}
          className="mt-[4px] shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          {toggleOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      )}

      <div className={`flex-1 ${block.type === 'quote' ? 'border-l-[3px] border-gray-300 pl-4' : ''} ${block.type === 'callout' ? 'bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex-1' : ''} ${block.type === 'code' ? 'bg-gray-900 rounded-lg px-4 py-3 flex-1' : ''}`}>
        <textarea
          ref={autoResize}
          value={block.content}
          placeholder={
            block.type === 'paragraph' ? "Type '/' for commands…" :
            block.type === 'heading1'  ? 'Heading 1' :
            block.type === 'heading2'  ? 'Heading 2' :
            block.type === 'heading3'  ? 'Heading 3' :
            block.type === 'code'      ? '// write code here…' :
            block.type === 'quote'     ? 'Quote…' :
            block.type === 'callout'   ? 'Note something…' :
            block.type === 'toggle'    ? 'Toggle heading…' : ''
          }
          onChange={(e) => {
            onChange(block.id, e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = e.target.scrollHeight + 'px'
          }}
          onKeyDown={(e) => onKeyDown(e, block.id, index)}
          rows={1}
          className={`w-full bg-transparent border-none outline-none resize-none overflow-hidden placeholder-gray-300 ${blockClass}`}
        />
        {block.type === 'toggle' && toggleOpen && (
          <div className="ml-4 mt-1 border-l-2 border-gray-100 pl-3">
            {(block.children || []).map((child) => (
              <div key={child.id} className="text-[14px] text-gray-600 py-0.5">
                {child.content}
              </div>
            ))}
            <p className="text-xs text-gray-300 mt-1">Toggle content (edit via API)</p>
          </div>
        )}
      </div>

      {/* Block actions */}
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 mt-1 transition-all shrink-0">
        {/* Type switcher */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-all"
          >
            {BLOCK_ICONS[block.type]?.icon}
          </button>
          {showMenu && (
            <div className="absolute left-0 top-7 z-50 bg-white border border-gray-100 rounded-xl shadow-xl p-1 w-44 grid grid-cols-1 gap-0.5">
              {(Object.keys(BLOCK_ICONS) as BlockType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { onTypeChange(block.id, t); setShowMenu(false) }}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors ${block.type === t ? 'bg-gray-50 text-gray-900 font-medium' : ''}`}
                >
                  {BLOCK_ICONS[t].icon}
                  {BLOCK_ICONS[t].label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => onAddBelow(block.id)}
          className="p-1 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(block.id)}
          className="p-1 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [content, setContent] = useState('')

  // Notion-like editor state
  const [blocks, setBlocks] = useState<Block[]>([{ id: nanoid(), type: 'paragraph', content: '' }])
  const [entryTitle, setEntryTitle] = useState('')
  const [entryIcon, setEntryIcon] = useState('📝')
  const [coverColor, setCoverColor] = useState(COVER_COLORS[0])
  const [showCover, setShowCover] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingEntries, setIsLoadingEntries] = useState(true)

  const blockRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const titleRef = useRef<HTMLTextAreaElement>(null)

  // Editing mode = selectedEntry exists OR user started typing
  const isEditing = !!selectedEntry || blocks.some(b => b.content.trim()) || !!entryTitle

  // Load entries on mount
  useEffect(() => {
    loadEntries()
  }, [])

  async function loadEntries() {
    try {
      const response = await fetch('/api/journal')
      const data = await response.json()
      setEntries(data)
    } catch {
      toast.error('Failed to load journal entries')
    } finally {
      setIsLoadingEntries(false)
    }
  }

  function openEntry(entry: JournalEntry) {
    setSelectedEntry(entry)
    setEntryTitle(entry.title || '')
    setEntryIcon(entry.icon || '📝')
    setCoverColor(entry.coverColor || COVER_COLORS[0])
    setShowCover(!!entry.coverColor)
    setTags(entry.tags || [])
    if (entry.blocks && entry.blocks.length > 0) {
      setBlocks(entry.blocks)
    } else {
      setBlocks([{ id: nanoid(), type: 'paragraph', content: entry.content }])
    }
    setContent(entry.content)
  }

  function resetEditor() {
    setSelectedEntry(null)
    setBlocks([{ id: nanoid(), type: 'paragraph', content: '' }])
    setEntryTitle('')
    setEntryIcon('📝')
    setCoverColor(COVER_COLORS[0])
    setShowCover(false)
    setTags([])
    setContent('')
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    const plainText = blocks.map(b => b.content).join('\n').trim()
    if (!plainText && !entryTitle) {
      toast.error('Please write something')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: plainText,
          blocks,
          title: entryTitle,
          icon: entryIcon,
          coverColor: showCover ? coverColor : undefined,
          tags,
          entryId: selectedEntry?.id,
        }),
      })

      if (!response.ok) throw new Error('Failed to save')

      toast.success('Entry saved!')
      await loadEntries()
      resetEditor()
    } catch {
      toast.error('Failed to save journal entry')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Pin toggle ────────────────────────────────────────────────────────────

  async function handlePin(entry: JournalEntry) {
    try {
      const res = await fetch('/api/journal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id, pinned: !entry.pinned }),
      })
      if (!res.ok) throw new Error()
      setEntries(prev =>
        prev.map(e => e.id === entry.id ? { ...e, pinned: !e.pinned } : e)
          .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
      )
      toast.success(entry.pinned ? 'Unpinned' : 'Pinned to top')
    } catch {
      toast.error('Failed to update pin')
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Delete this entry?')) return
    try {
      const response = await fetch(`/api/journal?entryId=${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error()
      toast.success('Entry deleted')
      setEntries(entries.filter((e) => e.id !== id))
    } catch {
      toast.error('Failed to delete entry')
    }
  }

  // ── Block operations ──────────────────────────────────────────────────────

  function updateBlock(id: string, content: string) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b))
  }

  function addBlockBelow(afterId: string, type: BlockType = 'paragraph') {
    const newBlock: Block = { id: nanoid(), type, content: '' }
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === afterId)
      const next = [...prev]
      next.splice(idx + 1, 0, newBlock)
      return next
    })
    setTimeout(() => blockRefs.current[newBlock.id]?.focus(), 20)
  }

  function deleteBlock(id: string) {
    setBlocks(prev => {
      if (prev.length === 1) return [{ id: nanoid(), type: 'paragraph', content: '' }]
      return prev.filter(b => b.id !== id)
    })
  }

  function changeBlockType(id: string, type: BlockType) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, type } : b))
  }

  function handleBlockKeyDown(e: KeyboardEvent<HTMLTextAreaElement>, id: string, index: number) {
    // Enter → new paragraph block below
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addBlockBelow(id)
    }
    // Backspace on empty block → delete
    if (e.key === 'Backspace') {
      const block = blocks.find(b => b.id === id)
      if (block && block.content === '' && blocks.length > 1) {
        e.preventDefault()
        deleteBlock(id)
        const prevBlock = blocks[index - 1]
        if (prevBlock) setTimeout(() => blockRefs.current[prevBlock.id]?.focus(), 20)
      }
    }
    // Slash command — heading shortcut demo
    const block = blocks.find(b => b.id === id)
    if (block?.content === '/' && e.key === '1') {
      e.preventDefault()
      changeBlockType(id, 'heading1')
      updateBlock(id, '')
    }
  }

  // ── Tag helpers ───────────────────────────────────────────────────────────

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
    setShowTagInput(false)
  }

  function removeTag(t: string) {
    setTags(prev => prev.filter(x => x !== t))
  }

  // ─── Editor View ──────────────────────────────────────────────────────────

  if (isEditing) {
    const wordCount = blocks.map(b => b.content).join(' ').trim().split(/\s+/).filter(Boolean).length
    const readTime = Math.max(1, Math.ceil(wordCount / 200))

    return (
      <div className="h-full flex flex-col bg-white">
        {/* ── Cover ── */}
        {showCover && (
          <div
            className="relative h-36 shrink-0 flex items-end px-8 pb-4"
            style={{ backgroundColor: coverColor }}
          >
            <div className="flex gap-2 flex-wrap">
              {COVER_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setCoverColor(c)}
                  className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: c === coverColor ? 'white' : 'transparent'
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Sticky header ── */}
        <div className="border-b border-gray-100 bg-white/95 backdrop-blur px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {wordCount} words
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {readTime} min read
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCover(!showCover)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded hover:bg-gray-50"
            >
              {showCover ? 'Remove cover' : '+ Add cover'}
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetEditor}
              className="text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Back
            </Button>
          </div>
        </div>

        {/* ── Editor body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 pt-8 pb-40">
            {/* Icon + Title */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => {
                    const emojis = ['📝','🌙','☀️','🌿','💭','🔥','🌊','⭐','🎯','🧠']
                    const idx = emojis.indexOf(entryIcon)
                    setEntryIcon(emojis[(idx + 1) % emojis.length])
                  }}
                  className="text-4xl hover:scale-110 transition-transform select-none"
                  title="Click to change icon"
                >
                  {entryIcon}
                </button>
              </div>
              <textarea
                ref={titleRef}
                value={entryTitle}
                onChange={e => setEntryTitle(e.target.value)}
                placeholder="Untitled"
                rows={1}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    blockRefs.current[blocks[0]?.id]?.focus()
                  }
                }}
                className="w-full text-4xl font-bold text-gray-900 bg-transparent border-none outline-none resize-none placeholder-gray-200 leading-tight"
                style={{ fontFamily: 'Georgia, serif' }}
              />
            </div>

            {/* Tags */}
            <div className="flex items-center flex-wrap gap-1.5 mb-6 min-h-[28px]">
              {tags.map(t => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-600 font-medium"
                >
                  <Hash className="w-3 h-3" />
                  {t}
                  <button
                    onClick={() => removeTag(t)}
                    className="ml-0.5 text-gray-400 hover:text-red-400 transition-colors"
                  >×</button>
                </span>
              ))}
              {showTagInput ? (
                <input
                  autoFocus
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
                    if (e.key === 'Escape') setShowTagInput(false)
                  }}
                  onBlur={addTag}
                  placeholder="tag name"
                  className="text-xs px-2 py-1 border border-gray-200 rounded-full outline-none w-24 focus:border-gray-400"
                />
              ) : (
                <button
                  onClick={() => setShowTagInput(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:text-gray-500 transition-colors rounded-full hover:bg-gray-50"
                >
                  <Tag className="w-3 h-3" />
                  Add tag
                </button>
              )}
            </div>

            {/* Block editor */}
            <div className="space-y-0.5">
              {blocks.map((block, index) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  index={index}
                  onChange={updateBlock}
                  onKeyDown={handleBlockKeyDown}
                  onAddBelow={(id) => addBlockBelow(id)}
                  onDelete={deleteBlock}
                  onTypeChange={changeBlockType}
                  inputRef={(el) => { blockRefs.current[block.id] = el }}
                />
              ))}
              {/* Add block button */}
              <button
                onClick={() => addBlockBelow(blocks[blocks.length - 1]?.id)}
                className="flex items-center gap-2 text-xs text-gray-300 hover:text-gray-500 transition-colors mt-4 py-2 group"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">Add a block</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Save footer ── */}
        <div className="border-t border-gray-100 bg-white p-4 sticky bottom-0">
          <div className="max-w-2xl mx-auto flex gap-3">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-medium text-sm rounded-lg"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" />Save & Get AI Insights</>
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ─── List View ────────────────────────────────────────────────────────────

  const pinnedEntries  = entries.filter(e => e.pinned)
  const regularEntries = entries.filter(e => !e.pinned)

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-mindwell-cream">
      <div className="border-b border-gray-100 bg-white px-8 py-6 sticky top-0">
        <h1 className="text-2xl font-bold text-mindwell-primary-green" style={{ fontFamily: 'Georgia, serif' }}>
          My Journal
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Express yourself freely. Your thoughts are private and secure.
        </p>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        {isLoadingEntries ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-mindwell-primary-green" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center">
              <div className="text-5xl mb-4">📝</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No entries yet</h2>
              <p className="text-gray-500 mb-6">Start journaling to express your thoughts and feelings</p>
              <Button
                onClick={() => setBlocks([{ id: nanoid(), type: 'paragraph', content: '' }])}
                className="bg-mindwell-primary-green hover:bg-mindwell-primary-green/90 text-white"
              >
                Write Your First Entry
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl space-y-6">
            {/* Pinned section */}
            {pinnedEntries.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Pin className="w-3 h-3" /> Pinned
                </p>
                <div className="space-y-3">
                  {pinnedEntries.map(entry => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onOpen={openEntry}
                      onPin={handlePin}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Regular entries */}
            {regularEntries.length > 0 && (
              <div>
                {pinnedEntries.length > 0 && (
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                    All Entries
                  </p>
                )}
                <div className="space-y-3">
                  {regularEntries.map(entry => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onOpen={openEntry}
                      onPin={handlePin}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 bg-white p-6 sticky bottom-0">
        <Button
          onClick={() => {
            resetEditor()
            // Trigger editor by setting a placeholder block
            setBlocks([{ id: nanoid(), type: 'paragraph', content: '' }])
            setEntryTitle('')
          }}
          className="w-full bg-mindwell-primary-green hover:bg-mindwell-primary-green/90 text-white font-medium py-2 rounded-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Write New Entry
        </Button>
      </div>
    </div>
  )
}

// ─── Entry Card ───────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  onOpen,
  onPin,
  onDelete,
}: {
  entry: JournalEntry
  onOpen: (e: JournalEntry) => void
  onPin: (e: JournalEntry) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card
      onClick={() => onOpen(entry)}
      className="group cursor-pointer hover:shadow-md transition-all bg-white border border-gray-100 hover:border-gray-200 overflow-hidden rounded-xl p-0"
    >
      {/* Cover strip */}
      {entry.coverColor && (
        <div className="h-2 w-full" style={{ backgroundColor: entry.coverColor }} />
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Icon + title */}
            <div className="flex items-center gap-2 mb-1">
              {entry.icon && <span className="text-lg shrink-0">{entry.icon}</span>}
              <p className="font-semibold text-gray-900 truncate" style={{ fontFamily: 'Georgia, serif' }}>
                {entry.title || 'Untitled'}
              </p>
            </div>

            <p className="text-xs text-gray-400 mb-2">
              {new Date(entry.createdAt).toLocaleDateString('en-US', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
              })}
            </p>

            <p className="text-sm text-gray-600 line-clamp-2">{entry.content}</p>

            {/* Tags */}
            {entry.tags && entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {entry.tags.slice(0, 4).map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-gray-100 rounded-full text-[11px] text-gray-500"
                  >
                    <Hash className="w-2.5 h-2.5" />{t}
                  </span>
                ))}
              </div>
            )}

            {/* Word count + reading time */}
            {(entry.wordCount || entry.readingTime) && (
              <div className="flex items-center gap-3 mt-3 text-[11px] text-gray-400">
                {entry.wordCount ? (
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />{entry.wordCount} words
                  </span>
                ) : null}
                {entry.readingTime ? (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />{entry.readingTime} min read
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={e => { e.stopPropagation(); onPin(entry) }}
              className={`p-1.5 rounded-lg transition-colors ${entry.pinned ? 'text-mindwell-primary-green bg-green-50' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-50'}`}
              title={entry.pinned ? 'Unpin' : 'Pin'}
            >
              {entry.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(entry.id) }}
              className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* AI Insight */}
        {entry.emotionalSummary && (
          <div className="mt-4 p-3 bg-mindwell-cream rounded-lg border border-green-50">
            <p className="text-[11px] font-semibold text-mindwell-primary-green mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI Insight
            </p>
            <p className="text-xs text-gray-600 line-clamp-2">{entry.emotionalSummary}</p>
          </div>
        )}
      </div>
    </Card>
  )
}