import type { JiraIssue } from "@/components/main-card"

// Função para gerar uma data aleatória entre duas datas
function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

// Função para formatar data para ISO string
function formatDateToISO(date: Date) {
  return date.toISOString()
}

// Status possíveis
const statuses = ["Em Andamento", "Concluído", "Aguardando Revisão", "Bloqueado", "Backlog"]

// Responsáveis possíveis
const assignees = ["João Silva", "Maria Oliveira", "Carlos Santos", "Ana Pereira", "Pedro Costa", "Não atribuído"]

// Gerar dados mockup
export const mockJiraData: JiraIssue[] = Array.from({ length: 50 }, (_, i) => {
  const created = randomDate(new Date(2023, 0, 1), new Date())
  const updated = randomDate(created, new Date())

  return {
    id: `ID-${i + 1000}`,
    key: `PROJ-${i + 100}`,
    summary: `Tarefa ${i + 1}: ${
      [
        "Implementar funcionalidade de login",
        "Corrigir bug na página de checkout",
        "Melhorar performance da API",
        "Atualizar documentação",
        "Revisar pull request",
        "Adicionar testes unitários",
        "Refatorar componente de dashboard",
        "Investigar problema de segurança",
        "Otimizar consulta SQL",
        "Implementar novo design",
      ][i % 10]
    }`,
    status: statuses[i % statuses.length],
    assignee: assignees[i % assignees.length],
    created: formatDateToISO(created),
    updated: formatDateToISO(updated),
  }
})
