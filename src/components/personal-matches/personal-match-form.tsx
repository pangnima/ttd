'use client'

import type { PersonalMatch } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import type { RoomGameContext } from '@/lib/match-rooms/room-context'
import { WhoColumn } from '@/components/personal-matches/form-sections/who-column'
import { WhenColumn } from '@/components/personal-matches/form-sections/when-column'
import { FormFooter } from '@/components/personal-matches/form-sections/form-footer'
import { usePersonalMatchFormState } from '@/components/personal-matches/use-personal-match-form-state'
import { usePersonalMatchSubmit } from '@/components/personal-matches/use-personal-match-submit'

type Props = {
    initialData?: PersonalMatch
    opponentCandidates?: OpponentCandidate[]
    pastOpponents?: PastOpponent[]
    // 코트명 '최근 코트' 자동완성 후보 (본인이 이전에 입력한 코트명)
    recentCourtNames?: string[]
    // 로그인 유저 id — 전달 시 모든 선수 필드에 전체 회원 검색 + 상호 확인 요청 플로우 활성화
    selfUserId?: string
    // 경기 리스트 방 참가자 — 모집형 기록 수정에서 자동완성 최상단 그룹 (0048)
    roomParticipants?: OpponentCandidate[]
    // 방 게임 추가(0048) — 메타를 방 값으로 고정하고 room_id를 붙여 자유 기록으로 저장
    roomContext?: RoomGameContext
}

/**
 * 개인 경기 등록/수정 폼 — 단식·복식(페어 고정/로테이션) 동일 구성. 세트는 받지 않고(미확정 저장) 카드 '결과 입력'에서 등록한다.
 * 로테이션은 선수 풀만 세션으로 저장하고 게임(팀 구성+세트)도 '결과 입력'에서 만든다.
 * 신규 등록은 '리스트에 노출'(비밀번호)을 켜면 기록이 경기 리스트의 방으로도 등록된다.
 * 방 게임(roomContext)은 방장이 방 참가자로 게임을 구성하는 경로 — 같은 폼에 참가자만 입력한다.
 */
export function PersonalMatchForm({
    initialData, opponentCandidates = [], pastOpponents = [], recentCourtNames = [], selfUserId, roomParticipants, roomContext,
}: Props) {
    const s = usePersonalMatchFormState({ initialData, opponentCandidates, selfUserId, roomContext })
    const submit = usePersonalMatchSubmit(s, initialData?.id)
    // 방 게임은 확인 요청 없이 곧바로 참가자 기록에 남으므로 '요청' 문구를 쓰지 않는다 (0049)
    const submitLabel = s.roomId && s.isConfirmFlow ? '게임 저장'
        : s.isConfirmFlow ? '확인 요청 보내기'
            : s.isEdit ? '수정 완료'
                : s.isRoomGame ? '게임 저장' : '경기 저장'

    return (
        <form onSubmit={submit.handleSubmit} className="mx-auto w-full max-w-2xl space-y-5 lg:max-w-5xl">
            {/* 넓은 화면에서는 2열로 분할해 폼 길이를 줄인다 (좌: 누구와 / 우: 언제·어디서) */}
            <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
                <WhoColumn
                    s={s}
                    opponentCandidates={opponentCandidates}
                    pastOpponents={pastOpponents}
                    roomParticipants={roomContext?.participants ?? roomParticipants}
                    selfUserId={selfUserId}
                />
                <WhenColumn s={s} recentCourtNames={recentCourtNames} existingSets={initialData?.setScores} />
            </div>

            <FormFooter error={submit.error} isPending={submit.isPending} isValid={s.isValid} submitLabel={submitLabel} onCancel={submit.cancel} />
        </form>
    )
}
