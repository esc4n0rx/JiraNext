// components/reports/ReportsSection.tsx
"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDashboard } from '@/contexts/DashboardContext'
import { ReportDetailDialog } from './ReportDetailDialog'
import { FileText, Calendar, Download, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ReportsSection() {
  const { extractionReports, loading } = useDashboard()
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (extractionReports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relatórios de Extração</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum relatório disponível</h3>
          <p className="text-gray-500">Execute uma extração para ver os relatórios</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Relatórios de Extração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {extractionReports.map((report, index) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                   <Calendar className="h-4 w-4 text-blue-500" />
                   <span className="font-medium">
                     {format(new Date(report.date), 'dd/MM/yyyy', { locale: ptBR })}
                   </span>
                   <Badge 
                     variant={report.status === 'completed' ? 'default' : 
                              report.status === 'processing' ? 'secondary' : 'destructive'}
                   >
                     {report.status === 'completed' ? 'Concluído' : 
                      report.status === 'processing' ? 'Processando' : 'Erro'}
                   </Badge>
                 </div>
                 
                 <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                   <span>{report.totalChamados} chamados extraídos</span>
                   <span>
                     {format(new Date(report.startDate), 'dd/MM/yyyy', { locale: ptBR })} - {' '}
                     {format(new Date(report.endDate), 'dd/MM/yyyy', { locale: ptBR })}
                   </span>
                 </div>
               </div>

               <div className="flex space-x-2">
                 <Button
                   size="sm"
                   variant="outline"
                   onClick={() => setSelectedReportId(report.id)}
                   disabled={report.status !== 'completed'}
                 >
                   <Eye className="h-4 w-4 mr-1" />
                   Ver Detalhes
                 </Button>
                 <Button
                   size="sm"
                   variant="outline"
                   disabled={report.status !== 'completed'}
                 >
                   <Download className="h-4 w-4 mr-1" />
                   Baixar
                 </Button>
               </div>
             </motion.div>
           ))}
         </div>
       </CardContent>
     </Card>

     <ReportDetailDialog
       reportId={selectedReportId}
       open={!!selectedReportId}
       onOpenChange={(open) => !open && setSelectedReportId(null)}
     />
   </>
 )
}