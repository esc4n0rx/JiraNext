// app/api/jira/avarias/extract/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { jobQueue } from '@/lib/job-queue'

export async function POST(request: NextRequest) {
  try {
    const { configuration, jql } = await request.json()

    const jobId = await jobQueue.createJob('avarias', {
      configuration,
      jql
    })

    // Disparar processamento assíncrono
    fetch('/api/jira/jobs/process', { method: 'POST' })
      .catch(error => console.error('Erro ao disparar processamento:', error))

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Extração de avarias iniciada'
    })

  } catch (error) {
    console.error('Erro ao iniciar extração de avarias:', error)
    return NextResponse.json(
      { error: 'Falha ao iniciar extração de avarias' },
      { status: 500 }
    )
  }
}