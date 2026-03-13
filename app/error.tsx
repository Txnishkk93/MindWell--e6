'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[v0] Error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mindwell-cream via-white to-blue-50 p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">😔</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-600 mb-6">
          We encountered an unexpected error. Please try again.
        </p>
        <div className="space-y-3">
          <Button
            onClick={reset}
            className="w-full bg-mindwell-primary-green hover:bg-mindwell-primary-green/90 text-white"
          >
            Try Again
          </Button>
          <Button
            variant="outline"
            className="w-full border-mindwell-primary-green text-mindwell-primary-green hover:bg-mindwell-cream"
            onClick={() => (window.location.href = '/')}
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  )
}
