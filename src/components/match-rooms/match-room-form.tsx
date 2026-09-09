'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CourtSurface } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import { createMatchRoomAction } from '@/lib/actions/match-rooms'
import { Button } from '@/components/ui/button'
import { FormSectionCard } from '@/components/common/form-section-card'
import { MatchMetaSection } from '@/components/personal-matches/form-sections/match-meta-section'
import { NotesSection } from '@/components/personal-matches/form-sections/notes-section'
import { RoomFormatSection } from '@/components/match-rooms/form-sections/room-format-section'
import { RoomPasswordSection } from '@/components/match-rooms/form-sections/room-password-section'
import { RoomInviteeSection } from '@/components/match-rooms/form-sections/room-invitee-section'
import { useMatchRoomFormState } from '@/components/match-rooms/use-match-room-form-state'

type Props = {
    selfUserId: string
    opponentCandidates: OpponentCandidate[]
    recentCourtNames: string[]
}

/**
 * 「매칭 만들기」 — 경기 전에 방을 연다. 스코어도 라인업도 받지 않는다:
 * 참가자는 초대 수락·비밀번호 입장으로 채워지고, 대진과 결과는 매칭 룸 안에서 끝난다.
 */
export function MatchRoomForm({ selfUserId, opponentCandidates, recentCourtNames }: Props) {
    const s = useMatchRoomFormState()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        if (!s.isValid) {
            setError('필수 항목을 모두 정확히 입력해주세요.')
            return
        }
        startTransition(async () => {
            const res = await createMatchRoomAction(s.buildInput())
            // 방은 만들어졌는데 초대만 실패한 경우 — 방으로 보내고 룸에서 다시 부르게 한다
            if (res.roomId) router.push(`/match-rooms/${res.roomId}`)
            else setError(res.error ?? '매칭을 만들지 못했습니다.')
        })
    }

    return (
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl space-y-5">
            <FormSectionCard title="경기 방식" step="01">
                <RoomFormatSection
                    format={s.format} onFormatChange={s.setFormat}
                    matchType={s.matchType} onMatchTypeChange={s.setMatchType}
                />
            </FormSectionCard>

            <FormSectionCard title="경기 정보" step="02" contentClassName="space-y-4">
                <MatchMetaSection
                    playedAt={s.playedAt} onPlayedAtChange={s.setPlayedAt}
                    playedTime={s.playedTime} onPlayedTimeChange={s.setPlayedTime}
                    surface={s.surface} onSurfaceChange={(v: CourtSurface) => s.setSurface(v)}
                    courtName={s.courtName} onCourtNameChange={s.setCourtName}
                    recentCourtNames={recentCourtNames}
                />
            </FormSectionCard>

            <FormSectionCard title="참가" step="03" contentClassName="space-y-5">
                <RoomPasswordSection password={s.password} onPasswordChange={s.setPassword} />
                <RoomInviteeSection
                    selfUserId={selfUserId}
                    candidates={opponentCandidates}
                    invitees={s.invitees}
                    onAdd={s.addInvitee}
                    onRemove={s.removeInvitee}
                />
            </FormSectionCard>

            <FormSectionCard title="메모" step="선택">
                <NotesSection notes={s.notes} onNotesChange={s.setNotes} />
            </FormSectionCard>

            {error && <p className="text-body2 text-destructive break-keep">{error}</p>}

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
                    취소
                </Button>
                <Button type="submit" disabled={!s.isValid || isPending}>
                    {isPending ? '만드는 중…' : '매칭 만들기'}
                </Button>
            </div>
        </form>
    )
}
