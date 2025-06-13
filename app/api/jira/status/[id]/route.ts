// app/api/jira/download-extraction/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Buscar extração
    const { data: extraction, error } = await supabase
      .from('extractions')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !extraction) {
      return NextResponse.json(
        { error: 'Extração não encontrada' },
        { status: 404 }
      )
    }

    if (extraction.status !== 'completed') {
      return NextResponse.json(
        { error: 'Extração ainda não foi concluída' },
        { status: 400 }
      )
    }

    // Buscar dados da extração
    const { data: extractionData, error: dataError } = await supabase
      .from('extraction_data')
      .select('*')
      .eq('extraction_id', params.id)
      .order('log_key', { ascending: true })

    if (dataError) {
      return NextResponse.json(
        { error: 'Erro ao buscar dados da extração' },
        { status: 500 }
      )
    }

    // Converter para formato Excel
    const excelData = extractionData.map(item => ({
      LOG: item.log_key,
      Status: item.status,
      'Data de Criação': item.created_date ? new Date(item.created_date).toLocaleDateString('pt-BR') : '',
      'Tipo de CD': item.tipo_cd,
      'Tipo de Divergencia': item.tipo_divergencia,
      'Data de Recebimento': item.data_recebimento ? new Date(item.data_recebimento).toLocaleDateString('pt-BR') : '',
      Loja: item.loja,
      Categoria: item.categoria,
      Material: item.material,
      'Quantidade Cobrada': item.quantidade_cobrada,
      'Quantidade Recebida': item.quantidade_recebida,
      'Quantidade de KG cobrada': item.quantidade_kg_cobrada,
      'Quantidade de KG recebida': item.quantidade_kg_recebida
    }))

    // Gerar arquivo Excel
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados Jira')
    
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    const fileName = `base_jira_ajustada_${extraction.start_date}_${extraction.end_date}.xlsx`
    
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`
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