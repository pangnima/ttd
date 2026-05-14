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

export const navItems: NavItem[] = [
    { href: '/dashboard',        label: '나의 대시보드', icon: LayoutDashboard },
    { href: '/clubs',            label: '클럽',         icon: Users           },
    { href: '/profile/settings', label: '설정',         icon: Settings        },
]
