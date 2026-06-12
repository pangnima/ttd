import { Users } from 'lucide-react'

export type NavItem = {
    href: string
    label: string
    icon: React.ElementType
}

export const mainNavItems: NavItem[] = [
    { href: '/clubs', label: '클럽 찾기', icon: Users },
]
