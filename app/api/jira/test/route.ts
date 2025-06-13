
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { domain, email, token } = await request.json()

    if (!domain || !email || !token) {
      return NextResponse.json(
        { error: 'Domínio, email e token são obrigatórios' },
        { status: 400 }
      )
    }

    // Fazer uma requisição simples para testar a conexão
    const testUrl = `${domain}/rest/api/3/myself`
    const auth = Buffer.from(`${email}:${token}`).toString('base64')

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const userData = await response.json()
      return NextResponse.json({
        success: true,
        message: 'Conexão testada com sucesso!',
        user: {
          displayName: userData.displayName,
          emailAddress: userData.emailAddress
        }
      })
    } else {
      return NextResponse.json(
        { error: 'Falha na autenticação com o Jira' },
        { status: 401 }
      )
    }

  } catch (error) {
    console.error('Erro ao testar conexão:', error)
    return NextResponse.json(
      { error: 'Erro ao conectar com o Jira' },
      { status: 500 }
    )
  }
}