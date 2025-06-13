// app/api/dashboard/reports/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: extractions, error } = await supabase
      .from('extractions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Erro ao buscar extrações:', error)
      return NextResponse.json([])
    }

    const reports = extractions.map(extraction => ({
      id: extraction.id.toString(),
      date: extraction.created_at,
      totalChamados: extraction.total_issues,
      startDate: extraction.start_date,
      endDate: extraction.end_date,
      status: extraction.status
    }))

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Erro ao buscar relatórios:', error)
    return NextResponse.json([])
  }
}