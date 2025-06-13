// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Log das requisições para debug
  console.log(`${request.method} ${request.url}`)
  
  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*'
}