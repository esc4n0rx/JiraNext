// app/api/jira/extract/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { processJiraIssue, reorganizeData } from '@/lib/jira-utils'
import { JiraIssue, ProcessedIssueData } from '@/types/jira'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

export async function POST(request: NextRequest) {
  try {
    const { startDate, endDate, configuration } = await request.json()

    if (!startDate || !endDate || !configuration) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios não fornecidos' },
        { status: 400 }
      )
    }

    // Criar registro de extração
    const { data: extraction, error: extractionError } = await supabase
      .from('jira_extractions')
      .insert({
        start_date: startDate,
        end_date: endDate,
        status: 'processing'
      })
      .select()
      .single()

    if (extractionError) {
      console.error('Erro ao criar registro:', extractionError)
    }

    // Construir JQL
    const jql = `project=LOG AND created>="${startDate}" AND created<="${endDate}"`
    const baseUrl = `${configuration.jira_url}/rest/api/2/search`
    
    // Configurar autenticação
    const auth = Buffer.from(`${configuration.jira_email}:${configuration.jira_token}`).toString('base64')
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
      `${baseUrl}?jql=${encodeURIComponent(jql)}&maxResults=${configuration.max_results}&startAt=0`,
      { headers }
    )

    if (!firstResponse.ok) {
      throw new Error(`Erro na API do Jira: ${firstResponse.status}`)
    }

    const firstData = await firstResponse.json()
    totalIssues = firstData.total
    allIssues.push(...firstData.issues)

    // Buscar páginas restantes
    const totalPages = Math.ceil(totalIssues / configuration.max_results)
    for (let page = 1; page < totalPages; page++) {
      startAt = page * configuration.max_results
      
      const response = await fetch(
        `${baseUrl}?jql=${encodeURIComponent(jql)}&maxResults=${configuration.max_results}&startAt=${startAt}`,
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

   // Atualizar registro de extração se foi criado
   if (extraction) {
     await supabase
       .from('jira_extractions')
       .update({
         total_issues: totalIssues,
         status: 'completed',
         completed_at: new Date().toISOString(),
         file_path: `jira-extraction-${extraction.id}.xlsx`
       })
       .eq('id', extraction.id)
   }

   // Retornar arquivo
   const fileName = `base_jira_ajustada_${startDate}_${endDate}.xlsx`
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