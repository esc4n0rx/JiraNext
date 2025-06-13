
import { NextRequest, NextResponse } from 'next/server'
import { processJiraIssue, reorganizeData } from '@/lib/jira-utils'
import { JiraIssue, ProcessedIssueData } from '@/types/jira'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

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
      .from('extractions')
      .insert({
        start_date: startDate,
        end_date: endDate,
        status: 'processing'
      })
      .select()
      .single()

    if (extractionError) {
      console.error('Erro ao criar registro:', extractionError)
      return NextResponse.json(
        { error: 'Erro ao criar registro de extração' },
        { status: 500 }
      )
    }

    try {
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

      // Salvar dados processados no banco
      if (finalData.length > 0) {
        const dataToInsert = finalData.map(item => ({
          extraction_id: extraction.id,
          log_key: item.LOG || '',
          status: item.Status || '',
          created_date: item['Data de Criação'] ? parseDate(item['Data de Criação']) : null,
          tipo_cd: item['Tipo de CD'] || '',
          tipo_divergencia: item['Tipo de Divergencia'] || '',
          data_recebimento: item['Data de Recebimento'] ? parseDate(item['Data de Recebimento']) : null,
          loja: item.Loja || '',
          categoria: item.Categoria || '',
          material: item.Material || '',
          quantidade_cobrada: item['Quantidade Cobrada'] || '',
          quantidade_recebida: item['Quantidade Recebida'] || '',
          quantidade_kg_cobrada: item['Quantidade de KG cobrada'] || '',
          quantidade_kg_recebida: item['Quantidade de KG recebida'] || ''
        }))

        // Inserir dados em lotes para melhor performance
        const batchSize = 100
        for (let i = 0; i < dataToInsert.length; i += batchSize) {
          const batch = dataToInsert.slice(i, i + batchSize)
          
          const { error: insertError } = await supabase
            .from('extraction_data')
            .insert(batch)

          if (insertError) {
            console.error('Erro ao inserir lote de dados:', insertError)
            // Continuar mesmo com erro para não perder todo o trabalho
          }
        }
      }

      // Calcular logs únicos para estatística correta
      const uniqueLogs = [...new Set(finalData.map(item => item.LOG).filter(log => log))]

      // Atualizar registro de extração com sucesso
      await supabase
        .from('extractions')
        .update({
          total_issues: uniqueLogs.length,
          status: 'completed',
          completed_at: new Date().toISOString(),
          file_path: `jira-extraction-${extraction.id}.xlsx`
        })
        .eq('id', extraction.id)

      // Gerar arquivo Excel
      const worksheet = XLSX.utils.json_to_sheet(finalData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados Jira')
      
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

      // Retornar arquivo
      const fileName = `base_jira_ajustada_${startDate}_${endDate}.xlsx`
      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${fileName}"`
        }
      })

    } catch (jiraError) {
      console.error('Erro durante extração do Jira:', jiraError)
      
      // Atualizar registro de extração com erro
      await supabase
        .from('extractions')
        .update({
          status: 'error',
          completed_at: new Date().toISOString()
        })
        .eq('id', extraction.id)

      throw jiraError
    }

  } catch (error) {
    console.error('Erro ao extrair dados do Jira:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função auxiliar para converter strings de data para Date
function parseDate(dateString: string): Date | null {
  if (!dateString || dateString.trim() === '') return null
  
  try {
    // Tentar diferentes formatos de data
    const date = new Date(dateString)
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      // Tentar formato brasileiro DD/MM/YYYY
      const parts = dateString.split('/')
      if (parts.length === 3) {
        const [day, month, year] = parts
        const brDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        if (!isNaN(brDate.getTime())) {
          return brDate
        }
      }
      
      // Tentar formato ISO ou outros formatos
      const isoDate = new Date(dateString.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'))
      if (!isNaN(isoDate.getTime())) {
        return isoDate
      }
      
      return null
    }
    
    return date
  } catch (error) {
    console.error('Erro ao converter data:', dateString, error)
    return null
  }
}