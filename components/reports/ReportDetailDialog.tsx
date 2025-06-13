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
import { useDashboard } from '@/contexts/DashboardContext'
import { ExtractedData } from '@/types/dashboard'
import { Download, Search, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export-to-excel'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'

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
      // Usar exatamente a mesma estrutura do Excel
      const excelData = filteredData.map(item => ({
        LOG: item.LOG,
        Status: item.Status,
        'Data de Criação': item['Data de Criação'],
        'Tipo de CD': item['Tipo de CD'],
        'Tipo de Divergencia': item['Tipo de Divergencia'],
        'Data de Recebimento': item['Data de Recebimento'],
        Loja: item.Loja,
        Categoria: item.Categoria,
        Material: item.Material,
        'Quantidade Cobrada': item['Quantidade Cobrada'],
        'Quantidade Recebida': item['Quantidade Recebida'],
        'Quantidade de KG cobrada': item['Quantidade de KG cobrada'],
        'Quantidade de KG recebida': item['Quantidade de KG recebida']
      }))

      // Criar planilha
      const XLSX = require('xlsx')
      const worksheet = XLSX.utils.json_to_sheet(excelData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados Jira')
      
      XLSX.writeFile(workbook, `relatorio-detalhado-${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Relatório exportado com sucesso!')
    } catch (error) {
      toast.error('Erro ao exportar relatório')
    }
  }

  // Colunas exatamente como no Excel
  const columns = [
    { key: 'LOG', label: 'LOG' },
    { key: 'Status', label: 'Status' },
    { key: 'Data de Criação', label: 'Data de Criação' },
    { key: 'Tipo de CD', label: 'Tipo de CD' },
    { key: 'Tipo de Divergencia', label: 'Tipo de Divergencia' },
    { key: 'Data de Recebimento', label: 'Data de Recebimento' },
    { key: 'Loja', label: 'Loja' },
    { key: 'Categoria', label: 'Categoria' },
    { key: 'Material', label: 'Material' },
    { key: 'Quantidade Cobrada', label: 'Quantidade Cobrada' },
    { key: 'Quantidade Recebida', label: 'Quantidade Recebida' },
    { key: 'Quantidade de KG cobrada', label: 'Quantidade de KG cobrada' },
    { key: 'Quantidade de KG recebida', label: 'Quantidade de KG recebida' }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Detalhes do Relatório - Visualização Excel</DialogTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filteredData.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
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

          {/* Tabela - Exatamente como o Excel */}
          <div className="flex-1 overflow-hidden border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
                />
              </div>
            ) : (
              <ScrollArea className="h-full w-full">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      {columns.map((column) => (
                        <TableHead key={column.key} className="whitespace-nowrap">
                          {column.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row, index) => (
                      <TableRow key={index}>
                        {columns.map((column) => (
                          <TableCell key={column.key} className="whitespace-nowrap">
                            {row[column.key as keyof ExtractedData] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredData.length === 0 && !loading && (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? 'Nenhum registro encontrado para o filtro aplicado' : 'Nenhum dado disponível'}
                  </div>
                )}
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}