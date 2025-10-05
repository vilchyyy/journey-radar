import { NextRequest, NextResponse } from 'next/server'

// Simple dispatcher authentication for development
// In production, this should be replaced with proper authentication (JWT, OAuth, etc.)
export interface DispatcherAuth {
  dispatcherId: string
  role: 'DISPATCHER' | 'ADMIN'
  permissions: string[]
}

// Mock dispatcher credentials for development
const MOCK_DISPATCHERS = {
  'dispatcher-001': {
    id: 'dispatcher-001',
    role: 'DISPATCHER' as const,
    permissions: ['create_incident', 'update_incident', 'view_incidents']
  },
  'dispatcher-admin': {
    id: 'dispatcher-admin',
    role: 'ADMIN' as const,
    permissions: ['create_incident', 'update_incident', 'delete_incident', 'view_incidents', 'manage_dispatchers']
  }
}

export function verifyDispatcherAuth(request: NextRequest): DispatcherAuth | null {
  // Get authorization header
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)

  // In development, accept simple token
  if (token === 'dispatcher-token-dev') {
    return MOCK_DISPATCHERS['dispatcher-001']
  }

  if (token === 'dispatcher-admin-token') {
    return MOCK_DISPATCHERS['dispatcher-admin']
  }

  // Check if token matches any mock dispatcher
  if (MOCK_DISPATCHERS[token as keyof typeof MOCK_DISPATCHERS]) {
    return MOCK_DISPATCHERS[token as keyof typeof MOCK_DISPATCHERS]
  }

  return null
}

export function requirePermission(auth: DispatcherAuth, permission: string): boolean {
  return auth.permissions.includes(permission)
}

export function requireRole(auth: DispatcherAuth, role: 'DISPATCHER' | 'ADMIN'): boolean {
  return auth.role === role
}

// Middleware to protect dispatcher endpoints
export function withDispatcherAuth(
  handler: (request: NextRequest, auth: DispatcherAuth, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]) => {
    const auth = verifyDispatcherAuth(request)

    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid or missing authentication' },
        { status: 401 }
      )
    }

    return handler(request, auth, ...args)
  }
}

// Error responses for common auth issues
export const AUTH_ERRORS = {
  UNAUTHORIZED: {
    success: false,
    error: 'Unauthorized - Invalid or missing authentication'
  },
  FORBIDDEN: {
    success: false,
    error: 'Forbidden - Insufficient permissions'
  },
  INVALID_TOKEN: {
    success: false,
    error: 'Invalid authentication token'
  }
}