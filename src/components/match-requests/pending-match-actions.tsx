'use client'

import type { PersonalMatch } from '@/types'
import type { MatchQueueBucket } from '@/lib/match-requests/queue'
import { FreeMatchEditActions, FreeResultEntryButton } from '@/components/personal-matches/match-actions'
import { MutualResultActions } from '@/components/personal-matches/mutual-result-actions'

type Props = {
    match: PersonalMatch
    bucket: MatchQueueBucket
}

/**
 * 미확정 경기 1건의 버킷 → 액션 디스패처.
 * 액션 UI는 전부 기존 컴포넌트를 그대로 쓴다 — 여기서 새 분기 규칙을 만들지 않는다.
 * switch의 never 단언이 버킷 추가 시 UI 누락을 컴파일 에러로 잡는다.
 */
export function PendingMatchActions({ match, bucket }: Props) {
    switch (bucket) {
        case 'fillLineup':
            return <FillLineupActions match={match} />
        case 'confirmResult':
        case 'enterResult':
        case 'awaitingCounterpart':
            // 상호 확인 경기는 제안/확인 4상태 분기를, 자유 기록은 즉시 확정 입력을 각각 담당한다
            return match.sourceRequestId ? (
                <MutualResultActions match={match} />
            ) : (
                <span className="flex items-center gap-2">
                    <FreeResultEntryButton match={match} />
                    <FreeMatchEditActions match={match} />
                </span>
            )
        default: {
            const _exhaustive: never = bucket
            return _exhaustive
        }
    }
}

/** 모집 중 — 참가자를 채워야 결과를 넣을 수 있다. 상호 확인 경기는 작성자만 채울 수 있어 안내만 한다 */
function FillLineupActions({ match }: { match: PersonalMatch }) {
    if (match.sourceRequestId) {
        return <span className="text-caption text-muted-foreground">참가자를 채우면 결과 입력</span>
    }
    return (
        <span className="flex items-center gap-2">
            <FreeMatchEditActions match={match} editLabel="참가자 채우기" />
        </span>
    )
}
