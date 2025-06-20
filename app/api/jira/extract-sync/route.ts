// app/api/jira/extract-sync/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { jobQueue } from '@/lib/job-queue'

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, configuration } = await request.json()

    if (!startDate || !endDate || !configuration) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios não fornecidos' },
        { status: 400 }
      )
    }

    // Criar job ao invés de processar diretamente
    const jobId = await jobQueue.createJob('divergencias', {
      startDate,
      endDate,
      configuration
    })

    // Disparar processamento assíncrono
    fetch('/api/jira/jobs/process', { method: 'POST' })
      .catch(error => console.error('Erro ao disparar processamento:', error))

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Extração iniciada. Use o jobId para acompanhar o progresso.'
    })

  } catch (error) {
    console.error('Erro ao iniciar extração:', error)
    return NextResponse.json(
      { error: 'Falha ao iniciar extração' },
      { status: 500 }
    )
  }
}