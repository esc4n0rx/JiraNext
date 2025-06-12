"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { toast } from "sonner"
import { exportToExcel } from "@/lib/export-to-excel"
import { format } from "date-fns"
import type { JiraIssue } from "@/components/main-card"

interface ResultsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: JiraIssue[]
}

export function ResultsDialog({ open, onOpenChange, data }: ResultsDialogProps) {
  const handleExport = () => {
    if (data.length === 0) {
      toast.error("Não há dados para exportar")
      return
    }

    try {
      exportToExcel(data, `jira-data-${format(new Date(), "yyyy-MM-dd")}`)
      toast.success("Dados exportados com sucesso!")
    } catch (error) {
      toast.error("Erro ao exportar dados")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Resultados da Extração</DialogTitle>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar para Excel
          </Button>
        </DialogHeader>
        <div className="mt-4">
          <DataTable data={data} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
