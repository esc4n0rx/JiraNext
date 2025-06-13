// components/reports/ReportDetailDialog.tsx
"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/data-table'
import { useDashboard } from '@/contexts/DashboardContext'
import { ExtractedData } from '@/types/dashboard'
import { Download, Search, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export-to-excel'

interface ReportDetailDialogProps {
  reportId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportDetailDialog({ reportId, open, onOpenChange }: ReportDetailDialogProps) {
  const { getReportData } = useDashboard()
  const [data, setData] = useState<ExtractedData[]>([])
  const [filteredData, setFilteredData] = useState<ExtractedData[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (reportId && open) {
      loadReportData()
    }
  }, [reportId, open])

  useEffect(() => {
    if (searchTerm) {
      const filtered = data.filter(item =>
        Object.values(item).some(value =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
      setFilteredData(filtered)
    } else {
      setFilteredData(data)
    }
  }, [searchTerm, data])

  const loadReportData = async () => {
    if (!reportId) return
    
    setLoading(true)
    try {
      const reportData = await getReportData(reportId)
      setData(reportData)
      setFilteredData(reportData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados do relatório')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (filteredData.length === 0) {
      toast.error('Não há dados para exportar')
      return
    }

    try {
      exportToExcel(
        filteredData.map(item => ({
          id: item.id ?? '',
          key: item.LOG ?? '',
          summary: "Chamados",
          status: item.Status?? '',
          assignee: item.Loja ?? '',
          created: item['Data de Criação'] ?? '',
          updated: item['Data de Criação'] ?? ''
        })),
        `relatorio-detalhado-${new Date().toISOString().split('T')[0]}`
      )
      toast.success('Relatório exportado com sucesso!')
    } catch (error) {
      toast.error('Erro ao exportar relatório')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Detalhes do Relatório</DialogTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filteredData.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Filtros */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar em todos os campos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Filter className="h-4 w-4" />
              <span>{filteredData.length} de {data.length} registros</span>
            </div>
          </motion.div>

          {/* Tabela */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
                />
              </div>
            ) : (
              <DataTable
                data={filteredData.map(item => ({
                  id: item.id ?? '',
                  key: item.LOG ?? '',
                  summary: "Chamados",
                  status: item.Status ?? '',
                  assignee: item.Loja ?? '',
                  created: item['Data de Criação'] ?? '',
                  updated: item['Data de Criação'] ?? '',
                  // add any other required JiraIssue fields here, using defaults or mapping as needed
                }))}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}