'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { Sidebar } from '@/components/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, FileText, DollarSign, CheckCircle2, Upload, BarChart3 } from 'lucide-react'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!mounted) return
      
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)
      setLoading(false)
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      
      if (!session) {
        router.push('/login')
      } else {
        setUser(session.user)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <Loader2 className="inline-block h-12 w-12 animate-spin text-blue-600 mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50 flex">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 ml-16">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back! 👋
          </h2>
          <p className="text-muted-foreground">
            Analyze your bank statements and discover hidden fees
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hidden Fees Found</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">$0.00</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Health Score</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">—</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Get started by uploading your first bank statement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto p-6 flex flex-col items-start space-y-2 hover:bg-blue-50 hover:border-blue-500 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Upload className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold">Upload Statement</span>
                </div>
                <span className="text-sm text-muted-foreground text-left">
                  Upload a PDF bank statement
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-6 flex flex-col items-start space-y-2 hover:bg-blue-50 hover:border-blue-500 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold">View Reports</span>
                </div>
                <span className="text-sm text-muted-foreground text-left">
                  Analyze your transaction history
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Getting Started */}
        <Card className="bg-blue-600 border-blue-600 text-white">
          <CardHeader>
            <CardTitle className="text-white">Getting Started</CardTitle>
            <CardDescription className="text-blue-100">
              Upload your first bank statement to start analyzing hidden fees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[
                'Upload bank statements (PDF format)',
                'Automatic transaction extraction',
                'Hidden fee detection',
                'Export detailed reports'
              ].map((item, index) => (
                <li key={index} className="flex items-center space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-200 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
