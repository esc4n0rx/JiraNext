// app/api/jira/qualidade/extract/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { jobQueue } from '@/lib/job-queue'

export async function POST(request: NextRequest) {
  try {
    const { configuration, jql } = await request.json()

    const jobId = await jobQueue.createJob('qualidade', {
      configuration,
      jql
    })

    // Disparar processamento assíncrono
    fetch('/api/jira/jobs/process', { method: 'POST' })
      .catch(error => console.error('Erro ao disparar processamento:', error))

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Extração de qualidade iniciada'
    })

  } catch (error) {
    console.error('Erro ao iniciar extração de qualidade:', error)
    return NextResponse.json(
      { error: 'Falha ao iniciar extração de qualidade' },
      { status: 500 }
    )
  }
}