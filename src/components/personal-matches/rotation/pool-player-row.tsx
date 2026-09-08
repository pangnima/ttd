'use client'

import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import { isNtrpLocked } from '@/lib/personal-matches/ntrp'
import { PlayerNtrpField } from '@/components/personal-matches/player-ntrp-field'
import type { PoolPlayer } from '@/lib/personal-matches/rotation'
import { cn } from '@/lib/utils'

type PoolPlayerRowProps = {
    index: number
    value: PoolPlayer
    candidates: OpponentCandidate[]
    pastOpponents: PastOpponent[]
    onChange: (patch: Partial<Omit<PoolPlayer, 'tempId'>>) => void
    onRemove: () => void
    canRemove: boolean
    // 전체 회원 검색 활성화 (로그인 유저 id)
    searchSelfUserId?: string
    // 헤더 줄 오른쪽 슬롯 — 빌더에서 좌석 배지·[초대]·[제거]를 끼운다 (0058). 등록 폼은 넘기지 않는다
    headerAction?: React.ReactNode
}

/**
 * 선수 풀의 한 항목 — 이름 선택(PlayerNtrpField 재사용, 회원 선택 시 손잡이·NTRP 자동 채움) + NTRP(필수). 삭제 버튼.
 * 풀 전원 NTRP 필수 — 게임에서 파트너/상대 어느 역할이든 개인 레이팅 계산에 쓰인다 (페어 고정 폼과 동일 규칙).
 */
export function PoolPlayerRow({ index, value, candidates, pastOpponents, onChange, onRemove, canRemove, searchSelfUserId, headerAction }: PoolPlayerRowProps) {
    return (
        <div className={cn('space-y-2', index > 0 && 'mt-6 border-t border-border pt-6')}>
            <div className="flex items-center justify-between gap-2">
                <span className="text-caption font-semibold text-foreground">참가자 {index + 1}</span>
                <div className="flex items-center gap-2">
                    {headerAction}
                    {canRemove && (
                        <button type="button" onClick={onRemove} className="text-caption text-destructive/80 hover:text-destructive">
                            삭제
                        </button>
                    )}
                </div>
            </div>
            <PlayerNtrpField
                label="이름"
                candidates={candidates}
                pastOpponents={pastOpponents}
                player={value.player}
                onPlayerChange={(p) => onChange({ player: p })}
                ntrp={value.ntrp}
                onNtrpChange={(n) => onChange({ ntrp: n })}
                ntrpRequired
                placeholder="이름 또는 닉네임"
                searchSelfUserId={searchSelfUserId}
                ntrpLocked={isNtrpLocked(value.player, value.ntrp, candidates)}
            />
        </div>
    )
}
