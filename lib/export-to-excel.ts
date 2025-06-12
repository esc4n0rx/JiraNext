import * as XLSX from "xlsx"
import type { JiraIssue } from "@/components/main-card"

export function exportToExcel(data: JiraIssue[], filename: string) {
  // Preparar os dados para exportação
  const exportData = data.map((item) => ({
    Chave: item.key,
    Resumo: item.summary,
    Status: item.status,
    Responsável: item.assignee,
    "Data de Criação": item.created,
    "Última Atualização": item.updated,
  }))

  // Criar uma planilha
  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Dados")

  // Exportar para Excel
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
