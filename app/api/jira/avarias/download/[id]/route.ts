// app/api/jira/avarias/download/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { data, error } = await supabase.from('extraction_avarias').select('*').eq('extraction_id', id);
    if (error) throw error;
    if (!data || data.length === 0) return NextResponse.json({ error: 'Nenhum dado encontrado para esta extração.' }, { status: 404 });

    const excelData = data.map(item => ({
      'Chave Log': item.log_key,
      'Criado em': item.criado_em ? new Date(item.criado_em).toLocaleString('pt-BR') : '', // Novo campo
      'Status': item.status, // Novo campo
      'Data Avaria': item.created_date,
      'Quem Criou': item.reporter,
      'Loja': item.loja,
      'Produto': item.produto,
      'Quantidade': item.quantidade,
      'Tipo de Avaria': item.tipo_avaria,
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Avarias');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="relatorio_avarias_${id}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}