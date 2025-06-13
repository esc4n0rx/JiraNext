import * as XLSX from "xlsx"
import type { JiraIssue } from "@/types/jira"

export function exportToExcel(data: JiraIssue[], filename: string) {
  // Preparar os dados para exportação
  const exportData = data.map((item) => ({
    Chave: item.key,
    Resumo: item.fields,
    Status: item.status,
    Responsável: "Jira",
    "Data de Criação": item.created,
    "Última Atualização": item.created,
  }))

  // Criar uma planilha
  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Dados")

  // Exportar para Excel
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
