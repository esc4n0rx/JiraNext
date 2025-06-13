// app/api/jira/status/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Aguardar params antes de usar
    const { id } = await params

    // Buscar extração
    const { data: extraction, error } = await supabase
      .from('extractions')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !extraction) {
      return NextResponse.json(
        { error: 'Extração não encontrada' },
        { status: 404 }
      )
    }

    // Retornar status da extração
    const response = {
      id: extraction.id,
      status: extraction.status,
      progress: extraction.progress || 0,
      currentStep: extraction.current_step || '',
      totalIssues: extraction.total_issues,
      startDate: extraction.start_date,
      endDate: extraction.end_date,
      createdAt: extraction.created_at,
      completedAt: extraction.completed_at,
      errorMessage: extraction.error_message,
      filePath: extraction.file_path
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Erro ao buscar status da extração:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}