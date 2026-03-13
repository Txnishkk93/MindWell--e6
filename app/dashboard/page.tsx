import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, TrendingUp, FileText, Lightbulb } from 'lucide-react'

const features = [
  {
    title: 'AI Chat',
    description: 'Talk to your personal wellness companion. Get support anytime.',
    icon: MessageSquare,
    href: '/dashboard/chat',
    color: 'text-mindwell-primary-green',
  },
  {
    title: 'Mood Tracker',
    description: 'Track your mood daily and see patterns over time.',
    icon: TrendingUp,
    href: '/dashboard/mood',
    color: 'text-mindwell-terracotta',
  },
  {
    title: 'Journal',
    description: 'Express yourself freely. Get AI-powered emotional insights.',
    icon: FileText,
    href: '/dashboard/journal',
    color: 'text-mindwell-accent-dark',
  },
  {
    title: 'Burnout Survey',
    description: 'Assess your stress levels and get personalized recommendations.',
    icon: Lightbulb,
    href: '/dashboard/survey',
    color: 'text-mindwell-accent-light',
  },
]

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Welcome to Your Wellness Space</h1>
        <p className="text-lg text-gray-600">
          Your mental health is a priority. Choose how you'd like to take care of yourself today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <Link key={feature.href} href={feature.href}>
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="flex items-start gap-4">
                  <div className={`p-3 bg-mindwell-cream rounded-lg ${feature.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      {feature.description}
                    </p>
                    <Button variant="ghost" className="text-mindwell-primary-green hover:bg-mindwell-cream">
                      Explore →
                    </Button>
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="mt-12 bg-gradient-to-r from-mindwell-cream to-mindwell-accent-light rounded-lg p-8">
        <h2 className="text-2xl font-bold text-mindwell-primary-green mb-2">
          Your mental health matters
        </h2>
        <p className="text-gray-700 mb-4">
          आत्mann is designed to support you through stress, anxiety, and burnout with personalized tools and AI-powered insights. Remember, it's okay to not be okay. We're here for you.
        </p>
      </div>
    </div>
  )
}
