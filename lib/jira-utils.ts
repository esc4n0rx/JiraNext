// lib/jira-utils.ts
import { JiraIssue, ProcessedIssueData } from '@/types/jira'

export const CUSTOM_FIELD_NAMES = {
  // Embalagem
  "customfield_11070": "EMBALAGEM 1",
  "customfield_11071": "EMBALAGEM 2", 
  "customfield_11072": "EMBALAGEM 3",
  "customfield_11073": "EMBALAGEM 4",
  "customfield_11074": "EMBALAGEM 5",
  
  // FLV
  "customfield_11075": "FLV 1",
  "customfield_11076": "FLV 2",
  "customfield_11077": "FLV 3", 
  "customfield_11078": "FLV 4",
  "customfield_11079": "FLV 5",
  
  // Mercearia
  "customfield_11080": "MERCEARIA 1",
  "customfield_11081": "MERCEARIA 2",
  "customfield_11082": "MERCEARIA 3",
  "customfield_11083": "MERCEARIA 4", 
  "customfield_11084": "MERCEARIA 5",
  
  // Perecíveis
  "customfield_11085": "PERECIVEIS 1",
  "customfield_11086": "PERECIVEIS 2",
  "customfield_11087": "PERECIVEIS 3",
  "customfield_11088": "PERECIVEIS 4",
  "customfield_11089": "PERECIVEIS 5",
  
  // Produção
  "customfield_11090": "PRODUCAO 1",
  "customfield_11091": "PRODUCAO 2", 
  "customfield_11092": "PRODUCAO 3",
  "customfield_11093": "PRODUCAO 4",
  "customfield_11094": "PRODUCAO 5"
}

export function safeGetFieldValue(field: any): string {
  if (typeof field === 'object' && field !== null) {
    return field.value || ""
  }
  return field !== null && field !== undefined ? String(field) : ""
}

export function processJiraIssue(issue: JiraIssue): ProcessedIssueData[] {
  const processedData: ProcessedIssueData[] = []
  
  const createdDate = issue.fields.created 
    ? new Date(issue.fields.created).toLocaleDateString('pt-BR')
    : ""

  const basicInfo = {
    LOG: issue.key,
    Status: issue.fields.status?.name || "",
    'Data de Criação': createdDate,
    'Tipo de CD': safeGetFieldValue(issue.fields.customfield_10466),
    'Tipo de Divergencia': safeGetFieldValue(issue.fields.customfield_10300),
    'Data de Recebimento': safeGetFieldValue(issue.fields.customfield_10433),
    Loja: safeGetFieldValue(issue.fields.customfield_10169)
  }

  // Processar cada categoria de material
  Object.entries(CUSTOM_FIELD_NAMES).forEach(([fieldId, categoryName]) => {
    const materialValue = issue.fields[fieldId]
    
    if (materialValue !== null && materialValue !== undefined) {
      // Determinar qual produto (1-5) baseado no nome da categoria
      const productNumber = categoryName.split(' ')[1]
      
      const productData: ProcessedIssueData = {
        ...basicInfo,
        Categoria: categoryName,
        Material: safeGetFieldValue(materialValue),
        'Quantidade Cobrada': safeGetFieldValue(issue.fields[`customfield_1031${productNumber === '1' ? '4' : productNumber === '2' ? '8' : productNumber === '3' ? '40' : productNumber === '4' ? '42' : '44'}`]),
        'Quantidade Recebida': safeGetFieldValue(issue.fields[`customfield_1031${productNumber === '1' ? '5' : productNumber === '2' ? '9' : productNumber === '3' ? '46' : productNumber === '4' ? '47' : '48'}`]),
        'Quantidade de KG cobrada': safeGetFieldValue(issue.fields[`customfield_1041${productNumber === '1' ? '7' : productNumber === '2' ? '8' : productNumber === '3' ? '20' : productNumber === '4' ? '21' : '22'}`]),
        'Quantidade de KG recebida': safeGetFieldValue(issue.fields[`customfield_1042${productNumber === '1' ? '3' : productNumber === '2' ? '4' : productNumber === '3' ? '25' : productNumber === '4' ? '26' : '27'}`])
      }
      
      processedData.push(productData)
    }
  })

  return processedData
}

export function reorganizeData(data: ProcessedIssueData[]): ProcessedIssueData[] {
  const reorganizedData: ProcessedIssueData[] = []
  
  // Agrupar por LOG
  const groupedByLog = data.reduce((acc, item) => {
    if (!acc[item.LOG]) {
      acc[item.LOG] = []
    }
    acc[item.LOG].push(item)
    return acc
  }, {} as Record<string, ProcessedIssueData[]>)

  // Reorganizar cada grupo
  Object.values(groupedByLog).forEach(logGroup => {
    logGroup.forEach(item => {
      // Só adicionar se tiver quantidade
      if (item['Quantidade Cobrada'] || item['Quantidade Recebida'] || 
          item['Quantidade de KG cobrada'] || item['Quantidade de KG recebida']) {
        reorganizedData.push(item)
      }
    })
  })

  return reorganizedData
}