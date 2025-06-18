// lib/jira-utils.ts
import { JiraIssue, ProcessedIssueData,AvariasProcessedData,QualidadeProcessedData, DevolucoesProcessedData} from '@/types/jira'

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

const AVARIAS_PRODUCT_FIELDS = {
  "customfield_11090": "customfield_10315", // Produto 1 -> Quantidade 1
  "customfield_11091": "customfield_10329", // Produto 2 -> Quantidade 2
  "customfield_11092": "customfield_10346", // Produto 3 -> Quantidade 3
  "customfield_11093": "customfield_10347", // Produto 4 -> Quantidade 4
  "customfield_11094": "customfield_10349", // Produto 5 -> Quantidade 5 (ID da quantidade para o produto 5 inferido)
};

const QUALIDADE_PRODUCT_FIELDS = {
  "customfield_11090": "customfield_10315", // Produto 1 -> Quantidade 1
  "customfield_11091": "customfield_10329", // Produto 2 -> Quantidade 2
  "customfield_11092": "customfield_10346", // Produto 3 -> Quantidade 3
  "customfield_11093": "customfield_10347", // Produto 4 -> Quantidade 4
  "customfield_11094": "customfield_10348", // Produto 5 -> Quantidade 5
};

/**
 * Processa um issue do Jira para o formato de Avarias.
 * Cria uma linha para cada produto encontrado no issue.
 */
export function processAvariasIssue(issue: JiraIssue): AvariasProcessedData[] {
  const processedData: AvariasProcessedData[] = [];

  const commonData = {
    'Chave Log': issue.key,
    'Criado em': issue.fields.created || 'N/A',
    'Status': issue.fields.status?.name || 'N/A',
    'Criado': issue.fields.customfield_10475 ? new Date(issue.fields.customfield_10475).toLocaleDateString('pt-BR') : '',
    'Quem Criou': issue.fields.reporter?.emailAddress || 'N/A',
    'Loja': safeGetFieldValue(issue.fields.customfield_10169),
    'Tipo de Avaria': safeGetFieldValue(issue.fields.customfield_10288),
  };

  for (const [productField, quantityField] of Object.entries(AVARIAS_PRODUCT_FIELDS)) {
    const productValue = issue.fields[productField];
    const quantityValue = issue.fields[quantityField];

    if (productValue && quantityValue) {
      processedData.push({
        ...commonData,
        'Produto': safeGetFieldValue(productValue),
        'Quantidade': safeGetFieldValue(quantityValue),
      });
    }
  }

  if (processedData.length === 0) {
      processedData.push({
        ...commonData,
        'Produto': 'Nenhum produto informado',
        'Quantidade': '0',
      });
  }

  return processedData;
}

/**
 * Processa um issue do Jira para o formato de Devoluções.
 */
export function processDevolucoesIssue(issue: JiraIssue): DevolucoesProcessedData {
  return {
    'Chave': issue.key,
    'Criado em': issue.fields.created || 'N/A',
    'Quem Abriu': issue.fields.reporter?.emailAddress || 'N/A',
    'Loja': safeGetFieldValue(issue.fields.customfield_10169),
    'Tipo': safeGetFieldValue(issue.fields.customfield_11218),
    'Status': issue.fields.status?.name || 'N/A',
  };
}


/**
 * Processa um issue do Jira para o formato de Qualidade.
 * Cria uma linha para cada produto encontrado no issue.
 */
export function processQualidadeIssue(issue: JiraIssue): QualidadeProcessedData[] {
  const processedData: QualidadeProcessedData[] = [];

  const commonData = {
    'Log': issue.key,
    'Criado em': issue.fields.created || 'N/A',
    'Status': issue.fields.status?.name || 'N/A',
    'Data Prox. Inventário': issue.fields.customfield_10475 ? new Date(issue.fields.customfield_10475).toLocaleDateString('pt-BR') : 'N/A',
    'Quem Abriu': issue.fields.reporter?.emailAddress || 'N/A',
    'Loja': safeGetFieldValue(issue.fields.customfield_10169),
  };

  let productsFound = 0;
  for (const [productField, quantityField] of Object.entries(QUALIDADE_PRODUCT_FIELDS)) {
    const productValue = issue.fields[productField];
    const quantityValue = issue.fields[quantityField];

    if (productValue) {
      productsFound++;
      processedData.push({
        ...commonData,
        'Produto': safeGetFieldValue(productValue),
        'Quantidade': safeGetFieldValue(quantityValue) || '0',
      });
    }
  }

  // Se nenhum produto foi encontrado no chamado, retorna uma linha única com os dados comuns.
  if (productsFound === 0) {
      processedData.push({
        ...commonData,
        'Produto': 'Nenhum produto informado',
        'Quantidade': '0',
      });
  }

  return processedData;
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