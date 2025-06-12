import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { fromDate, toDate, token, domain, apiPath } = await request.json()

    if (!token || !domain || !fromDate || !toDate) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
    }

    const jql = `created >= "${fromDate}" AND created <= "${toDate}" ORDER BY created DESC`

    const response = await fetch(`${domain}${apiPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${token}`,
      },
      body: JSON.stringify({
        jql,
        maxResults: 100,
        fields: ["summary", "status", "assignee", "created", "updated"],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Erro na API do Jira:", errorText)
      return NextResponse.json({ error: `Erro na API do Jira: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()

    // Transformar os dados para o formato esperado pelo frontend
    const issues = data.issues.map((issue: any) => ({
      id: issue.id,
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status?.name || "Sem status",
      assignee: issue.fields.assignee?.displayName || "Não atribuído",
      created: issue.fields.created,
      updated: issue.fields.updated,
    }))

    return NextResponse.json(issues)
  } catch (error) {
    console.error("Erro ao processar requisição:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
