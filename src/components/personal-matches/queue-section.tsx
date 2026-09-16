import type { ReactNode } from 'react'
import { ATTENTION_PILL, TYPO, LIST_CARD } from '@/lib/dashboard/tokens'

type Props = {
    title: string
    /** 이 섹션이 무엇을 요구하는지 한 줄 안내 (선택) */
    hint?: string
    /**
     * **이 섹션에 실제로 그려지는 카드 수여야 한다.** 0이면 섹션과 그 안 children까지 통째로 사라진다
     * — 허브는 '할 일이 있는 것만' 보여주기 때문이다.
     *
     * ⚠ 그래서 '내 차례 건수' 같은 다른 의미의 숫자를 넘기면 안 된다. 실제로 「결과 입력 대기」가
     * counts.enterResult(이미 게임이 등록된 세션을 뺀 값)를 넘기고 있었고, 그 값이 0이 되는 순간
     * children으로 넘긴 로테이션 세션 카드까지 사라져 탭이 백지가 됐다.
     * children 개수를 여기서 세지 않는 이유: React.Children.count는 map 결과를 1로 세어 신뢰할 수 없다.
     * 목록 건수는 lib/match-requests/hub-totals.ts가 파생한다.
     */
    count: number
    /** true면 카드 리스트 컨테이너를 씌우지 않는다 — 자식이 박스를 스스로 소유할 때(MatchGroupList) */
    unboxed?: boolean
    /**
     * 이 섹션의 카드가 전부 **내 승인**을 기다리는가(참여 수락·결과 확인·이의 재입력). 헤더에 '승인 필요' 필을 단다.
     * 섹션 단위인 이유: 섹션은 버킷 단위로 균질하고, 카드 박스는 MatchGroupList가 소유해 카드 레벨 테두리는
     * 닿지 않는 자리가 더 많다. 결과 입력·참가자 채우기는 내 차례지만 승인이 아니라 달지 않는다.
     */
    attention?: boolean
    children: ReactNode
}

/** 확인 요청 허브의 섹션 껍데기 — 제목 + 카드 리스트 컨테이너 */
export function QueueSection({ title, hint, count, unboxed = false, attention = false, children }: Props) {
    if (count === 0) return null
    return (
        <section className="space-y-2">
            <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className={TYPO.h3}>{title}</h2>
                {attention && <span className={ATTENTION_PILL}>승인 필요</span>}
                <span className={`text-caption ${attention ? 'text-spot' : 'text-muted-foreground'}`}>
                    {count}건{hint && ` · ${hint}`}
                </span>
            </div>
            {unboxed
                ? <div className="space-y-2">{children}</div>
                : <div className={`${LIST_CARD}`}>{children}</div>}
        </section>
    )
}
