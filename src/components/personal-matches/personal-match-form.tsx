'use client'

import type { PersonalMatch } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
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
}

/**
 * 개인 경기 등록/수정 폼 — 단식·복식(페어 고정/로테이션) 동일 구성. 세트는 받지 않고(미확정 저장) 카드 '결과 입력'에서 등록한다.
 * 로테이션은 선수 풀만 세션으로 저장하고 게임(팀 구성+세트)도 '결과 입력'에서 만든다.
 * 신규 등록은 '리스트에 노출'(비밀번호)을 켜면 기록이 경기 리스트의 방으로도 등록된다.
 */
export function PersonalMatchForm({ initialData, opponentCandidates = [], pastOpponents = [], recentCourtNames = [], selfUserId }: Props) {
    const s = usePersonalMatchFormState({ initialData, opponentCandidates, selfUserId })
    const submit = usePersonalMatchSubmit(s, initialData?.id)
    const submitLabel = s.isConfirmFlow ? '확인 요청 보내기' : s.isEdit ? '수정 완료' : '경기 저장'

    return (
        <form onSubmit={submit.handleSubmit} className="mx-auto w-full max-w-2xl space-y-5 lg:max-w-5xl">
            {/* 넓은 화면에서는 2열로 분할해 폼 길이를 줄인다 (좌: 누구와 / 우: 언제·어디서) */}
            <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
                <WhoColumn s={s} opponentCandidates={opponentCandidates} pastOpponents={pastOpponents} selfUserId={selfUserId} />
                <WhenColumn s={s} recentCourtNames={recentCourtNames} existingSets={initialData?.setScores} />
            </div>

            <FormFooter error={submit.error} isPending={submit.isPending} isValid={s.isValid} submitLabel={submitLabel} onCancel={submit.cancel} />
        </form>
    )
}
