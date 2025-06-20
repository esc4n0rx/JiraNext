// app/api/jira/jobs/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { jobQueue } from '@/lib/job-queue'

export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json()

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Tipo e dados são obrigatórios' },
        { status: 400 }
      )
    }

    const jobId = await jobQueue.createJob(type, data)

    return NextResponse.json({
      success: true,
      jobId
    })

  } catch (error) {
    console.error('Erro ao criar job:', error)
    return NextResponse.json(
      { error: 'Falha ao criar job de extração' },
      { status: 500 }
    )
  }
}