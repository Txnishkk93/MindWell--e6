'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'

interface MoodData {
  date: string
  mood: number | null
  label: string
}

interface MoodEntry {
  id: string
  mood: number
  notes: string | null
  createdAt: string
}

export default function MoodTrackerPage() {
  const [chartData, setChartData] = useState<MoodData[]>([])
  const [selectedMood, setSelectedMood] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [todayEntry, setTodayEntry] = useState<MoodEntry | null>(null)

  const moodOptions = [
    { value: 1, emoji: '😢', label: 'Overwhelmed' },
    { value: 2, emoji: '😕', label: 'Stressed' },
    { value: 3, emoji: '😊', label: 'Okay' },
    { value: 4, emoji: '😄', label: 'Great' },
  ]

  // Load existing mood data
  useEffect(() => {
    async function loadMoodData() {
      try {
        const response = await fetch('/api/mood?days=7')
        const data = await response.json()
        setChartData(data.chartData)

        // Find today's entry
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayEntry = data.entries.find((entry: MoodEntry) => {
          const entryDate = new Date(entry.createdAt)
          entryDate.setHours(0, 0, 0, 0)
          return entryDate.getTime() === today.getTime()
        })

        if (todayEntry) {
          setTodayEntry(todayEntry)
          setSelectedMood(todayEntry.mood)
          setNotes(todayEntry.notes || '')
        }
      } catch (error) {
        toast.error('Failed to load mood data')
      } finally {
        setIsDataLoading(false)
      }
    }

    loadMoodData()
  }, [])

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
          notes: notes || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save mood')
      }

      const entry = await response.json()
      setTodayEntry(entry)
      toast.success('Mood logged successfully!')

      // Refresh chart data
      const chartResponse = await fetch('/api/mood?days=7')
      const chartResponse_data = await chartResponse.json()
      setChartData(chartResponse_data.chartData)
    } catch (error) {
      toast.error('Failed to save mood')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-mindwell-cream overflow-y-auto">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-6 sticky top-0">
        <h1 className="text-2xl font-bold text-mindwell-primary-green">Mood Tracker</h1>
        <p className="text-gray-600 text-sm mt-1">
          Track how you're feeling daily and discover patterns
        </p>
      </div>

      <div className="flex-1 p-8 space-y-8">
        {/* Today's Mood */}
        <Card className="p-8 bg-white border-0 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">How are you feeling today?</h2>

          <div className="grid grid-cols-4 gap-4 mb-8">
            {moodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedMood(option.value)}
                disabled={isLoading}
                className={`p-6 rounded-lg transition-all ${
                  selectedMood === option.value
                    ? 'bg-mindwell-primary-green/10 border-2 border-mindwell-primary-green scale-105'
                    : 'bg-mindwell-cream border-2 border-transparent hover:border-mindwell-primary-green/30'
                }`}
              >
                <div className="text-4xl mb-2">{option.emoji}</div>
                <div className="text-sm font-medium text-gray-700">{option.label}</div>
              </button>
            ))}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add notes (optional)
            </label>
            <Input
              placeholder="What's on your mind? What triggered this mood?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              className="border-gray-200 focus:border-mindwell-primary-green focus:ring-mindwell-primary-green"
            />
          </div>

          <Button
            onClick={handleSaveMood}
            disabled={isLoading || !selectedMood}
            className="w-full bg-mindwell-primary-green hover:bg-mindwell-primary-green/90 text-white font-medium py-2 rounded-lg"
          >
            {isLoading ? 'Saving...' : 'Save Mood Entry'}
          </Button>
        </Card>

        {/* 7-Day Chart */}
        <Card className="p-8 bg-white border-0 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Your mood this week</h2>

          {isDataLoading ? (
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-600">Loading chart...</p>
            </div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]} />
                  <Tooltip
                    cursor={{ fill: 'rgba(107, 142, 115, 0.1)' }}
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                            <p className="text-sm font-medium">{data.date}</p>
                            <p className="text-lg">{data.label}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar
                    dataKey="mood"
                    fill="#6b8e73"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Insights */}
        <Card className="p-8 bg-gradient-to-r from-mindwell-accent-light to-mindwell-accent-dark text-mindwell-primary-green border-0">
          <h3 className="text-lg font-semibold mb-2">✨ Wellness Tip</h3>
          <p>
            Tracking your mood helps you identify patterns and triggers. Regular mood logging can improve your mental health awareness and help you recognize what impacts your well-being most.
          </p>
        </Card>
      </div>
    </div>
  )
}
