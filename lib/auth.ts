import jwt from 'jsonwebtoken'

interface JWTPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}

export function createToken(payload: { userId: string; email: string }): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET não configurado')
  }

  return jwt.sign(payload, secret, {
    expiresIn: '7d',
    issuer: 'jira-extractor',
    audience: 'jira-extractor-users'
  })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET não configurado')
    }

    const decoded = jwt.verify(token, secret, {
      issuer: 'jira-extractor',
      audience: 'jira-extractor-users'
    }) as JWTPayload

    return decoded
  } catch (error) {
    console.error('Erro ao verificar token:', error)
    return null
  }
}

export function refreshToken(token: string): string | null {
  const payload = verifyToken(token)
  if (!payload) {
    return null
  }

  // Criar novo token com mesmos dados
  return createToken({
    userId: payload.userId,
    email: payload.email
  })
}

export function decodeTokenWithoutVerification(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload
    return decoded
  } catch (error) {
    console.error('Erro ao decodificar token:', error)
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeTokenWithoutVerification(token)
  if (!payload || !payload.exp) {
    return true
  }

  const currentTime = Math.floor(Date.now() / 1000)
  return payload.exp < currentTime
}