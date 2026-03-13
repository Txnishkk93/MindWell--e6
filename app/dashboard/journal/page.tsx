'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Trash2, ChevronLeft } from 'lucide-react'

interface JournalEntry {
  id: string
  content: string
  emotionalSummary: string
  createdAt: string
  updatedAt: string
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingEntries, setIsLoadingEntries] = useState(true)

  // Load entries on mount
  useEffect(() => {
    loadEntries()
  }, [])

  async function loadEntries() {
    try {
      const response = await fetch('/api/journal')
      const data = await response.json()
      setEntries(data)
    } catch (error) {
      toast.error('Failed to load journal entries')
    } finally {
      setIsLoadingEntries(false)
    }
  }

  async function handleSave() {
    if (!content.trim()) {
      toast.error('Please write something')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          entryId: selectedEntry?.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      const entry = await response.json()
      toast.success('Journal entry saved!')

      // Refresh entries
      await loadEntries()
      setSelectedEntry(null)
      setContent('')
    } catch (error) {
      toast.error('Failed to save journal entry')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      const response = await fetch(`/api/journal?entryId=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete')
      }

      toast.success('Entry deleted')
      setEntries(entries.filter((e) => e.id !== id))
    } catch (error) {
      toast.error('Failed to delete entry')
    }
  }

  if (selectedEntry || content) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-white to-mindwell-cream">
        <div className="border-b border-gray-200 bg-white px-8 py-6 flex items-center justify-between sticky top-0">
          <div>
            <h1 className="text-2xl font-bold text-mindwell-primary-green">
              {selectedEntry ? 'Edit Entry' : 'New Entry'}
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {selectedEntry
                ? new Date(selectedEntry.createdAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedEntry(null)
              setContent('')
            }}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="flex-1 flex flex-col p-8 overflow-y-auto">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind? Write freely without judgment..."
            disabled={isLoading}
            className="flex-1 p-6 border border-gray-200 rounded-lg focus:border-mindwell-primary-green focus:ring-2 focus:ring-mindwell-primary-green/20 outline-none resize-none font-normal text-base"
          />

          <div className="mt-6 space-y-3">
            <Button
              onClick={handleSave}
              disabled={isLoading || !content.trim()}
              className="w-full bg-mindwell-primary-green hover:bg-mindwell-primary-green/90 text-white font-medium py-2 rounded-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Entry & Get Insights'
              )}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Your entry will be analyzed for emotional insights using AI
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-mindwell-cream">
      <div className="border-b border-gray-200 bg-white px-8 py-6 sticky top-0">
        <h1 className="text-2xl font-bold text-mindwell-primary-green">My Journal</h1>
        <p className="text-gray-600 text-sm mt-1">
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
              <p className="text-gray-600 mb-6">Start journaling to express your thoughts and feelings</p>
              <Button
                onClick={() => setContent('')}
                className="bg-mindwell-primary-green hover:bg-mindwell-primary-green/90 text-white"
              >
                Write Your First Entry
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl space-y-4">
            {entries.map((entry) => (
              <Card
                key={entry.id}
                onClick={() => {
                  setSelectedEntry(entry)
                  setContent(entry.content)
                }}
                className="p-6 cursor-pointer hover:shadow-md transition-shadow bg-white border-0"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">
                      {new Date(entry.createdAt).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-gray-900 line-clamp-3 mt-2">
                      {entry.content}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(entry.id)
                    }}
                    className="text-gray-400 hover:text-red-600 transition-colors ml-4"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 p-3 bg-mindwell-cream rounded-lg">
                  <p className="text-xs font-medium text-mindwell-primary-green mb-1">
                    AI Insight:
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {entry.emotionalSummary}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white p-6 sticky bottom-0">
        <Button
          onClick={() => setContent('')}
          className="w-full bg-mindwell-primary-green hover:bg-mindwell-primary-green/90 text-white font-medium py-2 rounded-lg"
        >
          Write New Entry
        </Button>
      </div>
    </div>
  )
}
