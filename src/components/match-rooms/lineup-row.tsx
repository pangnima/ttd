import type { ReactNode } from 'react'
import { TYPO } from '@/lib/dashboard/tokens'

type Props = {
    /** 머리줄 '게임 N' */
    seq: number
    /** '2번 코트'·'10:30' — 머리줄 오른쪽 조각 */
    slotLabel?: string
    /** 머리줄 오른쪽 끝(밸런스 배지·편집 버튼) */
    headerRight?: ReactNode
    /** 팀 두 줄 — 사이에 구분선 */
    team1: ReactNode
    team2: ReactNode
    /** 팀 아래(쉬는 사람 등) */
    children?: ReactNode
}

/**
 * 대진 카드 1장의 골격 — 머리줄 · 팀 두 줄(구분선) · 꼬리. 읽기 카드(`RoomLineupGameCard`)와
 * 편집 카드(`LineupEditCard`)가 같은 `<li>`를 각자 갖고 있던 것을 하나로(Week 69).
 * `vs`를 쓰지 않고 구분선과 색 바로 팀 경계를 말한다(Week 41).
 */
export function LineupRow({ seq, slotLabel, headerRight, team1, team2, children }: Props) {
    return (
        <li className="px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <span className={TYPO.eyebrow}>
                    게임 {seq}
                    {slotLabel && <span className="ml-1.5 normal-case">· {slotLabel}</span>}
                </span>
                {headerRight && <div className="flex items-center gap-2 shrink-0">{headerRight}</div>}
            </div>
            <div className="space-y-1.5">
                {team1}
                <div className="border-t border-border/60" />
                {team2}
            </div>
            {children}
        </li>
    )
}
