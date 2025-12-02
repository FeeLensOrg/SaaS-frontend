'use client'

import { Button } from '@/components/ui/button'
import { ExternalLink, Download } from 'lucide-react'

interface PDFViewerProps {
  fileUrl: string
  fileName: string
}

export function PDFViewer({ fileUrl, fileName }: PDFViewerProps) {
  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden bg-gray-100">
        <iframe
          src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
          className="w-full"
          style={{ height: '70vh', minHeight: '600px' }}
          title={fileName}
        />
      </div>
    </div>
  )
}

export default PDFViewer

