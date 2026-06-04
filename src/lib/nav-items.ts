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
    { href: '/clubs', label: '클럽리스트', icon: Users },
]

/**
 * 동적 nav item: 로그인한 사용자의 userId가 있어야 완성되는 링크.
 * layout.tsx에서 userId를 주입해 Sidebar/MobileNav에 전달.
 */
export function getProfileNavItem(userId: string): NavItem {
    return { href: `/profile/${userId}`, label: '내 분석', icon: BarChart3 }
}
