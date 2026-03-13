import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default async function HomePage() {
  const session = await auth()

  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f1e8' }}>
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: '#6b8e73' }}>MindWell</h1>
          <div className="flex gap-4">
            <Link href="/auth/login">
              <Button variant="outline" style={{ borderColor: '#6b8e73', color: '#6b8e73' }} className="hover:bg-orange-50">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="text-white" style={{ backgroundColor: '#6b8e73' }}>
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Your Mental Wellness Companion
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Chat with AI, track your mood, journal freely, and understand your burnout levels. All designed for your mental well-being.
            </p>
            <Link href="/auth/signup">
              <Button className="text-white text-lg px-8 py-3 rounded-lg" style={{ backgroundColor: '#6b8e73' }}>
                Start Free Today
              </Button>
            </Link>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 gap-8 mt-20">
            <div className="p-8 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Wellness Chat</h3>
              <p className="text-gray-600">
                Talk to your personal wellness companion about stress, anxiety, and burnout. Get support whenever you need it.
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Mood Tracking</h3>
              <p className="text-gray-600">
                Log your mood daily and visualize patterns over time. Understand what affects your emotional well-being.
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Free-form Journaling</h3>
              <p className="text-gray-600">
                Express yourself without judgment. Get AI-powered emotional insights from your journal entries.
              </p>
            </div>

            <div className="p-8 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🧭</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Burnout Assessment</h3>
              <p className="text-gray-600">
                Understand your stress levels and get personalized recommendations to prevent burnout.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-white py-16 px-6" style={{ backgroundColor: '#6b8e73' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-4">
            Take the first step towards better mental health
          </h3>
          <p className="text-lg mb-8 opacity-90">
            Join thousands of students and professionals already using MindWell for their wellness journey.
          </p>
          <Link href="/auth/signup">
            <Button className="bg-white hover:bg-gray-100 font-semibold px-8 py-3 rounded-lg" style={{ color: '#6b8e73' }}>
              Get Started Free
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center text-gray-600 text-sm">
          <p>© 2024 MindWell. Taking care of your mental health, one step at a time.</p>
        </div>
      </footer>
    </div>
  )
}
