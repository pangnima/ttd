'use client'

import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import type { PoolPlayer } from '@/lib/personal-matches/rotation'
import { PoolPlayerRow } from '@/components/personal-matches/rotation/pool-player-row'
import { AddButton } from '@/components/personal-matches/add-button'

type PlayerPoolSectionProps = {
    pool: PoolPlayer[]
    candidates: OpponentCandidate[]
    pastOpponents: PastOpponent[]
    onAdd: () => void
    onUpdate: (tempId: string, patch: Partial<Omit<PoolPlayer, 'tempId'>>) => void
    onRemove: (tempId: string) => void
    // 전체 회원 검색 활성화 (로그인 유저 id)
    searchSelfUserId?: string
    // 모집형(리스트에 노출) — 참가자 없이 저장할 수 있다(안내 문구만 다르고, 화면에 있는 행은 NTRP까지 필수)
    allowEmpty?: boolean
    // 행마다 헤더 오른쪽에 끼울 액션 — 빌더의 좌석 배지·[초대]·[제거]용 (0058). 등록 폼은 넘기지 않는다
    renderRowAction?: (p: PoolPlayer) => React.ReactNode
    // 로컬 [삭제]를 그릴지 (기본 true). 서버 명부의 회원 행은 false로 막는다 —
    // 로컬로만 지우면 초대는 남은 채 행만 사라져 "취소한 줄 알았는데 다시 초대할 수 없는" 상태가 된다(0059)
    rowRemovable?: (p: PoolPlayer) => boolean
}

/**
 * 로테이션 참가자 풀 입력 — 나를 제외한 함께 친 선수들을 한 번씩 등록한다.
 * 게임(팀 구성·스코어)은 저장 후 카드의 '결과 입력'에서 이 풀을 참조해 만든다.
 * 행마다 NTRP 필수 — 모집형이라도 입력한 참가자는 완전해야 한다(빈 행은 노출 전환 시 폼이 제거).
 */
export function PlayerPoolSection({ pool, candidates, pastOpponents, onAdd, onUpdate, onRemove, searchSelfUserId, allowEmpty = false, renderRowAction, rowRemovable }: PlayerPoolSectionProps) {
    return (
        <div className="space-y-4">
            {pool.length === 0 && (
                <p className="text-body2 text-muted-foreground">
                    {allowEmpty ? '비워 두면 매칭 리스트에서 참가자를 모집합니다.' : '함께 친 선수를 추가하세요. (최소 3명)'}
                </p>
            )}
            {/* 행은 자체 mt/구분선으로 간격을 가지므로 래퍼에는 space-y를 두지 않는다 */}
            <div>
                {pool.map((p, i) => (
                    <PoolPlayerRow
                        key={p.tempId}
                        index={i}
                        value={p}
                        candidates={candidates}
                        pastOpponents={pastOpponents}
                        onChange={(patch) => onUpdate(p.tempId, patch)}
                        onRemove={() => onRemove(p.tempId)}
                        canRemove={rowRemovable ? rowRemovable(p) : true}
                        searchSelfUserId={searchSelfUserId}
                        headerAction={renderRowAction?.(p)}
                    />
                ))}
            </div>
            <AddButton label="참가자 추가" onClick={onAdd} />
        </div>
    )
}
