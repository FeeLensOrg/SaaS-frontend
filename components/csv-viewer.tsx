'use client'

import { useState, useEffect } from 'react'
import { Loader2, Download, ExternalLink, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CSVViewerProps {
  fileUrl: string
  fileName: string
}

export function CSVViewer({ fileUrl, fileName }: CSVViewerProps) {
  const [csvData, setCsvData] = useState<string[][]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])

  useEffect(() => {
    const loadCSV = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(fileUrl)
        if (!response.ok) {
          throw new Error(`Failed to load CSV: ${response.statusText}`)
        }

        const text = await response.text()
        
        // Parse CSV (handle quoted fields and commas)
        const lines = text.split('\n').filter(line => line.trim())
        if (lines.length === 0) {
          throw new Error('CSV file is empty')
        }

        const parsed: string[][] = []
        
        for (const line of lines) {
          const row: string[] = []
          let current = ''
          let inQuotes = false
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i]
            
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"'
                i++
              } else {
                // Toggle quote state
                inQuotes = !inQuotes
              }
            } else if (char === ',' && !inQuotes) {
              // End of field
              row.push(current.trim())
              current = ''
            } else {
              current += char
            }
          }
          
          // Add last field
          row.push(current.trim())
          parsed.push(row)
        }

        if (parsed.length === 0) {
          throw new Error('No data found in CSV')
        }

        setHeaders(parsed[0])
        setCsvData(parsed.slice(1)) // Skip header row
      } catch (err: any) {
        console.error('Error loading CSV:', err)
        setError(err.message || 'Failed to load CSV file')
      } finally {
        setLoading(false)
      }
    }

    if (fileUrl) {
      loadCSV()
    }
  }, [fileUrl])

  const handleDownload = () => {
    window.open(fileUrl, '_blank')
  }

  const handleOpenInNewTab = () => {
    window.open(fileUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading CSV file...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center space-y-4">
        <XCircle className="h-12 w-12 text-red-500 mx-auto" />
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* CSV Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 sticky -top-[4px] z-20 shadow-sm">
                <tr>
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      className="border border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {csvData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {headers.map((_, colIndex) => (
                      <td
                        key={colIndex}
                        className="border border-gray-200 px-4 py-2 text-sm text-gray-900 whitespace-nowrap"
                      >
                        {row[colIndex] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Showing {csvData.length} row{csvData.length !== 1 ? 's' : ''} • {headers.length} column{headers.length !== 1 ? 's' : ''}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

