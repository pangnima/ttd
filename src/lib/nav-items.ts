import { BarChart3, CalendarDays, ClipboardList } from 'lucide-react'

export type NavItem = {
    href: string
    label: string
    icon: React.ElementType
}

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

/**
 * 개인 경기 메뉴 ('개인' 메뉴와 같은 섹션, 로그인 시 노출).
 *
 * 하나의 경기가 놓이는 자리는 둘뿐이다(Week 39) — **진행 중인 매칭은 매칭 리스트**(그 목록이 곧 작업 큐),
 * **끝난 것은 개인 경기 결과**. 뱃지는 매칭 리스트에 붙는다(Sidebar/MobileNav에서 렌더).
 */
export const myMatchNavItems: NavItem[] = [
    { href: '/match-rooms', label: '매칭 리스트', icon: CalendarDays },
    { href: '/me/personal-matches', label: '개인 경기 결과', icon: ClipboardList },
]

// 클럽 메뉴는 Week 39에서 사이드바에서 내렸다(클럽 동결). 진입은 헤더 '클럽 찾기'와 로고 링크로만 남는다 —
// 해동 시 clubNavItems + ClubNavTree(components/common/club-nav-tree.tsx)를 여기서 복원한다.
