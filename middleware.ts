import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Vérifier l'authentification basique
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Protected Area"',
      },
    })
  }

  // Décoder les credentials
  const base64Credentials = authHeader.split(' ')[1]
  const credentials = Buffer.from(base64Credentials, 'base64').toString()
  const [username, password] = credentials.split(':')

  // Vérifier les credentials (depuis les variables d'environnement)
  const validUsername = process.env.PROTECTION_USERNAME || 'admin'
  const validPassword = process.env.PROTECTION_PASSWORD || 'password'

  if (username === validUsername && password === validPassword) {
    return NextResponse.next()
  }

  // Invalid credentials - return 401 with WWW-Authenticate header to show popup again
  return new NextResponse('Invalid credentials', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Protected Area"',
    },
  })
}

export const config = {
  matcher: '/:path*',
}

