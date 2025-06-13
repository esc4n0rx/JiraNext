// app/api/jira/extract/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin' 
import { processJiraIssue, reorganizeData } from '@/lib/jira-utils'
import { JiraIssue, ProcessedIssueData } from '@/types/jira'
import * as XLSX from 'xlsx'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const { startDate, endDate } = await request.json()

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Data de início e fim são obrigatórias' },
        { status: 400 }
      )
    }

    // Buscar configuração do usuário
    const { data: config, error: configError } = await supabaseAdmin
      .from('user_configurations')
      .select('*')
      .eq('user_id', decoded.userId)
      .single()

    if (configError || !config) {
      return NextResponse.json(
        { error: 'Configuração do Jira não encontrada' },
        { status: 404 }
      )
    }

    // Criar registro de extração
    const { data: extraction, error: extractionError } = await supabaseAdmin
      .from('jira_extractions')
      .insert({
        user_id: decoded.userId,
        start_date: startDate,
        end_date: endDate,
        status: 'processing'
      })
      .select()
      .single()

    if (extractionError) {
      return NextResponse.json(
        { error: 'Erro ao criar registro de extração' },
        { status: 500 }
      )
    }

    // Construir JQL
    const jql = `project=LOG AND created>="${startDate}" AND created<="${endDate}"`
    const baseUrl = `${config.jira_url}/rest/api/2/search`
    
    // Configurar autenticação
    const auth = Buffer.from(`${config.jira_email}:${config.jira_token}`).toString('base64')
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }

    let allIssues: JiraIssue[] = []
    let startAt = 0
    let totalIssues = 0

    // Primeira requisição para obter total
    const firstResponse = await fetch(
      `${baseUrl}?jql=${encodeURIComponent(jql)}&maxResults=${config.max_results}&startAt=0`,
      { headers }
    )

    if (!firstResponse.ok) {
      throw new Error(`Erro na API do Jira: ${firstResponse.status}`)
    }

    const firstData = await firstResponse.json()
    totalIssues = firstData.total
    allIssues.push(...firstData.issues)

    // Buscar páginas restantes
    const totalPages = Math.ceil(totalIssues / config.max_results)
    for (let page = 1; page < totalPages; page++) {
      startAt = page * config.max_results
      
      const response = await fetch(
        `${baseUrl}?jql=${encodeURIComponent(jql)}&maxResults=${config.max_results}&startAt=${startAt}`,
        { headers }
      )

      if (!response.ok) {
        throw new Error(`Erro na API do Jira: ${response.status}`)
      }

      const data = await response.json()
      allIssues.push(...data.issues)
    }

    // Processar dados
    let processedData: ProcessedIssueData[] = []
    
    allIssues.forEach(issue => {
      const issueData = processJiraIssue(issue)
      processedData.push(...issueData)
    })

    // Reorganizar dados
    const finalData = reorganizeData(processedData)

    // Gerar arquivo Excel
    const worksheet = XLSX.utils.json_to_sheet(finalData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados Jira')
    
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Salvar no Supabase Storage (opcional)
    const fileName = `jira-extraction-${extraction.id}.xlsx`
    
    // Atualizar registro de extração
    await supabaseAdmin
      .from('jira_extractions')
      .update({
        total_issues: totalIssues,
        status: 'completed',
        completed_at: new Date().toISOString(),
        file_path: fileName
      })
      .eq('id', extraction.id)

    // Retornar arquivo
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    })

  } catch (error) {
    console.error('Erro ao extrair dados do Jira:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}