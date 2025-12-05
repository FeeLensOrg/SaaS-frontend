'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, FileText, LogOut, X, Menu } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  const navItems = useMemo(() => [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Documents',
      href: '/documents',
      icon: FileText,
    },
  ], [])

  const expanded = isExpanded || isHovered

  const handleMouseEnter = useCallback(() => {
    // Only enable hover on desktop (lg breakpoint)
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      // Add a small delay before expanding (less sensitive)
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovered(true)
      }, 300) // 300ms delay
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    // Clear timeout if mouse leaves before delay
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setIsHovered(false)
  }, [])

  const handleClose = useCallback(() => {
    // Clear any pending hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    setIsExpanded(false)
    setIsHovered(false)
  }, [])

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-lg",
          "will-change-[width] transition-[width,box-shadow] duration-200 ease-out",
          expanded ? "w-64 z-50 shadow-2xl" : "w-16 z-40"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ transform: 'translateZ(0)' }} // Force GPU acceleration
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            {expanded ? (
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-600">
                  <span className="text-lg font-bold text-white">F</span>
                </div>
                <h1 className="text-xl font-bold text-blue-600">FeeLens</h1>
              </div>
            ) : (
              <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-600 mx-auto">
                <span className="text-lg font-bold text-white">F</span>
              </div>
            )}
            {!expanded && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 lg:hidden"
                onClick={() => setIsExpanded(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
            {expanded && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  onClick={handleClose}
                >
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isActive ? "text-blue-600" : "text-gray-500 group-hover:text-gray-900"
                  )} />
                  {expanded && (
                    <span className="whitespace-nowrap">{item.name}</span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Footer with Logout */}
          <div className="px-3 py-4 border-t border-gray-200">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                expanded ? "px-3" : "px-0 justify-center"
              )}
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {expanded && <span className="ml-3 whitespace-nowrap">Logout</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Spacer for main content - only on mobile, desktop uses fixed sidebar */}
      <div className="w-16 lg:w-0" />
    </>
  )
}

