'use client'

import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import type { PoolPlayer } from '@/lib/personal-matches/rotation'
import { PlayerPoolSection } from '@/components/personal-matches/rotation/player-pool-section'

export type PoolPickerProps = {
    candidates: OpponentCandidate[]
    pastOpponents: PastOpponent[]
    selfUserId?: string
}

type Props = {
    pool: PoolPlayer[]
    picker: PoolPickerProps
    onAdd: () => void
    onUpdate: (tempId: string, patch: Partial<Omit<PoolPlayer, 'tempId'>>) => void
    onRemove: (tempId: string) => void
}

/**
 * 결과 입력 팝업의 참가자 편집 블록 — 모집형(풀 0명)으로 연 세션에서 게임을 구성하려면 여기서 선수를 채운다.
 * 여기서 추가한 선수는 이 팝업 안에서만 유지되고(세션 행은 수정하지 않는다) 저장 시 게임의 참가자로 기록된다.
 */
export function PoolEditorBlock({ pool, picker, onAdd, onUpdate, onRemove }: Props) {
    return (
        <details className="rounded-lg border border-border px-3 py-2" open={pool.length === 0}>
            <summary className="text-body2 font-medium cursor-pointer">참가자 추가·편집</summary>
            <p className="mt-2 text-caption text-muted-foreground break-keep">
                여기서 추가한 선수는 이 게임 구성에만 쓰이고 방 참가자·초대에는 반영되지 않습니다.
                회원을 정식 참가자로 넣으려면 방 상세에서 합류 신청을 승인하세요.
            </p>
            <div className="mt-3">
                <PlayerPoolSection
                    pool={pool}
                    candidates={picker.candidates}
                    pastOpponents={picker.pastOpponents}
                    onAdd={onAdd}
                    onUpdate={onUpdate}
                    onRemove={onRemove}
                    searchSelfUserId={picker.selfUserId}
                />
            </div>
        </details>
    )
}
