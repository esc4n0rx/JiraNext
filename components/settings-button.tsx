"use client"

import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsDialog } from "@/components/settings-dialog"
import { useState } from "react"

export function SettingsButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
        <Settings className="h-5 w-5" />
        <span className="sr-only">Configurações</span>
      </Button>
      <SettingsDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
