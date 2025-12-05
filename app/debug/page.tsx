'use client'

export default function DebugPage() {
  // These will be replaced at build time by Next.js
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Debug - Environment Variables</h1>
        
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">NEXT_PUBLIC_SUPABASE_URL</h2>
            <div className="bg-gray-100 p-3 rounded font-mono text-sm break-all">
              {supabaseUrl || (
                <span className="text-red-600 font-bold">❌ MISSING</span>
              )}
            </div>
            {supabaseUrl && (
              <p className="text-green-600 text-sm mt-1">✅ Present</p>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">NEXT_PUBLIC_SUPABASE_ANON_KEY</h2>
            <div className="bg-gray-100 p-3 rounded font-mono text-sm break-all">
              {supabaseKey ? (
                <>
                  {supabaseKey.substring(0, 20)}...
                  <span className="text-gray-500"> (truncated for security)</span>
                </>
              ) : (
                <span className="text-red-600 font-bold">❌ MISSING</span>
              )}
            </div>
            {supabaseKey && (
              <p className="text-green-600 text-sm mt-1">✅ Present ({supabaseKey.length} characters)</p>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">NEXT_PUBLIC_API_URL</h2>
            <div className="bg-gray-100 p-3 rounded font-mono text-sm break-all">
              {apiUrl || (
                <span className="text-red-600 font-bold">❌ MISSING</span>
              )}
            </div>
            {apiUrl && (
              <p className="text-green-600 text-sm mt-1">✅ Present</p>
            )}
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">💡 Note</h3>
          <p className="text-sm text-gray-700">
            Ces variables sont injectées au moment du build par Next.js. 
            Si elles affichent "MISSING", vérifiez qu'elles sont bien configurées sur Vercel et redéployez.
          </p>
        </div>

        <div className="mt-4">
          <a 
            href="/" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  )
}

