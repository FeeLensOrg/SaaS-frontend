'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase/client'
import { Navigation } from '@/components/navigation'
import { UploadStatement } from '@/components/upload-statement'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, FileText, Eye, Calendar, CheckCircle2, Clock, XCircle } from 'lucide-react'

// Import dynamique de react-pdf pour éviter les problèmes SSR
const PDFViewer = dynamic(
  () => import('@/components/pdf-viewer'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }
)

interface BankDocument {
  id: string
  file_name: string
  file_url: string // Peut être un chemin ou une URL
  status: 'pending' | 'processing' | 'done' | 'error'
  upload_date: string
  processed_at?: string
  error_message?: string
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<BankDocument[]>([])
  const [selectedDoc, setSelectedDoc] = useState<BankDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      loadDocuments()
    }
    checkUser()
  }, [router])

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('upload_date', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'done':
        return 'Processed'
      case 'processing':
        return 'Processing'
      case 'error':
        return 'Error'
      default:
        return 'Pending'
    }
  }

  const openPdfViewer = async (doc: BankDocument) => {
    setPdfError(null)
    
    // Si file_url est un chemin (commence par user_id/), générer une URL signée via le backend
    let fileUrl = doc.file_url
    
    // Vérifier si c'est un chemin (format: user_id/document_id.pdf)
    if (doc.file_url.includes('/') && !doc.file_url.startsWith('http')) {
      // Récupérer la session pour obtenir le token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        setPdfError('User not authenticated. Please log in again.')
        return
      }
      
      try {
        // Appeler le backend pour générer l'URL signée
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${backendUrl}/documents/${doc.id}/signed-url`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
          throw new Error(errorData.detail || `HTTP ${response.status}`)
        }
        
        const data = await response.json()
        fileUrl = data.signed_url
      } catch (error: any) {
        console.error('Error generating signed URL:', error)
        const errorMsg = error.message.includes('fetch') || error.message.includes('Failed to fetch')
          ? 'Cannot connect to backend API. Please ensure the backend is running on http://localhost:8000'
          : error.message
        setPdfError(`Error loading file: ${errorMsg}. Please ensure the backend API is running and the bucket 'bank-statements' exists in Supabase Storage.`)
        return
      }
    }
    
    // Créer un objet avec l'URL signée
    setSelectedDoc({
      ...doc,
      file_url: fileUrl
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Bank Statements</h1>
          <p className="text-muted-foreground">
            Upload and manage your bank statements
          </p>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="list">My Statements</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <UploadStatement onUploadSuccess={loadDocuments} />
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            {documents.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">No statements yet</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Upload your first bank statement to get started
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <Card key={doc.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base mb-1 truncate">
                            {doc.file_name}
                          </CardTitle>
                          <CardDescription className="flex items-center space-x-2 text-xs">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(doc.upload_date).toLocaleDateString()}
                            </span>
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(doc.status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {getStatusText(doc.status)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPdfViewer(doc)}
                          className="h-8"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* PDF Viewer Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => {
        setSelectedDoc(null)
        setPdfError(null)
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selectedDoc?.file_name}</DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <>
              {pdfError ? (
                <div className="p-8 text-center space-y-4">
                  <XCircle className="h-12 w-12 text-red-500 mx-auto" />
                  <p className="text-red-600 font-medium">{pdfError}</p>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium">To fix this issue:</p>
                    <ol className="list-decimal list-inside space-y-1 text-left max-w-md mx-auto">
                      <li>Go to your Supabase Dashboard</li>
                      <li>Navigate to <strong>Storage</strong> in the left menu</li>
                      <li>Click <strong>New bucket</strong></li>
                      <li>Name it: <code className="bg-gray-100 px-1 rounded">bank-statements</code></li>
                      <li>Make sure <strong>Public bucket</strong> is <strong>DISABLED</strong> (private)</li>
                      <li>Click <strong>Create bucket</strong></li>
                    </ol>
                    <p className="pt-2">See <code className="bg-gray-100 px-1 rounded">SUPABASE_SETUP.md</code> for detailed instructions.</p>
                  </div>
                </div>
              ) : (
                <PDFViewer fileUrl={selectedDoc.file_url} fileName={selectedDoc.file_name} />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

