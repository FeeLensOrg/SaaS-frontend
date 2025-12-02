'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, Loader2, CheckCircle2, XCircle } from 'lucide-react'

interface UploadStatementProps {
  onUploadSuccess?: () => void
}

export function UploadStatement({ onUploadSuccess }: UploadStatementProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Vérifier que c'est un PDF ou CSV
    const isPdf = file.type === 'application/pdf'
    const isCsv = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
    
    if (!isPdf && !isCsv) {
      setError('Please upload a PDF or CSV file')
      return
    }

    // Vérifier la taille (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(false)

    try {
      // Récupérer l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Générer un ID unique pour le document
      const documentId = crypto.randomUUID()
      const fileExtension = file.name.toLowerCase().endsWith('.csv') ? '.csv' : '.pdf'
      const filePath = `${user.id}/${documentId}${fileExtension}`

      // Déterminer le content-type correct
      let contentType = file.type
      if (!contentType || contentType === '') {
        // Si le navigateur ne détecte pas le type, le déterminer manuellement
        if (file.name.toLowerCase().endsWith('.csv')) {
          contentType = 'text/csv'
        } else if (file.name.toLowerCase().endsWith('.pdf')) {
          contentType = 'application/pdf'
        }
      }
      
      // Upload vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bank-statements')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: contentType || undefined
        })

      if (uploadError) throw uploadError

      // Pour un bucket privé, on stocke le chemin du fichier
      // L'URL signée sera générée à la volée lors de la visualisation
      const filePathForDb = filePath

      // Créer l'enregistrement dans la table documents
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          id: documentId,
          user_id: user.id,
          file_url: filePathForDb, // Stocker le chemin, pas l'URL
          file_name: file.name,
          status: 'pending'
        })

      if (dbError) throw dbError

      // Trigger async analysis via backend API
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
          // Fire and forget - don't wait for response
          fetch(`${backendUrl}/analyze`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              document_id: documentId
            })
          }).catch(error => {
            console.error('Error triggering analysis:', error)
            // Don't fail the upload if analysis trigger fails
          })
        }
      } catch (error) {
        console.error('Error triggering analysis:', error)
        // Don't fail the upload if analysis trigger fails
      }

      setSuccess(true)
      
      // Appeler le callback pour rafraîchir la liste
      if (onUploadSuccess) {
        setTimeout(() => {
          onUploadSuccess()
          setSuccess(false)
        }, 1500)
      } else {
        // Fallback: rafraîchir la page
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }

    } catch (error: any) {
      console.error('Upload error:', error)
      setError(error.message || 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }, [onUploadSuccess])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv']
    },
    maxFiles: 1,
    disabled: uploading
  })

  return (
    <Card>
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-all duration-200
            ${isDragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          {uploading ? (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              <p className="text-sm font-medium text-gray-700">Uploading...</p>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <p className="text-sm font-medium text-green-700">Upload successful!</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {isDragActive ? 'Drop your PDF here' : 'Drag & drop your bank statement'}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  or click to browse
                </p>
              </div>
              <p className="text-xs text-gray-400">
                PDF or CSV files only, max 50MB
              </p>
            </div>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

