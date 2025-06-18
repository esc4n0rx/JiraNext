// types/jira.ts
export interface JiraConfiguration {
  id: string
  jira_email: string
  jira_token: string
  jira_url: string
  max_results: number
  created_at: string
  updated_at: string
}

export interface JiraExtraction {
  id: number
  start_date: string
  end_date: string
  total_issues?: number
  status: 'processing' | 'completed' | 'error'
  file_path?: string
  created_at: string
  completed_at?: string
}

export interface JiraIssue {
  key: string
  status: string
  created: string
  fields: {
    [key: string]: any
  }
}

export interface ProcessedIssueData {
  LOG: string
  Status: string
  'Data de Criação': string
  'Tipo de CD': string
  'Tipo de Divergencia': string
  'Data de Recebimento': string
  Loja: string
  Categoria: string
  Material: string
  'Quantidade Cobrada': string
  'Quantidade Recebida': string
  'Quantidade de KG cobrada': string
  'Quantidade de KG recebida': string
}

export interface AvariasProcessedData {
  'Chave Log': string;
  'Criado': string;
  'Criado em': string;
  'Status': string;
  'Quem Criou': string;
  'Loja': string;
  'Produto': string;
  'Quantidade': string;
  'Tipo de Avaria': string;
}

export interface QualidadeProcessedData {
  'Log': string;
  'Criado em': string;
  'Status': string;
  'Data Prox. Inventário': string;
  'Quem Abriu': string;
  'Loja': string;
  'Produto': string;
  'Quantidade': string;
}

export interface DevolucoesProcessedData {
  'Chave': string;
  'Criado em': string;
  'Quem Abriu': string;
  'Loja': string;
  'Tipo': string;
  'Status': string;
}