'use client'

import type { PersonalMatchSetScore } from '@/types'
import { FormSectionCard } from '@/components/common/form-section-card'
import { PendingResultNotice } from '@/components/personal-matches/form-sections/pending-result-notice'
import { MatchMetaSection } from '@/components/personal-matches/form-sections/match-meta-section'
import { NotesSection } from '@/components/personal-matches/form-sections/notes-section'
import { ListingSection } from '@/components/personal-matches/form-sections/listing-section'
import { RoomMetaSummaryCard } from '@/components/personal-matches/form-sections/room-meta-summary-card'
import type { PersonalMatchFormState } from '@/components/personal-matches/use-personal-match-form-state'

type Props = {
    s: PersonalMatchFormState
    recentCourtNames: string[]
    existingSets?: PersonalMatchSetScore[]
    variant?: 'page' | 'dialog'
}

/** 등록 폼 우측 열 — "언제·어디서": 경기 정보 · 메모 · 매칭 리스트 노출(신규 등록만). 방 게임은 방 값 요약만 */
export function WhenColumn({ s, recentCourtNames, existingSets, variant = 'page' }: Props) {
    // 룸 안 다이얼로그에서는 RoomDetailHeader가 이미 일시·코트·표면을 보여주므로 요약 카드를 중복하지 않는다
    if (s.roomContext) return variant === 'dialog' ? null : <RoomMetaSummaryCard ctx={s.roomContext} step="02" />
    return (
        <div className="space-y-5">
            <FormSectionCard title="경기 정보" step="03" contentClassName="space-y-4">
                <MatchMetaSection
                    playedAt={s.playedAt} onPlayedAtChange={s.setPlayedAt}
                    playedTime={s.playedTime} onPlayedTimeChange={s.setPlayedTime}
                    surface={s.surface} onSurfaceChange={s.setSurface}
                    courtName={s.courtName} onCourtNameChange={s.setCourtName} recentCourtNames={recentCourtNames}
                />
                <PendingResultNotice existingSets={existingSets} variant={s.isRotation ? 'rotation' : 'default'} />
            </FormSectionCard>
            <FormSectionCard title="메모" step="선택">
                <NotesSection notes={s.notes} onNotesChange={s.setNotes} />
            </FormSectionCard>
            {/* 수정 모드는 방 관리(비밀번호 변경·내리기)를 방 상세의 방장 액션으로 하므로 토글을 두지 않는다 */}
            {!s.isEdit && (
                <FormSectionCard title="매칭 리스트" step="선택">
                    <ListingSection
                        listed={s.listed} onListedChange={s.setListed}
                        password={s.roomPassword} onPasswordChange={s.setRoomPassword}
                    />
                </FormSectionCard>
            )}
        </div>
    )
}
