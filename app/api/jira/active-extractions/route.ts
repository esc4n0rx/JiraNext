// app/api/jira/active-extractions/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: extractions, error } = await supabase
      .from('extractions')
      .select('*')
      .in('status', ['processing', 'completed'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Erro ao buscar extrações:', error)
      return NextResponse.json([])
    }

    const formattedExtractions = extractions.map(ext => ({
      id: ext.id,
      status: ext.status,
      progress: ext.progress || 0,
      currentStep: ext.current_step || '',
      totalIssues: ext.total_issues,
      startDate: ext.start_date,
      endDate: ext.end_date,
      createdAt: ext.created_at,
      completedAt: ext.completed_at,
      errorMessage: ext.error_message,
      filePath: ext.file_path
    }))

    return NextResponse.json(formattedExtractions)
  } catch (error) {
    console.error('Erro ao buscar extrações ativas:', error)
    return NextResponse.json([])
  }
}