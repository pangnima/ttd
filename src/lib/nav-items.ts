import {
    Users,
    BarChart3,
} from 'lucide-react'

export type NavItem = {
    href: string
    label: string
    icon: React.ElementType
}

export const mainNavItems: NavItem[] = [
    { href: '/clubs',        label: '클럽리스트',   icon: Users           },
    { href: '/me/analytics', label: '개인 분석',    icon: BarChart3       },
]
