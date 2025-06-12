// app/api/jira/download/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Buscar extração
    const { data: extraction, error } = await supabaseAdmin
      .from('jira_extractions')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', decoded.userId)
      .single()

    if (error || !extraction) {
      return NextResponse.json(
        { error: 'Extração não encontrada' },
        { status: 404 }
      )
    }

    if (extraction.status !== 'completed' || !extraction.file_path) {
      return NextResponse.json(
        { error: 'Arquivo não disponível' },
        { status: 400 }
      )
    }

    // Para este exemplo, vamos retornar um arquivo mockado
    // Em produção, você salvaria os arquivos no Supabase Storage
    const mockData = [
      {
        LOG: 'LOG-001',
        Status: 'Concluído',
        'Data de Criação': '12/06/2025',
        'Tipo de CD': 'CD01',
        'Tipo de Divergencia': 'Quantidade',
        'Data de Recebimento': '11/06/2025',
        Loja: 'Loja 001',
        Categoria: 'EMBALAGEM 1',
        Material: 'Material Test',
        'Quantidade Cobrada': '100',
        'Quantidade Recebida': '95',
        'Quantidade de KG cobrada': '50',
        'Quantidade de KG recebida': '47.5'
      }
    ]

    // Gerar arquivo Excel
    const XLSX = require('xlsx')
    const worksheet = XLSX.utils.json_to_sheet(mockData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados Jira')
    
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${extraction.file_path}"`
      }
    })

  } catch (error) {
    console.error('Erro ao baixar arquivo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}