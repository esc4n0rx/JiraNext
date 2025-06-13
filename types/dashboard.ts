// types/dashboard.ts
export interface DashboardData {
  totalChamados: number
  statusChamados: Array<{
    status: string
    count: number
  }>
  chamadoMaisAntigo: {
    log: string
    dataCreation: string
  } | null
  materialMaiorDivergencia: {
    material: string
    count: number
  } | null
  lojaMaiorAbertura: {
    loja: string
    count: number
  } | null
  lastUpdate: string
}

export interface ExtractionReport {
  id: string
  date: string
  totalChamados: number
  startDate: string
  endDate: string
  status: 'completed' | 'processing' | 'error'
}

export interface ExtractedData {
  id: string
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