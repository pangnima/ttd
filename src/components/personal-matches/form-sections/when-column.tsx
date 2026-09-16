'use client'

import { CalendarClock } from 'lucide-react'
import type { PersonalMatchSetScore } from '@/types'
import { findScheduleConflicts, formatScheduleConflicts, type ScheduleSlot } from '@/lib/personal-matches/schedule-conflict'
import { FormSectionCard } from '@/components/common/form-section-card'
import { PendingResultNotice } from '@/components/personal-matches/form-sections/pending-result-notice'
import { MatchMetaSection } from '@/components/personal-matches/form-sections/match-meta-section'
import { NotesSection } from '@/components/personal-matches/form-sections/notes-section'
import { RoomMetaSummaryCard } from '@/components/personal-matches/form-sections/room-meta-summary-card'
import { RoomScheduleFields } from '@/components/match-rooms/form-sections/room-schedule-section'
import type { PersonalMatchFormState } from '@/components/personal-matches/use-personal-match-form-state'

type Props = {
    s: PersonalMatchFormState
    recentCourtNames: string[]
    existingSets?: PersonalMatchSetScore[]
    variant?: 'page' | 'dialog'
    /** 내 미확정 일정 — 같은 날짜·시각이면 경고를 띄운다(0057). 방 게임은 메타가 고정이라 넘기지 않는다 */
    scheduleSlots?: ScheduleSlot[]
}

/** 등록 폼 우측 열 — "언제·어디서": 경기 정보 · 메모 · 매칭 리스트 노출(신규 등록만). 방 게임은 방 값 요약만 */
export function WhenColumn({ s, recentCourtNames, existingSets, variant = 'page', scheduleSlots = [] }: Props) {
    const conflicts = findScheduleConflicts(scheduleSlots, s.playedAt, s.playedTime)
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
                    // 회원이 끼면 저장이 곧 비노출 방 생성이다(0082) — 방의 시간 축(경기 시간·면 수)을 매칭 만들기와 같은 줄에
                    scheduleExtra={s.roomAutoCreate ? (
                        <RoomScheduleFields
                            durationMinutes={s.durationMinutes}
                            onDurationChange={s.setDurationMinutes}
                            courtCount={s.courtCount}
                            onCourtCountChange={s.setCourtCount}
                            playedTime={s.playedTime}
                            matchType={s.matchType}
                            playerCount={1 + s.directSplit.memberIds.length + s.directSplit.guests.length}
                        />
                    ) : undefined}
                />
                {/* 같은 시각에 이미 잡아 둔 일정 — 저장은 막지 않고 알리기만 한다(0057) */}
                {conflicts.length > 0 && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-spot/40 bg-spot/10 px-3 py-2.5">
                        <CalendarClock className="w-4 h-4 text-spot shrink-0 mt-0.5" />
                        <p className="text-caption text-muted-foreground break-keep">
                            <span className="text-foreground font-medium">이 시각에 이미 등록된 경기가 있습니다</span> —{' '}
                            {formatScheduleConflicts(conflicts)}. 같은 경기를 두 번 만들고 있는지 확인해주세요.
                        </p>
                    </div>
                )}
                <PendingResultNotice
                    existingSets={existingSets}
                    variant={s.roomAutoCreate ? 'room' : s.isRotation ? 'rotation' : 'default'}
                />
            </FormSectionCard>
            <FormSectionCard title="메모" step="선택">
                <NotesSection notes={s.notes} onNotesChange={s.setNotes} />
            </FormSectionCard>
            {/* '매칭 리스트에 노출' 토글은 Week 39에 사라졌다 — 방은 「매칭 만들기」(/match-rooms/new)로만 생긴다 */}
        </div>
    )
}
