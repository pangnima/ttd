import Link from 'next/link'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CTA_LINK } from '@/lib/dashboard/tokens'

type NavCreateLinkProps = {
    /** 사이드바 rail(접힘) — 아이콘만 남기고 라벨은 aria-label로(`SidebarNavRow`의 접힘 관용구) */
    collapsed?: boolean
    /** 모바일 시트 — 이동하면 시트를 닫는다 */
    onNavigate?: () => void
}

const LABEL = '매칭 만들기'

/**
 * 사이드바·모바일 시트 최상단의 [+ 매칭 만들기] — 내비 **위의 버튼**이지 메뉴 항목이 아니다(Week 67).
 *
 * 매칭 만들기는 두 목록 화면(`RoomCreateLink`)에만 있어 목록에 들어가야 보였다. 메뉴 항목으로 두면
 * 활성 표시가 어색하고(장소가 아니라 액션이다) 2depth를 만들면 항목 4개에 깊이만 는다. 그래서
 * Gmail 「편지쓰기」 자리 — 옐로우 채움(`CTA_LINK`, Week 66 규칙)이라 "눌러라"로 읽힌다.
 * 목록 화면 안 버튼은 그대로 둔다(진입점은 하나만 두지 않는다 — Week 57).
 */
export function NavCreateLink({ collapsed = false, onNavigate }: NavCreateLinkProps) {
    return (
        <Link
            href="/match-rooms/new"
            onClick={onNavigate}
            aria-label={collapsed ? LABEL : undefined}
            className={cn(
                CTA_LINK,
                collapsed ? 'w-10 h-10 mx-auto justify-center px-0 rounded-lg' : 'w-full justify-center',
            )}
        >
            <Plus className="w-4 h-4 shrink-0" aria-hidden />
            {!collapsed && LABEL}
        </Link>
    )
}
