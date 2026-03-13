'use client'

import { Session } from 'next-auth'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface HeaderProps {
  user?: Session['user']
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white px-8 py-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-800">
        Welcome back, {user?.name || 'Friend'}
      </h2>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            {user?.name}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => signOut({ redirectTo: '/auth/login' })}
            className="text-red-600 cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
