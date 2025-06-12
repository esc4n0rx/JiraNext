import { MainCard } from "@/components/main-card"
import { SettingsButton } from "@/components/settings-button"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-background">
      <div className="absolute top-4 right-4">
        <SettingsButton />
      </div>
      <h1 className="text-3xl font-bold mb-8 text-center">Jira Data Extractor</h1>
      <MainCard />
    </main>
  )
}
