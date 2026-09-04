import { BarChart3, BookOpen, CalendarDays, ClipboardList, Inbox, Users } from 'lucide-react'

export type NavItem = {
    href: string
    label: string
    icon: React.ElementType
}

// 상단 단독 메뉴 (개인 섹션 위에 노출)
export const topNavItems: NavItem[] = [
    { href: '/guide', label: '사용 가이드', icon: BookOpen },
]

/** '개인' 통계 허브 href. 개인/클럽/통합 하위 구분은 메뉴가 아니라 페이지 내부 탭(ProfileScopeTabs)이 담당한다. */
export function personalNavHref(userId: string): string {
    return `/profile/${userId}?scope=personal`
}

/** '개인' 단일 메뉴 — 사용자별 href가 필요해 정적 배열 대신 빌더로 제공 (Sidebar/MobileNav 공유). */
export function buildPersonalNavItem(userId: string): NavItem {
    return { href: personalNavHref(userId), label: '개인', icon: BarChart3 }
}

/** '개인' 메뉴 활성 판정 — 본인 프로필 경로만(scope 무관). /profile/settings·타인 프로필은 제외. */
export function isPersonalNavActive(pathname: string, userId: string): boolean {
    return pathname === `/profile/${userId}`
}

// 개인 경기 메뉴 ('개인' 메뉴와 같은 섹션, 로그인 시 노출)
// '경기 확인 요청'에는 받은 pending 건수 뱃지가 붙는다 (Sidebar/MobileNav에서 렌더).
export const myMatchNavItems: NavItem[] = [
    { href: '/me/personal-matches', label: '개인 경기 기록', icon: ClipboardList },
    { href: '/match-rooms', label: '매칭 리스트', icon: CalendarDays },
    { href: '/me/match-requests', label: '경기 확인 요청', icon: Inbox },
]

// 클럽 메뉴 (개인 경기 아래, 가입 클럽 트리 위에 노출)
export const clubNavItems: NavItem[] = [
    { href: '/clubs', label: '클럽 찾기', icon: Users },
]
