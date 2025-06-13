// app/layout.tsx
import { JiraConfigProvider } from '@/contexts/JiraConfigContext'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

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
          <JiraConfigProvider>
            {children}
            <Toaster richColors position="top-center" />
          </JiraConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}