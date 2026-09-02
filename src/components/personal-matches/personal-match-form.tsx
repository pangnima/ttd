'use client'

import type { PersonalMatch } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import { MATCH_TYPE_OPTIONS } from '@/lib/dashboard/match-type-style'
import { FormSectionCard } from '@/components/common/form-section-card'
import { FieldToggle } from '@/components/common/field-toggle'
import { ConfirmFlowNotice } from '@/components/personal-matches/form-sections/confirm-flow-notice'
import { PendingResultNotice } from '@/components/personal-matches/form-sections/pending-result-notice'
import { PlayersSection } from '@/components/personal-matches/form-sections/players-section'
import { MatchMetaSection } from '@/components/personal-matches/form-sections/match-meta-section'
import { NotesSection } from '@/components/personal-matches/form-sections/notes-section'
import { FormFooter } from '@/components/personal-matches/form-sections/form-footer'
import { DoublesModeToggle } from '@/components/personal-matches/doubles-mode-toggle'
import { PlayerPoolSection } from '@/components/personal-matches/rotation/player-pool-section'
import { usePersonalMatchFormState } from '@/components/personal-matches/use-personal-match-form-state'
import { usePersonalMatchSubmit } from '@/components/personal-matches/use-personal-match-submit'

type Props = {
    initialData?: PersonalMatch
    opponentCandidates?: OpponentCandidate[]
    pastOpponents?: PastOpponent[]
    // 로그인 유저 id — 전달 시 모든 선수 필드에 전체 회원 검색 + 상호 확인 요청 플로우 활성화
    selfUserId?: string
}

/**
 * 개인 경기 등록/수정 폼 — 단식·복식(페어 고정/로테이션) 동일 구성. 세트는 받지 않고(미확정 저장) 카드 '결과 입력'에서 등록한다.
 * 로테이션은 선수 풀만 세션으로 저장하고 게임(팀 구성+세트)도 '결과 입력'에서 만든다.
 */
export function PersonalMatchForm({ initialData, opponentCandidates = [], pastOpponents = [], selfUserId }: Props) {
    const s = usePersonalMatchFormState({ initialData, opponentCandidates, selfUserId })
    const submit = usePersonalMatchSubmit(s, initialData?.id)
    const slot = (x: typeof s.opponent) => ({ player: x.player, onPlayerChange: x.setPlayer, ntrp: x.ntrp, onNtrpChange: x.setNtrp })
    const participantsTitle = s.isRotation ? '참가자 (나 제외)' : s.isDoubles ? '참가자' : '상대'
    const submitLabel = s.isConfirmFlow ? '확인 요청 보내기' : s.isEdit ? '수정 완료' : '경기 저장'

    return (
        <form onSubmit={submit.handleSubmit} className="mx-auto w-full max-w-2xl space-y-5 lg:max-w-5xl">
            {/* 넓은 화면에서는 2열로 분할해 폼 길이를 줄인다 (좌: 누구와 / 우: 언제·어디서) */}
            <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
                <div className="space-y-5">
                    <FormSectionCard title="경기 타입" step="01" contentClassName="space-y-4">
                        <FieldToggle label="경기 타입" required options={MATCH_TYPE_OPTIONS} value={s.matchType} onChange={s.setMatchType} />
                        {/* 복식 신규 등록 시에만 방식 토글 노출 (수정 모드는 단일 레코드라 미지원) */}
                        {s.isDoubles && !s.isEdit && <DoublesModeToggle value={s.doublesMode} onChange={s.setDoublesMode} />}
                    </FormSectionCard>

                    <FormSectionCard title={participantsTitle} step="02" contentClassName="space-y-4">
                        {s.isRotation ? (
                            <PlayerPoolSection
                                pool={s.rotation.pool}
                                candidates={opponentCandidates}
                                pastOpponents={pastOpponents}
                                onAdd={s.rotation.addPoolPlayer}
                                onUpdate={s.rotation.updatePoolPlayer}
                                onRemove={s.rotation.removePoolPlayer}
                                searchSelfUserId={selfUserId}
                            />
                        ) : (
                            <PlayersSection
                                isDoubles={s.isDoubles}
                                candidates={opponentCandidates}
                                pastOpponents={pastOpponents}
                                opponent={slot(s.opponent)}
                                partner={slot(s.partner)}
                                opponent2={slot(s.opponent2)}
                                searchSelfUserId={!s.isEdit ? selfUserId : undefined}
                                hideNtrpFor={s.hideNtrpFor}
                            />
                        )}
                        {s.rep && (
                            <ConfirmFlowNotice
                                opponentName={s.rep.opponent.slot.player.name.trim() || '상대'}
                                isDoubles={s.isDoubles}
                            />
                        )}
                    </FormSectionCard>
                </div>

                <div className="space-y-5">
                    <FormSectionCard title="경기 정보" step="03" contentClassName="space-y-4">
                        <MatchMetaSection
                            playedAt={s.playedAt} onPlayedAtChange={s.setPlayedAt}
                            playedTime={s.playedTime} onPlayedTimeChange={s.setPlayedTime}
                            surface={s.surface} onSurfaceChange={s.setSurface}
                        />
                        <PendingResultNotice existingSets={initialData?.setScores} variant={s.isRotation ? 'rotation' : 'default'} />
                    </FormSectionCard>
                    <FormSectionCard title="메모" step="선택">
                        <NotesSection notes={s.notes} onNotesChange={s.setNotes} />
                    </FormSectionCard>
                </div>
            </div>

            <FormFooter error={submit.error} isPending={submit.isPending} isValid={s.isValid} submitLabel={submitLabel} onCancel={submit.cancel} />
        </form>
    )
}
