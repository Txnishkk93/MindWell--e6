'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'
import { Search, X, Flame } from 'lucide-react'

interface MoodData {
  date: string
  mood: number | null
  label: string
}

interface MoodEntry {
  id: string
  mood: number
  notes: string | null
  tags: string[]
  createdAt: string
}

const TRIGGER_TAGS = ['Work', 'Sleep', 'Family', 'Health', 'Relationships', 'Finance', 'Social', 'Exercise']

export default function MoodTrackerPage() {
  const [chartData, setChartData] = useState<MoodData[]>([])
  const [allEntries, setAllEntries] = useState<MoodEntry[]>([])
  const [selectedMood, setSelectedMood] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [todayEntry, setTodayEntry] = useState<MoodEntry | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [savedEntry, setSavedEntry] = useState<MoodEntry | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [streak, setStreak] = useState(0)
  const notesRef = useRef('')

  const moodOptions = [
    { value: 1, emoji: '😢', label: 'Overwhelmed' },
    { value: 2, emoji: '😕', label: 'Stressed' },
    { value: 3, emoji: '😊', label: 'Okay' },
    { value: 4, emoji: '😄', label: 'Great' },
  ]

  const getMoodOption = (mood: number) => moodOptions.find((m) => m.value === mood)

  function calculateStreak(entries: MoodEntry[]): number {
    if (entries.length === 0) return 0
    const sorted = [...entries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i < sorted.length; i++) {
      const entryDate = new Date(sorted[i].createdAt)
      entryDate.setHours(0, 0, 0, 0)
      const expected = new Date(today)
      expected.setDate(today.getDate() - i)
      if (entryDate.getTime() === expected.getTime()) {
        streak++
      } else {
        break
      }
    }
    return streak
  }

  async function loadMoodData() {
    try {
      const [chartRes, allRes] = await Promise.all([
        fetch('/api/mood?days=7'),
        fetch('/api/mood?days=365'),
      ])
      const chartJson = await chartRes.json()
      const allJson = await allRes.json()

      setChartData(chartJson.chartData)
      setAllEntries(allJson.entries)
      setStreak(calculateStreak(allJson.entries))

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const foundToday = allJson.entries.find((entry: MoodEntry) => {
        const entryDate = new Date(entry.createdAt)
        entryDate.setHours(0, 0, 0, 0)
        return entryDate.getTime() === today.getTime()
      })

      if (foundToday) {
        setTodayEntry(foundToday)
        setSelectedMood(foundToday.mood)
        if (!notesRef.current) {
          setNotes(foundToday.notes || '')
          notesRef.current = foundToday.notes || ''
        }
        if (foundToday.tags?.length && selectedTags.length === 0) {
          setSelectedTags(foundToday.tags)
        }
      }
    } catch (error) {
      toast.error('Failed to load mood data')
    } finally {
      setIsDataLoading(false)
    }
  }

  useEffect(() => {
    loadMoodData()
  }, [])

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  async function handleSaveMood() {
    if (!selectedMood) {
      toast.error('Please select a mood')
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood: selectedMood,
          notes: notesRef.current.trim() || undefined,
          tags: selectedTags,
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to save mood')
      }

      const entry: MoodEntry = await response.json()

      setTodayEntry(entry)
      setNotes(entry.notes || '')
      notesRef.current = entry.notes || ''
      setSavedEntry(entry)
      setShowPopup(true)

      const updatedEntries = allEntries.find((e) => e.id === entry.id)
        ? allEntries.map((e) => (e.id === entry.id ? entry : e))
        : [entry, ...allEntries]
      setAllEntries(updatedEntries)
      setStreak(calculateStreak(updatedEntries))

      const chartRes = await fetch('/api/mood?days=7')
      const chartJson = await chartRes.json()
      setChartData(chartJson.chartData)
    } catch (error: any) {
      toast.error(error.message || 'Failed to save mood')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredEntries = allEntries
    .filter((e) => e.notes)
    .filter((e) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        e.notes?.toLowerCase().includes(q) ||
        e.tags?.some((t) => t.toLowerCase().includes(q)) ||
        getMoodOption(e.mood)?.label.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 overflow-y-auto transition-colors">

      {/* Save Success Popup */}
      {showPopup && savedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center relative">
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-6xl mb-4">{getMoodOption(savedEntry.mood)?.emoji}</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Mood Saved! 🎉</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You're feeling{' '}
              <span className="font-semibold text-green-600 dark:text-green-400">
                {getMoodOption(savedEntry.mood)?.label}
              </span>{' '}
              today.
            </p>
            {savedEntry.notes && (
              <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 mb-4 italic">
                📝 "{savedEntry.notes}"
              </p>
            )}
            {savedEntry.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {savedEntry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center justify-center gap-2 bg-orange-50 dark:bg-orange-950 rounded-lg px-4 py-2 mb-6">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-orange-600 dark:text-orange-400 font-semibold text-sm">
                {streak} day streak — keep it up!
              </span>
            </div>
            <Button
              onClick={() => setShowPopup(false)}
              className="w-full bg-green-700 hover:bg-green-800 text-white rounded-lg"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-8 py-6 sticky top-0 z-10 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-green-700 dark:text-green-400">Mood Tracker</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Track how you're feeling daily and discover patterns
            </p>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-xl px-4 py-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-orange-600 dark:text-orange-400 font-bold">{streak}</span>
              <span className="text-orange-500 dark:text-orange-400 text-sm">day streak</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-8 space-y-8">

        {/* Mood Input Card */}
        <Card className="p-8 bg-white dark:bg-gray-900 border-0 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            How are you feeling today?
          </h2>

          <div className="grid grid-cols-4 gap-4 mb-8">
            {moodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedMood(option.value)}
                disabled={isLoading}
                className={`p-6 rounded-lg border-2 transition-all text-center w-full ${
                  selectedMood === option.value
                    ? 'bg-green-100 dark:bg-green-900 border-green-600 scale-105'
                    : 'bg-gray-50 dark:bg-gray-800 border-transparent hover:border-green-300'
                }`}
              >
                <div className="text-4xl mb-2">{option.emoji}</div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{option.label}</div>
              </button>
            ))}
          </div>

          {/* Trigger Tags */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              What's affecting your mood? (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {TRIGGER_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-green-400'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add notes (optional)
            </label>
            <textarea
              placeholder="What's on your mind? What triggered this mood?"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                notesRef.current = e.target.value
              }}
              disabled={isLoading}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md text-sm resize-none focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 disabled:opacity-50 placeholder-gray-400"
            />
          </div>

          <Button
            onClick={handleSaveMood}
            disabled={isLoading || !selectedMood}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-medium py-2 rounded-lg"
          >
            {isLoading ? 'Saving...' : todayEntry ? 'Update Mood Entry' : 'Save Mood Entry'}
          </Button>
        </Card>

        {/* Today's Entry Preview */}
        {todayEntry && (
          <Card className="p-6 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 shadow-sm">
            <h2 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-3">✅ Today's Entry</h2>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{getMoodOption(todayEntry.mood)?.emoji}</span>
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                {getMoodOption(todayEntry.mood)?.label}
              </span>
              <span className="text-gray-400 text-sm ml-auto">
                {new Date(todayEntry.createdAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {todayEntry.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 mb-2">
                {todayEntry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {todayEntry.notes ? (
              <p className="text-gray-600 dark:text-gray-400 text-sm bg-white dark:bg-gray-900 rounded-md px-4 py-3 border border-green-100 dark:border-green-800 mt-2">
                📝 {todayEntry.notes}
              </p>
            ) : (
              <p className="text-gray-400 text-sm italic mt-2">No notes added</p>
            )}
          </Card>
        )}

        {/* 7-Day Chart */}
        <Card className="p-8 bg-white dark:bg-gray-900 border-0 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Your mood this week</h2>
          {isDataLoading ? (
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-600 dark:text-gray-400">Loading chart...</p>
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280' }} />
                  <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]} tick={{ fill: '#6b7280' }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(107, 142, 115, 0.1)' }}
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-600 rounded shadow-lg">
                            <p className="text-sm font-medium dark:text-white">{data.date}</p>
                            <p className="text-lg">{data.label}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="mood" fill="#6b8e73" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Mood Journal with Search */}
        <Card className="p-8 bg-white dark:bg-gray-900 border-0 shadow-sm">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">📓 Your Mood Journal</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search notes, tags, mood..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:border-green-500 w-60 placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {isDataLoading ? (
            <p className="text-gray-500 text-sm">Loading entries...</p>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📝</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {searchQuery ? 'No entries match your search.' : 'No notes yet.'}
              </p>
              {!searchQuery && (
                <p className="text-gray-400 text-xs mt-1">
                  Add a note when saving your mood and it'll appear here.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry) => {
                const moodOpt = getMoodOption(entry.mood)
                return (
                  <div
                    key={entry.id}
                    className="flex gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-700 transition-colors"
                  >
                    <div className="text-2xl">{moodOpt?.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {moodOpt?.label}
                        </span>
                        <span className="text-xs text-gray-400 shrink-0">
                          {new Date(entry.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      {entry.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {entry.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400 break-words">{entry.notes}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Wellness Tip */}
        <Card className="p-8 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-300 border border-green-100 dark:border-green-800">
          <h3 className="text-lg font-semibold mb-2">✨ Wellness Tip</h3>
          <p className="text-sm">
            Tracking your mood helps you identify patterns and triggers. Regular mood logging can
            improve your mental health awareness and help you recognize what impacts your well-being most.
          </p>
        </Card>

      </div>
    </div>
  )
}