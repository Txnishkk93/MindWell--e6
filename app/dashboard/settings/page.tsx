'use client'

import { useSession, signOut } from 'next-auth/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { useState } from 'react'

export default function SettingsPage() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [isLoading, setIsLoading] = useState(false)

  async function handleSignOut() {
    await signOut({ redirectTo: '/auth/login' })
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-mindwell-cream overflow-y-auto">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-6 sticky top-0">
        <h1 className="text-2xl font-bold text-mindwell-primary-green">Settings</h1>
        <p className="text-gray-600 text-sm mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="flex-1 p-8 max-w-2xl">
        {/* Account Section */}
        <Card className="p-8 bg-white border-0 shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Account</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <Input
                type="text"
                value={session?.user?.name || ''}
                disabled
                className="bg-gray-50 border-gray-200"
              />
              <p className="text-xs text-gray-500 mt-2">Contact support to change your name</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <Input
                type="email"
                value={session?.user?.email || ''}
                disabled
                className="bg-gray-50 border-gray-200"
              />
            </div>
          </div>
        </Card>

        {/* Preferences Section */}
        <Card className="p-8 bg-white border-0 shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Preferences</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Theme
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    theme === 'light'
                      ? 'border-mindwell-primary-green bg-mindwell-cream'
                      : 'border-gray-200 hover:border-mindwell-primary-green/30'
                  }`}
                >
                  ☀️ Light
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    theme === 'dark'
                      ? 'border-mindwell-primary-green bg-gray-800'
                      : 'border-gray-200 hover:border-mindwell-primary-green/30'
                  }`}
                >
                  🌙 Dark
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Privacy & Security */}
        <Card className="p-8 bg-white border-0 shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Privacy & Security</h2>

          <div className="space-y-4 mb-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                ✓ All your data is encrypted and never shared with third parties<br />
                ✓ AI analysis is performed securely on your request<br />
                ✓ You can delete your account and data anytime
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50"
              disabled={isLoading}
            >
              Download My Data
            </Button>
            <Button
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50"
              disabled={isLoading}
            >
              Delete Account & Data
            </Button>
          </div>
        </Card>

        {/* About Section */}
        <Card className="p-8 bg-gradient-to-r from-mindwell-accent-light to-mindwell-accent-dark border-0 mb-6">
          <h2 className="text-lg font-semibold text-mindwell-primary-green mb-4">About MindWell</h2>
          <p className="text-sm text-gray-700 mb-4">
            MindWell is your personal AI wellness companion, designed to support mental health through chat, mood tracking, journaling, and burnout assessment.
          </p>
          <p className="text-xs text-gray-600">
            Version 1.0 • Built with care for your well-being
          </p>
        </Card>

        {/* Sign Out */}
        <Button
          onClick={handleSignOut}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg"
        >
          Sign Out
        </Button>

        <p className="text-xs text-gray-500 text-center mt-6">
          Questions? We're here to help. Reach out to support@mindwell.app
        </p>
      </div>
    </div>
  )
}
