import { AppLayout }       from '@/components/layout/app-layout'
import { SettingsSidebar } from './settings-sidebar'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout pageTitle="Configurações">
      <div className="flex gap-8 max-w-5xl mx-auto">
        <SettingsSidebar />
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </AppLayout>
  )
}
