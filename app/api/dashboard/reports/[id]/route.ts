// app/api/dashboard/reports/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Aguardar params antes de usar
    const { id } = await params

    const { data: extractionData, error } = await supabase
      .from('extraction_data')
      .select('*')
      .eq('extraction_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar dados da extração:', error)
      return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
    }

    // Converter para formato esperado pelo frontend
    const formattedData = extractionData.map(item => ({
      id: item.id,
      LOG: item.log_key,
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

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error('Erro ao buscar dados do relatório:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}