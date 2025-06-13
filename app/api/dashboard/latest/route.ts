// app/api/dashboard/latest/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Buscar dados da última extração
    const { data: latestExtraction, error: extractionError } = await supabase
      .from('extractions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (extractionError || !latestExtraction) {
      return NextResponse.json({
        totalChamados: 0,
        statusChamados: [],
        chamadoMaisAntigo: null,
        materialMaiorDivergencia: null,
        lojaMaiorAbertura: null,
        lastUpdate: new Date().toISOString()
      })
    }

    // Buscar dados da extração
    const { data: extractionData, error: dataError } = await supabase
      .from('extraction_data')
      .select('*')
      .eq('extraction_id', latestExtraction.id)

    if (dataError || !extractionData || extractionData.length === 0) {
      return NextResponse.json({
        totalChamados: 0,
        statusChamados: [],
        chamadoMaisAntigo: null,
        materialMaiorDivergencia: null,
        lojaMaiorAbertura: null,
        lastUpdate: latestExtraction.created_at
      })
    }

    // Processar dados para dashboard
    const uniqueLogs = [...new Set(extractionData.map(item => item.log_key))]
    const totalChamados = uniqueLogs.length

    // Status dos chamados (logs únicos por status)
    const statusMap = new Map<string, Set<string>>()
    extractionData.forEach(item => {
      if (item.status) {
        if (!statusMap.has(item.status)) {
          statusMap.set(item.status, new Set())
        }
        statusMap.get(item.status)!.add(item.log_key)
      }
    })

    const statusChamados = Array.from(statusMap.entries()).map(([status, logs]) => ({
      status,
      count: logs.size
    }))

    // Chamado mais antigo - APENAS status "Aguardando atendimento"
    let chamadoMaisAntigo = null
    const aguardandoAtendimento = extractionData.filter(item => 
      item.status === 'Aguardando atendimento' && 
      item.created_date
    )

    console.log('Dados aguardando atendimento:', aguardandoAtendimento.map(item => ({
      log: item.log_key,
      date: item.created_date,
      status: item.status
    })))

    if (aguardandoAtendimento.length > 0) {
      // Ordenar por data de criação (mais antigo primeiro)
      const sortedByDate = aguardandoAtendimento.sort((a, b) => {
        const dateA = new Date(a.created_date!)
        const dateB = new Date(b.created_date!)
        return dateA.getTime() - dateB.getTime()
      })
      
      console.log('Chamado mais antigo encontrado:', {
        log: sortedByDate[0].log_key,
        date: sortedByDate[0].created_date
      })
      
      chamadoMaisAntigo = {
        log: sortedByDate[0].log_key,
        dataCreation: sortedByDate[0].created_date
      }
    }

    // Material com maior divergência
    const materialCount = new Map<string, number>()
    extractionData.forEach(item => {
      if (item.material && item.material.trim()) {
        materialCount.set(item.material, (materialCount.get(item.material) || 0) + 1)
      }
    })

    let materialMaiorDivergencia = null
    if (materialCount.size > 0) {
      const [material, count] = Array.from(materialCount.entries())
        .sort(([,a], [,b]) => b - a)[0]
      materialMaiorDivergencia = { material, count }
    }

    // Loja com maior abertura (logs únicos por loja)
    const lojaLogMap = new Map<string, Set<string>>()
    extractionData.forEach(item => {
      if (item.loja && item.loja.trim()) {
        if (!lojaLogMap.has(item.loja)) {
          lojaLogMap.set(item.loja, new Set())
        }
        lojaLogMap.get(item.loja)!.add(item.log_key)
      }
    })

    let lojaMaiorAbertura = null
    if (lojaLogMap.size > 0) {
      const [loja, logs] = Array.from(lojaLogMap.entries())
        .sort(([,a], [,b]) => b.size - a.size)[0]
      lojaMaiorAbertura = { loja, count: logs.size }
    }

    const dashboardData = {
      totalChamados,
      statusChamados,
      chamadoMaisAntigo,
      materialMaiorDivergencia,
      lojaMaiorAbertura,
      lastUpdate: latestExtraction.created_at
    }

    console.log('Dashboard data retornado:', dashboardData)

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}