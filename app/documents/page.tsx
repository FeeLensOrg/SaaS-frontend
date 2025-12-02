'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase/client'
import { Sidebar } from '@/components/sidebar'
import { UploadStatement } from '@/components/upload-statement'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, FileText, Eye, Calendar, CheckCircle2, Clock, XCircle, BarChart3, AlertTriangle, Trash2, Play, ExternalLink, Download } from 'lucide-react'

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

const CSVViewer = dynamic(
  () => import('@/components/csv-viewer').then(mod => ({ default: mod.CSVViewer })),
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
  analysis_results?: {
    total_transactions: number
    calculation_errors: number
    error_rate: number
    errors_details: Array<{
      service: string
      volume: number
      unit_price: number
      expected_charge: number
      actual_charge: number
      difference: number
    }>
  }
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<BankDocument[]>([])
  const [selectedDoc, setSelectedDoc] = useState<BankDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null)
  const router = useRouter()

  const loadDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*, analysis_results')
        .order('upload_date', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!mounted) return
      
      if (!user) {
        router.push('/login')
        return
      }
      loadDocuments()
    }
    checkUser()

    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Poll for status updates when there are documents being processed
  useEffect(() => {
    const hasProcessingDocs = documents.some(doc => doc.status === 'pending' || doc.status === 'processing')
    
    if (!hasProcessingDocs) return

    const interval = setInterval(() => {
      loadDocuments()
    }, 3000) // Refresh every 3 seconds

    return () => clearInterval(interval)
  }, [documents, loadDocuments])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="h-4 w-4 text-green-600 transition-colors duration-200" />
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600 animate-spin transition-colors duration-200" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600 transition-colors duration-200" />
      default:
        return <Clock className="h-4 w-4 text-gray-400 transition-colors duration-200" />
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

  const analyzeDocument = useCallback(async (docId: string) => {
    if (analyzingDocId === docId) {
      console.log('Analysis already in progress for this document')
      return
    }

    try {
      setAnalyzingDocId(docId)
      
      // Update status immediately in UI for instant feedback
      setDocuments(prevDocs => 
        prevDocs.map(doc => 
          doc.id === docId 
            ? { ...doc, status: 'processing' as const }
            : doc
        )
      )
      
      console.log('Starting analysis for document:', docId)
      
      // Get session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('Session error:', sessionError)
        // Revert status on error
        setDocuments(prevDocs => 
          prevDocs.map(doc => 
            doc.id === docId 
              ? { ...doc, status: 'error' as const }
              : doc
          )
        )
        throw new Error('Failed to get session')
      }
      
      if (!session?.access_token) {
        console.error('No access token found')
        // Revert status on error
        setDocuments(prevDocs => 
          prevDocs.map(doc => 
            doc.id === docId 
              ? { ...doc, status: 'error' as const }
              : doc
          )
        )
        throw new Error('User not authenticated')
      }

      // Call backend API to analyze document
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      console.log('Calling backend:', `${backendUrl}/analyze`)
      
      const response = await fetch(`${backendUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          document_id: docId
        })
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
        console.error('Backend error:', errorData)
        // Revert status on error
        setDocuments(prevDocs => 
          prevDocs.map(doc => 
            doc.id === docId 
              ? { ...doc, status: 'error' as const, error_message: errorData.detail || 'Analysis failed' }
              : doc
          )
        )
        throw new Error(errorData.detail || `Failed to start analysis: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Analysis started successfully:', result)

      // Reload documents list after a short delay to get the real status from backend
      setTimeout(() => {
        loadDocuments()
        setAnalyzingDocId(null)
      }, 1000)
    } catch (error: any) {
      console.error('Error starting analysis:', error)
      setAnalyzingDocId(null)
      // Status already reverted to error above
      alert(error.message || 'Failed to start analysis. Please try again.')
    }
  }, [loadDocuments, analyzingDocId])

  const deleteDocument = useCallback(async (docId: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this statement? This action cannot be undone.')) {
      return
    }

    try {
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('User not authenticated')
      }

      // Call backend API to delete document
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${backendUrl}/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(errorData.detail || `Failed to delete document: ${response.statusText}`)
      }

      // Reload documents list
      loadDocuments()
    } catch (error: any) {
      console.error('Error deleting document:', error)
      alert(error.message || 'Failed to delete document. Please try again.')
    }
  }, [loadDocuments])

  const openFileViewer = async (doc: BankDocument) => {
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

  const isCSVFile = (fileName: string): boolean => {
    return fileName.toLowerCase().endsWith('.csv')
  }

  const isPDFFile = (fileName: string): boolean => {
    return fileName.toLowerCase().endsWith('.pdf')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50 flex">
      <Sidebar />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 ml-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Bank Statements</h1>
          <p className="text-muted-foreground">
            Upload and manage your bank statements
          </p>
        </div>

        <Tabs defaultValue="list" className="space-y-6">
          <TabsList>
            <TabsTrigger value="list">My Statements</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

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
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-2 transition-all duration-300">
                        {getStatusIcon(doc.status)}
                        <span className={`text-xs transition-colors duration-300 ${
                          doc.status === 'processing' 
                            ? 'text-blue-600 font-medium' 
                            : doc.status === 'done' 
                            ? 'text-green-600' 
                            : doc.status === 'error' 
                            ? 'text-red-600' 
                            : 'text-muted-foreground'
                        }`}>
                          {getStatusText(doc.status)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {doc.status !== 'processing' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              console.log('Button clicked for document:', doc.id, 'Status:', doc.status)
                              analyzeDocument(doc.id)
                            }}
                            className="h-8"
                            disabled={analyzingDocId === doc.id}
                            title={doc.status === 'done' ? 'Re-analyze document' : 'Analyze document'}
                          >
                            {analyzingDocId === doc.id ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Starting...
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 mr-1" />
                                {doc.status === 'done' ? 'Re-analyze' : 'Analyze'}
                              </>
                            )}
                          </Button>
                        )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openFileViewer(doc)}
                            className="h-8"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteDocument(doc.id, doc.file_url)}
                          className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            {documents.filter(doc => doc.status === 'done' && doc.analysis_results).length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">No analysis available</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Upload and process a statement to see analysis results
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {documents
                  .filter(doc => doc.status === 'done' && doc.analysis_results)
                  .map((doc) => {
                    let analysis = null
                    try {
                      if (doc.analysis_results) {
                        analysis = typeof doc.analysis_results === 'string' 
                          ? JSON.parse(doc.analysis_results) 
                          : doc.analysis_results
                      }
                    } catch (e) {
                      console.error('Error parsing analysis_results:', e)
                      analysis = null
                    }
                    
                    if (!analysis) return null
                    
                    return (
                      <Card key={doc.id} className="overflow-hidden">
                        <CardHeader className="bg-blue-50 border-b">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg mb-1">{doc.file_name}</CardTitle>
                              <CardDescription>
                                Processed on {doc.processed_at 
                                  ? new Date(doc.processed_at).toLocaleString() 
                                  : 'Unknown date'}
                              </CardDescription>
                            </div>
                            <div className="flex items-center space-x-2">
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                              <span className="text-sm font-medium text-green-700">Analysis Complete</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          {/* Summary Statistics */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <Card>
                              <CardContent className="p-4">
                                <div className="text-sm text-muted-foreground mb-1">Total Transactions</div>
                                <div className="text-2xl font-bold text-gray-900">
                                  {analysis?.total_transactions || 0}
                                </div>
                              </CardContent>
                            </Card>
                            <Card className={analysis?.calculation_errors > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
                              <CardContent className="p-4">
                                <div className="text-sm text-muted-foreground mb-1">Calculation Errors</div>
                                <div className={`text-2xl font-bold ${analysis?.calculation_errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {analysis?.calculation_errors || 0}
                                </div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="p-4">
                                <div className="text-sm text-muted-foreground mb-1">Error Rate</div>
                                <div className="text-2xl font-bold text-gray-900">
                                  {analysis?.error_rate || 0}%
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Errors Details Table */}
                          {analysis?.errors_details && analysis.errors_details.length > 0 ? (
                            <div className="space-y-4">
                              <div className="flex items-center space-x-2">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                <h3 className="text-lg font-semibold text-gray-900">
                                  Transactions with Calculation Errors ({analysis.errors_details.length})
                                </h3>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                  <thead>
                                    <tr className="bg-gray-50 border-b">
                                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Service</th>
                                      <th className="text-right p-3 text-sm font-semibold text-gray-700">Volume</th>
                                      <th className="text-right p-3 text-sm font-semibold text-gray-700">Unit Price</th>
                                      <th className="text-right p-3 text-sm font-semibold text-gray-700">Expected Charge</th>
                                      <th className="text-right p-3 text-sm font-semibold text-gray-700">Actual Charge</th>
                                      <th className="text-right p-3 text-sm font-semibold text-red-600">Difference</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {analysis.errors_details.map((error: any, index: number) => (
                                      <tr key={index} className="border-b hover:bg-gray-50">
                                        <td className="p-3 text-sm text-gray-900">{error.service}</td>
                                        <td className="p-3 text-sm text-right text-gray-700">
                                          {error.volume?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 text-sm text-right text-gray-700">
                                          ${error.unit_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                        </td>
                                        <td className="p-3 text-sm text-right text-gray-700">
                                          ${error.expected_charge?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 text-sm text-right text-gray-700">
                                          ${error.actual_charge?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-3 text-sm text-right font-semibold text-red-600">
                                          ${error.difference?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                              <p className="text-lg font-medium text-gray-900 mb-2">No calculation errors found</p>
                              <p className="text-sm text-gray-500">
                                All transactions have correct calculations (Volume × Unit Price = Service Charge)
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })
                  .filter(Boolean)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <UploadStatement onUploadSuccess={loadDocuments} />
          </TabsContent>
        </Tabs>
      </main>

      {/* File Viewer Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => {
        setSelectedDoc(null)
        setPdfError(null)
      }}>
        <DialogContent className={`max-h-[90vh] flex flex-col p-0 ${
          selectedDoc && isCSVFile(selectedDoc.file_name) ? 'max-w-6xl' : 'max-w-4xl'
        }`}>
          {/* Fixed Header */}
          <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b bg-background relative">
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="pr-4 truncate">{selectedDoc?.file_name}</DialogTitle>
              {selectedDoc && !pdfError && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedDoc) {
                        window.open(selectedDoc.file_url, '_blank')
                      }
                    }}
                    className="h-8"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in new tab
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedDoc) {
                        const link = document.createElement('a')
                        link.href = selectedDoc.file_url
                        link.download = selectedDoc.file_name
                        link.click()
                      }
                    }}
                    className="h-8"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
            </div>
          </div>
          {/* Scrollable Content */}
          <div className="flex-1 overflow-auto px-6 py-4">
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
                ) : isCSVFile(selectedDoc.file_name) ? (
                  <CSVViewer fileUrl={selectedDoc.file_url} fileName={selectedDoc.file_name} />
                ) : isPDFFile(selectedDoc.file_name) ? (
                  <PDFViewer fileUrl={selectedDoc.file_url} fileName={selectedDoc.file_name} />
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground">Unsupported file type. Please download the file to view it.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

