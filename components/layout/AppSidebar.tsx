'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  BookOpen,
  Calendar,
  ChevronDown,
  Database,
  FileText,
  LayoutDashboard,
  Settings,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import type { Database as AppDatabase } from '@/types/database'

type Profile = AppDatabase['public']['Tables']['profiles']['Row']

interface AppSidebarProps {
  profile: Profile | null
}

const navItems = [
  {
    title: "Vue d'ensemble",
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Données marché',
    items: [
      { label: 'Scraping', href: '/scraping', icon: Database },
      { label: 'Compétences', href: '/skills', icon: TrendingUp },
      { label: 'Simulateur salaires', href: '/salary', icon: Wallet },
    ],
  },
  {
    title: 'Pédagogie',
    items: [
      { label: 'Programmes', href: '/programs', icon: BookOpen },
      { label: 'Événements', href: '/events', icon: Calendar },
    ],
  },
  {
    title: 'Rapports',
    items: [
      { label: 'Rapports mensuels', href: '/reports', icon: FileText },
    ],
  },
]

export function AppSidebar({ profile }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile?.email?.[0].toUpperCase() ?? '?'

  return (
    <Sidebar>
      {/* Header */}
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600 flex-shrink-0">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground leading-tight">
              Eugenia
            </p>
            <p className="text-xs text-sidebar-foreground/50">Market Intelligence</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Navigation */}
      <SidebarContent className="px-2">
        {navItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer — User menu */}
      <SidebarFooter className="p-3">
        <SidebarSeparator className="mb-3" />
        <DropdownMenu>
          <DropdownMenuTrigger>
            <button className="flex items-center gap-3 w-full rounded-xl px-3 py-2 hover:bg-sidebar-accent transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-indigo-600 text-white text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate">
                  {profile?.full_name ?? 'Utilisateur'}
                </p>
                <p className="text-xs text-sidebar-foreground/50 truncate">
                  {profile?.email}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-sidebar-foreground/50 flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48 mb-1">
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-500 focus:text-red-500"
            >
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
