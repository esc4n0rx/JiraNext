// app/api/jira/download-extraction/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Aguardar params antes de usar
    const { id } = await params

    // Buscar dados da extração
    const { data: extractionData, error } = await supabase
      .from('extraction_data')
      .select('*')
      .eq('extraction_id', id)
      .order('log_key', { ascending: true })

    if (error) {
      console.error('Erro ao buscar dados da extração:', error)
      return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
    }

    if (!extractionData || extractionData.length === 0) {
      return NextResponse.json({ error: 'Nenhum dado encontrado' }, { status: 404 })
    }

    // Converter para formato Excel
    const excelData = extractionData.map(item => ({
      LOG: item.log_key || '',
      Status: item.status || '',
      'Data de Criação': item.created_date || '',
      'Tipo de CD': item.tipo_cd || '',
      'Tipo de Divergencia': item.tipo_divergencia || '',
      'Data de Recebimento': item.data_recebimento || '',
      Loja: item.loja || '',
      Categoria: item.categoria || '',
      Material: item.material || '',
      'Quantidade Cobrada': item.quantidade_cobrada || '',
      'Quantidade Recebida': item.quantidade_recebida || '',
      'Quantidade de KG cobrada': item.quantidade_kg_cobrada || '',
      'Quantidade de KG recebida': item.quantidade_kg_recebida || ''
    }))

    // Gerar arquivo Excel
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados Jira')
    
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="base_jira_ajustada_${id}.xlsx"`
      }
    })

  } catch (error) {
    console.error('Erro ao gerar arquivo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}