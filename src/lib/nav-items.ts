import { BookOpen, ClipboardList, Inbox, Users } from 'lucide-react'

export type NavItem = {
    href: string
    label: string
    icon: React.ElementType
}

// 상단 단독 메뉴 (내 전적 위에 노출)
export const topNavItems: NavItem[] = [
    { href: '/guide', label: '사용 가이드', icon: BookOpen },
]

// 개인 경기 메뉴 (내 전적 아래 독립 섹션, 로그인 시 노출)
// '경기 확인 요청'에는 받은 pending 건수 뱃지가 붙는다 (Sidebar/MobileNav에서 렌더).
export const myMatchNavItems: NavItem[] = [
    { href: '/me/personal-matches', label: '개인 경기 등록', icon: ClipboardList },
    { href: '/me/match-requests', label: '경기 확인 요청', icon: Inbox },
]

// 클럽 메뉴 (개인 경기 아래, 가입 클럽 트리 위에 노출)
export const clubNavItems: NavItem[] = [
    { href: '/clubs', label: '클럽 찾기', icon: Users },
]
