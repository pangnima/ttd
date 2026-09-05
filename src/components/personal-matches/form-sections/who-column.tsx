'use client'

import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import { MATCH_TYPE_OPTIONS } from '@/lib/dashboard/match-type-style'
import { FormSectionCard } from '@/components/common/form-section-card'
import { FieldToggle } from '@/components/common/field-toggle'
import { ConfirmFlowNotice } from '@/components/personal-matches/form-sections/confirm-flow-notice'
import { PlayersSection } from '@/components/personal-matches/form-sections/players-section'
import { RecruitingPlayersSection } from '@/components/personal-matches/form-sections/recruiting-players-section'
import { DoublesModeToggle } from '@/components/personal-matches/doubles-mode-toggle'
import { PlayerPoolSection } from '@/components/personal-matches/rotation/player-pool-section'
import type { PersonalMatchFormState } from '@/components/personal-matches/use-personal-match-form-state'

type Props = {
    s: PersonalMatchFormState
    opponentCandidates: OpponentCandidate[]
    pastOpponents: PastOpponent[]
    roomParticipants?: OpponentCandidate[]
    selfUserId?: string
}

/** 등록 폼 좌측 열 — "누구와": 경기 타입(+복식 방식) · 참가자. 방 게임은 타입이 방 값으로 고정돼 참가자 카드만 */
export function WhoColumn({ s, opponentCandidates, pastOpponents, roomParticipants, selfUserId }: Props) {
    const slot = (x: typeof s.opponent) => ({ player: x.player, onPlayerChange: x.setPlayer, ntrp: x.ntrp, onNtrpChange: x.setNtrp })
    const slots = { opponent: slot(s.opponent), partner: slot(s.partner), opponent2: slot(s.opponent2) }
    const participantsTitle = s.isRotation || s.allowEmptyPlayers ? '참가자 (나 제외)' : s.isDoubles ? '참가자' : '상대'
    // 모집형 수정(빈 자리 채우기)에서는 수정 모드여도 전체 회원 검색을 연다
    const searchSelfUserId = !s.isEdit || s.allowEmptyPlayers ? selfUserId : undefined

    return (
        <div className="space-y-5">
            {!s.isRoomGame && (
                <FormSectionCard title="경기 타입" step="01" contentClassName="space-y-4">
                    <FieldToggle label="경기 타입" required options={MATCH_TYPE_OPTIONS} value={s.matchType} onChange={s.setMatchType} />
                    {/* 복식 신규 등록 시에만 방식 토글 노출 (수정 모드는 단일 레코드라 미지원) */}
                    {s.isDoubles && !s.isEdit && <DoublesModeToggle value={s.doublesMode} onChange={s.setDoublesMode} />}
                </FormSectionCard>
            )}

            <FormSectionCard title={participantsTitle} step={s.isRoomGame ? '01' : '02'} contentClassName="space-y-4">
                {s.allowEmptyPlayers && (
                    <p className="text-caption text-muted-foreground break-keep">
                        매칭 리스트에 노출되므로 참가자를 비워 두고 모집할 수 있습니다. 채운 회원은 방에 자동 초대됩니다.
                    </p>
                )}
                {s.isRoomGame && (
                    <p className="text-caption text-muted-foreground break-keep">
                        {s.viewerIsHost
                            ? '방에 참가한 회원이 자동완성 맨 위에 뜹니다. 방 밖의 상대도 입력할 수 있습니다.'
                            : '방에 참가한 회원 중에서 함께 친 상대를 고르세요.'}
                    </p>
                )}
                {s.isRotation ? (
                    <PlayerPoolSection
                        pool={s.rotation.pool}
                        candidates={opponentCandidates}
                        pastOpponents={pastOpponents}
                        onAdd={s.rotation.addPoolPlayer}
                        onUpdate={s.rotation.updatePoolPlayer}
                        onRemove={s.rotation.removePoolPlayer}
                        searchSelfUserId={selfUserId}
                        allowEmpty={s.allowEmptyPlayers}
                    />
                ) : s.allowEmptyPlayers ? (
                    <RecruitingPlayersSection
                        isDoubles={s.isDoubles}
                        candidates={opponentCandidates}
                        pastOpponents={pastOpponents}
                        roomParticipants={roomParticipants}
                        slots={slots}
                        openSlots={s.openSlots}
                        onOpenSlot={s.openSlot}
                        onCloseSlot={s.closeSlot}
                        searchSelfUserId={searchSelfUserId}
                        hideNtrpFor={s.hideNtrpFor}
                    />
                ) : (
                    <PlayersSection
                        isDoubles={s.isDoubles}
                        candidates={opponentCandidates}
                        pastOpponents={pastOpponents}
                        roomParticipants={roomParticipants}
                        opponent={slots.opponent}
                        partner={slots.partner}
                        opponent2={slots.opponent2}
                        searchSelfUserId={searchSelfUserId}
                        hideNtrpFor={s.hideNtrpFor}
                    />
                )}
                {s.rep && (
                    <ConfirmFlowNotice
                        opponentName={s.rep.opponent.slot.player.name.trim() || '상대'}
                        isDoubles={s.isDoubles}
                        isRoomGame={!!s.roomId}
                    />
                )}
            </FormSectionCard>
        </div>
    )
}
