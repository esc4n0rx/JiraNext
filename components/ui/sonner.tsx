// components/ui/sonner.tsx
"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      richColors
      closeButton
      expand={true}
      visibleToasts={4}
      offset={16}
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-950 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg group-[.toaster]:backdrop-blur-none dark:group-[.toaster]:bg-gray-950 dark:group-[.toaster]:text-gray-50 dark:group-[.toaster]:border-gray-800",
          description: "group-[.toast]:text-gray-500 dark:group-[.toast]:text-gray-400",
          actionButton: "group-[.toast]:bg-gray-900 group-[.toast]:text-gray-50 hover:group-[.toast]:bg-gray-900/90 dark:group-[.toast]:bg-gray-50 dark:group-[.toast]:text-gray-900 dark:hover:group-[.toast]:bg-gray-50/90",
          cancelButton: "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-500 hover:group-[.toast]:bg-gray-100/80 dark:group-[.toast]:bg-gray-800 dark:group-[.toast]:text-gray-400 dark:hover:group-[.toast]:bg-gray-800/80",
          closeButton: "group-[.toast]:bg-gray-200 group-[.toast]:text-gray-500 hover:group-[.toast]:bg-gray-200/80 dark:group-[.toast]:bg-gray-700 dark:group-[.toast]:text-gray-400 dark:hover:group-[.toast]:bg-gray-700/80",
          success: "group-[.toaster]:bg-green-50 group-[.toaster]:text-green-900 group-[.toaster]:border-green-200 dark:group-[.toaster]:bg-green-950 dark:group-[.toaster]:text-green-50 dark:group-[.toaster]:border-green-800",
          error: "group-[.toaster]:bg-red-50 group-[.toaster]:text-red-900 group-[.toaster]:border-red-200 dark:group-[.toaster]:bg-red-950 dark:group-[.toaster]:text-red-50 dark:group-[.toaster]:border-red-800",
          warning: "group-[.toaster]:bg-yellow-50 group-[.toaster]:text-yellow-900 group-[.toaster]:border-yellow-200 dark:group-[.toaster]:bg-yellow-950 dark:group-[.toaster]:text-yellow-50 dark:group-[.toaster]:border-yellow-800",
          info: "group-[.toaster]:bg-blue-50 group-[.toaster]:text-blue-900 group-[.toaster]:border-blue-200 dark:group-[.toaster]:bg-blue-950 dark:group-[.toaster]:text-blue-50 dark:group-[.toaster]:border-blue-800",
          loading: "group-[.toaster]:bg-gray-50 group-[.toaster]:text-gray-900 group-[.toaster]:border-gray-200 dark:group-[.toaster]:bg-gray-950 dark:group-[.toaster]:text-gray-50 dark:group-[.toaster]:border-gray-800"
        },
        style: {
          backgroundColor: "var(--toast-bg)",
          color: "var(--toast-text)",
          border: "1px solid var(--toast-border)",
          backdropFilter: "none", // Remove blur
          WebkitBackdropFilter: "none", // Remove blur no Safari
          opacity: "1", // Força opacidade total
        }
      }}
      {...props}
    />
  )
}

export { Toaster }