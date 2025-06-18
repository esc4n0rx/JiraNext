import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { processQualidadeIssue } from '@/lib/jira-utils';
import { JiraIssue } from '@/types/jira';

const QUALIDADE_JQL = 'project = LOG AND "Request Type" = "Qualidade (LOG)" AND "Centro de Distribuição - Central de Produção" = RJ ORDER BY priority ASC, "Tempo de resolução" ASC';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let extractionId: number | null = null;
      const sendProgress = (progress: number, step: string) => controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', progress, step })}\n\n`));

      try {
        const userId = '7ba72693-76cd-4d5c-ac54-b41a260f69cc';
        const { data: configuration, error: configError } = await supabaseAdmin.from('user_configurations').select('jira_domain, jira_email, jira_token').eq('user_id', userId).single();
        if (configError || !configuration) throw new Error(`Falha ao buscar configuração do Jira: ${configError?.message}`);
        if (!configuration.jira_domain || !configuration.jira_email || !configuration.jira_token) throw new Error('Credenciais do Jira estão incompletas.');

        sendProgress(0, 'Iniciando extração de Qualidade...');
        const now = new Date().toISOString();
        const { data: extraction, error: extractionError } = await supabaseAdmin.from('extractions').insert({ type: 'qualidade', status: 'processing', jql_query: QUALIDADE_JQL, start_date: now, end_date: now }).select('id').single();
        if (extractionError || !extraction) throw new Error(`Falha ao criar registro de extração: ${extractionError?.message}`);
        extractionId = extraction.id;

        const auth = Buffer.from(`${configuration.jira_email}:${configuration.jira_token}`).toString('base64');
        const headers = { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' };
        const allIssues: JiraIssue[] = [];
        let startAt = 0;
        let isLast = false;
        let totalIssues = 0;

        sendProgress(10, 'Buscando issues do Jira...');
        while (!isLast) {
          const searchUrl = `${configuration.jira_domain}/rest/api/2/search`;
          const body = JSON.stringify({
            jql: QUALIDADE_JQL,
            startAt,
            maxResults: 100,
            fields: ['key', 'created', 'status', 'customfield_10475', 'reporter', 'customfield_10169', 'customfield_11090', 'customfield_10315', 'customfield_11091', 'customfield_10329', 'customfield_11092', 'customfield_10346', 'customfield_11093', 'customfield_10347', 'customfield_11094', 'customfield_10348'],
          });
          const response = await fetch(searchUrl, { method: 'POST', headers, body });
          if (!response.ok) throw new Error(`Erro na API do Jira: ${response.statusText}`);
          const pageData = await response.json();
          if (startAt === 0) totalIssues = pageData.total;
          allIssues.push(...pageData.issues);
          startAt += pageData.issues.length;
          isLast = totalIssues === 0 ? true : startAt >= totalIssues;
          sendProgress(10 + (totalIssues > 0 ? (allIssues.length / totalIssues) * 40 : 40), `Buscando... ${allIssues.length}/${totalIssues} issues encontradas`);
        }
        
        sendProgress(50, `Processando ${allIssues.length} issues...`);
        const processedData = allIssues.flatMap(processQualidadeIssue);

        sendProgress(90, 'Salvando dados processados...');
        if (processedData.length > 0) {
            const dataToInsert = processedData.map(item => ({
                extraction_id: extractionId,
                log_key: item['Log'],
                criado_em: item['Criado em'], 
                status: item['Status'],   
                data_prox_inventario: item['Data Prox. Inventário'],
                reporter: item['Quem Abriu'],
                loja: item['Loja'],
                produto: item['Produto'],
                quantidade: item['Quantidade']
            }));
            const { error: insertError } = await supabaseAdmin.from('extraction_qualidade').insert(dataToInsert);
            if (insertError) throw new Error(`Falha ao salvar dados no banco: ${insertError.message}`);
        }

        await supabaseAdmin.from('extractions').update({ status: 'completed', total_issues: allIssues.length, completed_at: new Date().toISOString() }).eq('id', extractionId);

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', totalIssues: allIssues.length, downloadUrl: `/api/jira/qualidade/download/${extractionId}`, fileName: `qualidade_jira_${extractionId}.xlsx` })}\n\n`));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        if (extractionId) await supabaseAdmin.from('extractions').update({ status: 'error', error_message: errorMessage }).eq('id', extractionId);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: errorMessage })}\n\n`));
      } finally {
        controller.close();
      }
    }
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
}