import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FeeLens - Bank Fee Analysis',
  description: 'Analyze hidden bank fees with AI-powered insights',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}


