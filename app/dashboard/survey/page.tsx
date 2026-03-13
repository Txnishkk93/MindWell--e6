'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface SurveyResult {
  score: number
  level: string
  interpretation: string
  recommendations: string
}

const SURVEY_QUESTIONS = [
  {
    id: 'emotionalExhaustion',
    title: 'Emotional Exhaustion',
    description: 'How often do you feel emotionally drained or exhausted?',
    min: 0,
    max: 6,
  },
  {
    id: 'depersonalization',
    title: 'Depersonalization',
    description: 'How often do you feel detached or cynical about your work/studies?',
    min: 0,
    max: 6,
  },
  {
    id: 'personalAccomplishment',
    title: 'Personal Accomplishment',
    description: 'How satisfied do you feel with your accomplishments?',
    min: 0,
    max: 6,
  },
]

export default function SurveyPage() {
  const [responses, setResponses] = useState({
    emotionalExhaustion: 0,
    depersonalization: 0,
    personalAccomplishment: 6,
  })
  const [result, setResult] = useState<SurveyResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(responses),
      })

      if (!response.ok) {
        throw new Error('Failed to submit survey')
      }

      const data = await response.json()
      setResult(data)
      setSubmitted(true)
      toast.success('Survey submitted successfully!')
    } catch (error) {
      toast.error('Failed to submit survey')
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted && result) {
    const levelColors = {
      Low: 'bg-green-50 border-green-200',
      Moderate: 'bg-yellow-50 border-yellow-200',
      High: 'bg-orange-50 border-orange-200',
      'Very High': 'bg-red-50 border-red-200',
    }

    const levelEmojis = {
      Low: '✅',
      Moderate: '⚠️',
      High: '🚨',
      'Very High': '🆘',
    }

    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-white to-mindwell-cream overflow-y-auto">
        <div className="border-b border-gray-200 bg-white px-8 py-6 sticky top-0">
          <h1 className="text-2xl font-bold text-mindwell-primary-green">Burnout Assessment Results</h1>
        </div>

        <div className="flex-1 p-8 space-y-8">
          {/* Score Card */}
          <Card className={`p-8 border-2 ${levelColors[result.level as keyof typeof levelColors]}`}>
            <div className="flex items-center gap-4 mb-6">
              <span className="text-5xl">{levelEmojis[result.level as keyof typeof levelEmojis]}</span>
              <div>
                <h2 className="text-3xl font-bold text-mindwell-primary-green">{result.level} Burnout</h2>
                <p className="text-gray-600">Score: {result.score}/24</p>
              </div>
            </div>
            <p className="text-lg text-gray-700">{result.interpretation}</p>
          </Card>

          {/* AI Recommendations */}
          <Card className="p-8 bg-white border-0 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Personalized Recommendations</h3>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{result.recommendations}</p>
            </div>
          </Card>

          {/* Tips */}
          <Card className="p-8 bg-gradient-to-r from-mindwell-accent-light to-mindwell-accent-dark text-mindwell-primary-green border-0">
            <h3 className="text-lg font-semibold mb-3">💡 Next Steps</h3>
            <ul className="space-y-2 text-sm">
              <li>• Share results with a trusted friend or mentor</li>
              <li>• Consider speaking with a mental health professional</li>
              <li>• Implement one recommendation this week</li>
              <li>• Retake this survey in 4 weeks to track progress</li>
            </ul>
          </Card>

          <Button
            onClick={() => setSubmitted(false)}
            className="w-full bg-mindwell-primary-green hover:bg-mindwell-primary-green/90 text-white font-medium py-2 rounded-lg"
          >
            Take Survey Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-mindwell-cream overflow-y-auto">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-6 sticky top-0">
        <h1 className="text-2xl font-bold text-mindwell-primary-green">Burnout Assessment</h1>
        <p className="text-gray-600 text-sm mt-1">
          Understanding your stress levels and burnout risk
        </p>
      </div>

      <div className="flex-1 p-8 space-y-8 max-w-2xl">
        <Card className="p-8 bg-mindwell-cream border-0">
          <p className="text-gray-700 mb-4">
            This survey helps you assess your burnout levels across three dimensions:
          </p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>✓ <strong>Emotional Exhaustion:</strong> How drained you feel</li>
            <li>✓ <strong>Depersonalization:</strong> How detached you feel</li>
            <li>✓ <strong>Personal Accomplishment:</strong> Your sense of achievement</li>
          </ul>
        </Card>

        {SURVEY_QUESTIONS.map((question) => (
          <Card key={question.id} className="p-8 bg-white border-0 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{question.title}</h2>
            <p className="text-gray-600 mb-6">{question.description}</p>

            <div className="space-y-4">
              <Slider
                value={[responses[question.id as keyof typeof responses]]}
                onValueChange={(value) =>
                  setResponses((prev) => ({
                    ...prev,
                    [question.id]: value[0],
                  }))
                }
                min={question.min}
                max={question.max}
                step={1}
                disabled={isLoading}
                className="w-full"
              />

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">{question.min}</span>
                <div className="text-center">
                  <span className="text-2xl font-bold text-mindwell-primary-green">
                    {responses[question.id as keyof typeof responses]}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {question.id === 'personalAccomplishment'
                      ? question.max === responses[question.id as keyof typeof responses]
                        ? 'Very Satisfied'
                        : 'Somewhat Satisfied'
                      : question.max === responses[question.id as keyof typeof responses]
                      ? 'Very Often'
                      : 'Sometimes'}
                  </p>
                </div>
                <span className="text-sm text-gray-500">{question.max}</span>
              </div>
            </div>
          </Card>
        ))}

        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full bg-mindwell-primary-green hover:bg-mindwell-primary-green/90 text-white font-medium py-3 rounded-lg text-lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Get Results & Recommendations'
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          Your responses are private and encrypted. Results are processed with AI to provide personalized recommendations.
        </p>
      </div>
    </div>
  )
}
