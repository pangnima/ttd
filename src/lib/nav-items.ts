import {
    LayoutDashboard,
    Users,
    Settings,
} from 'lucide-react'

export type NavItem = {
    href: string
    label: string
    icon: React.ElementType
}

export const mainNavItems: NavItem[] = [
    { href: '/dashboard', label: '나의 대시보드', icon: LayoutDashboard },
    { href: '/clubs',     label: '클럽리스트',   icon: Users           },
]

export const settingNavItem: NavItem = {
    href: '/profile/settings',
    label: '설정',
    icon: Settings,
}
