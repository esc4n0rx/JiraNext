import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { data: extractions, error } = await supabase
      .from('jira_extractions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Erro ao buscar histórico:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar histórico' },
        { status: 500 }
      )
    }

    return NextResponse.json(extractions || [])
  } catch (error) {
    console.error('Erro ao buscar histórico:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}