"use client"

import type React from "react"

import { ConfigProvider } from "@/hooks/use-config"

export function Providers({ children }: { children: React.ReactNode }) {
  return <ConfigProvider>{children}</ConfigProvider>
}
