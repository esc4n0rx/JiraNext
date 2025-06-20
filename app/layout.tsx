import { DashboardProvider } from '@/contexts/DashboardContext'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { ConfigProvider } from '@/hooks/use-config' 

import './globals.css'

export const metadata = {
  title: 'Jira Analytics Pro',
  description: 'Plataforma inteligente para análise e extração de dados do Jira',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ConfigProvider>
            <DashboardProvider>
              {children}
              <Toaster/>
            </DashboardProvider>
          </ConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}