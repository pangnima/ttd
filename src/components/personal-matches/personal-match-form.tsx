'use client'

import type { PersonalMatch } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import type { RoomGameContext } from '@/lib/match-rooms/room-context'
import type { ScheduleSlot } from '@/lib/personal-matches/schedule-conflict'
import { WhoColumn } from '@/components/personal-matches/form-sections/who-column'
import { WhenColumn } from '@/components/personal-matches/form-sections/when-column'
import { FormFooter } from '@/components/personal-matches/form-sections/form-footer'
import { usePersonalMatchFormState } from '@/components/personal-matches/use-personal-match-form-state'
import { usePersonalMatchSubmit, type SubmitNavigation } from '@/components/personal-matches/use-personal-match-submit'

type Props = {
    initialData?: PersonalMatch
    // 신규 등록의 초안 — 취소한 확인 요청을 되살릴 때(Week 38). 수정 모드를 켜지 않는다
    prefill?: Partial<PersonalMatch>
    opponentCandidates?: OpponentCandidate[]
    pastOpponents?: PastOpponent[]
    // 코트명 '최근 코트' 자동완성 후보 (본인이 이전에 입력한 코트명)
    recentCourtNames?: string[]
    // 로그인 유저 id — 전달 시 모든 선수 필드에 전체 회원 검색 + 상호 확인 요청 플로우 활성화
    selfUserId?: string
    // 매칭 리스트 방 참가자 — 모집형 기록 수정에서 자동완성 최상단 그룹 (0048)
    roomParticipants?: OpponentCandidate[]
    // 방 게임 추가(0048) — 메타를 방 값으로 고정하고 room_id를 붙여 자유 기록으로 저장
    roomContext?: RoomGameContext
    // 'dialog'는 매칭 룸 안의 팝업 — 단일 열로 좁히고 메타 요약 카드를 숨긴다(룸 헤더가 이미 보여준다)
    variant?: 'page' | 'dialog'
    // 저장/취소 후 이동을 호출부가 가져간다 (다이얼로그 닫기 + refresh). 없으면 종전대로 router.push
    nav?: SubmitNavigation
    // 내 미확정 일정 — 같은 날짜·시각이면 중복 생성 경고를 띄운다 (0057)
    scheduleSlots?: ScheduleSlot[]
}

/**
 * 개인 경기 등록/수정 폼 — 단식·복식(페어 고정/로테이션) 동일 구성. 세트는 받지 않고(미확정 저장) 카드 '결과 입력'에서 등록한다.
 * 로테이션은 선수 풀만 세션으로 저장하고 게임(팀 구성+세트)도 '결과 입력'에서 만든다.
 * 방을 만드는 경로는 여기가 아니다 — 매칭은 「매칭 만들기」(/match-rooms/new)에서 연다(Week 39).
 * 방 게임(roomContext)은 방장이 방 참가자로 게임을 구성하는 경로 — 같은 폼에 참가자만 입력한다.
 */
export function PersonalMatchForm({
    initialData, prefill, opponentCandidates = [], pastOpponents = [], recentCourtNames = [], selfUserId, roomParticipants, roomContext,
    variant = 'page', nav, scheduleSlots,
}: Props) {
    const s = usePersonalMatchFormState({ initialData, prefill, opponentCandidates, selfUserId, roomContext })
    const submit = usePersonalMatchSubmit(s, initialData?.id, nav)
    // 상호 확인은 이제 방 안에서만 일어난다(Week 39) — isConfirmFlow가 곧 방 게임이라 '확인 요청' 라벨은 없다
    const submitLabel = s.isConfirmFlow || s.isRoomGame ? '게임 저장'
        : s.isEdit ? '수정 완료'
            : '경기 저장'

    const isDialog = variant === 'dialog'

    return (
        <form onSubmit={submit.handleSubmit} className={isDialog ? 'space-y-4' : 'mx-auto w-full max-w-2xl space-y-5 lg:max-w-5xl'}>
            {/* 넓은 화면에서는 2열로 분할해 폼 길이를 줄인다 (좌: 누구와 / 우: 언제·어디서) */}
            <div className={isDialog ? 'space-y-4' : 'grid gap-5 lg:grid-cols-2 lg:items-start'}>
                <WhoColumn
                    s={s}
                    opponentCandidates={opponentCandidates}
                    pastOpponents={pastOpponents}
                    roomParticipants={roomContext?.participants ?? roomParticipants}
                    selfUserId={selfUserId}
                />
                <WhenColumn s={s} recentCourtNames={recentCourtNames} existingSets={initialData?.setScores} variant={variant} scheduleSlots={scheduleSlots} />
            </div>

            <FormFooter error={submit.error} isPending={submit.isPending} isValid={s.isValid} submitLabel={submitLabel} onCancel={submit.cancel} />
        </form>
    )
}
