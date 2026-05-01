import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth/session'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerSession()

  if (!user) {
    redirect('/login')
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1" />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  )
}
