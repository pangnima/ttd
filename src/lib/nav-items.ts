import { BarChart3, CalendarDays, ClipboardList, ListChecks } from 'lucide-react'

export type NavItem = {
    href: string
    label: string
    icon: React.ElementType
    /** 하위 경로까지 활성으로 볼 접두사. 없으면 '개인' 메뉴의 정확 일치 규칙을 따른다 */
    matchPrefix?: string
    /** 작업 큐 뱃지를 다는 메뉴 — href 하드코딩 대신 데이터로 (Sidebar·MobileNav 공유) */
    badge?: boolean
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
 * 하나의 경기가 놓이는 자리는 둘뿐이다(Week 39) — **진행 중인 매칭은 매칭 룸**, **끝난 것은 개인 경기 결과**.
 * Week 45에 그 앞단을 둘로 갈랐다: 고르러 오는 **매칭 리스트**(전체 방)와 내 작업 공간인
 * **참여 중인 매칭**(내 방 + 초대). 뱃지는 후자에 붙는다 — 뱃지가 세는 것이 그 화면에 그려지기 때문이다.
 * 순서는 찾기 → 참여 → 결과.
 */
export const myMatchNavItems: NavItem[] = [
    { href: '/match-rooms', label: '매칭 리스트', icon: CalendarDays, matchPrefix: '/match-rooms' },
    { href: '/me/match-rooms', label: '참여 중인 매칭', icon: ListChecks, matchPrefix: '/me/match-rooms', badge: true },
    { href: '/me/personal-matches', label: '개인 경기 결과', icon: ClipboardList, matchPrefix: '/me/personal-matches' },
]

/**
 * 메뉴 활성 판정 — Sidebar와 MobileNav가 함께 쓴다(두 곳에 복제돼 있던 것을 Week 45에 합쳤다).
 *
 * 접두사는 서로 겹치지 않는다: '/me/match-rooms'는 '/match-rooms'로 시작하지 않는다.
 * 방 상세(/match-rooms/[roomId])는 접두사상 '매칭 리스트'가 활성이다 — 주로 참여 중인 매칭에서
 * 들어가지만, 상세 URL을 옮기면 공유 링크가 깨지므로 그대로 둔다.
 */
export function isNavItemActive(item: NavItem, pathname: string, userId: string | null): boolean {
    if (item.matchPrefix) return pathname.startsWith(item.matchPrefix)
    return userId ? isPersonalNavActive(pathname, userId) : false
}

// 클럽 메뉴는 Week 39에서 사이드바에서 내렸다(클럽 동결). Week 54에 헤더 [클럽 찾기]와
// 프로필 빈 상태·온보딩의 클럽 유도까지 내려, 진입은 이제 **로고 링크로만** 남는다 —
// 해동 시 clubNavItems + ClubNavTree(components/common/club-nav-tree.tsx)를 여기서 복원한다.
