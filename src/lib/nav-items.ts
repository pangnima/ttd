import { BookOpen, Users } from 'lucide-react'

export type NavItem = {
    href: string
    label: string
    icon: React.ElementType
}

// 상단 단독 메뉴 (내 전적 위에 노출)
export const topNavItems: NavItem[] = [
    { href: '/guide', label: '사용 가이드', icon: BookOpen },
]

// 클럽 메뉴 (내 전적 아래, 가입 클럽 트리 위에 노출)
export const clubNavItems: NavItem[] = [
    { href: '/clubs', label: '클럽 찾기', icon: Users },
]
