'use client'

import { Check } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { OpponentCandidate } from '@/lib/queries/users'
import { derivePublicNtrp } from '@/lib/personal-matches/ntrp'
import { formatDominantHand } from '@/lib/profile/signup-fields'
import { NTRP_BADGE, memberStatusChipClass } from '@/lib/dashboard/member-badges'
import { TYPO } from '@/lib/dashboard/tokens'

type Props = {
    candidate: OpponentCandidate
    selected: boolean
    /** false면 눌러도 아무 일이 없다 — 왜 못 고르는지는 label이 말한다 */
    selectable?: boolean
    /** 우측 상태 칩(참가·초대 대기·내보내짐…). 없으면 선택 표시만 */
    label?: string
    onToggle: () => void
}

/**
 * 회원 검색 결과 1행 — 룸 명단 행(RoomMemberRow)과 같은 골격: 아바타 · 이름 · NTRP 배지 / 닉네임 · 주력손.
 * 행 전체가 토글 버튼이다(aria-pressed). 못 고르는 사람도 **감추지 않고** 비활성 + 라벨로 보인다 —
 * 찾은 사람이 목록에 없으면 "검색이 안 된다"로 읽힌다.
 */
export function MemberResultRow({ candidate, selected, selectable = true, label, onToggle }: Props) {
    const ntrp = derivePublicNtrp(candidate)
    const meta = [candidate.nickname, formatDominantHand(candidate.dominantHand)].filter(Boolean).join(' · ')

    return (
        <li>
            <button
                type="button"
                aria-pressed={selected}
                disabled={!selectable}
                onClick={onToggle}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors
                    ${selected ? 'bg-primary/5' : 'hover:bg-muted/50'}
                    disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent`}
            >
                <Avatar className="w-8 h-8 shrink-0">
                    {candidate.profileImage && <AvatarImage src={candidate.profileImage} alt={candidate.name} />}
                    <AvatarFallback className="bg-muted text-muted-foreground text-caption font-bold">{candidate.name[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-body2 font-medium text-foreground truncate">{candidate.name}</span>
                        {ntrp != null && <span className={NTRP_BADGE}>NTRP {ntrp.toFixed(1)}</span>}
                    </div>
                    {meta && <p className={`${TYPO.caption} truncate`}>{meta}</p>}
                </div>
                {label && <span className={memberStatusChipClass(label)}>{label}</span>}
                {/* 고를 수 있는 행에만 체크 자리 — 라벨이 있어도(재초대 가능한 내보내짐·나감) 선택 표시는 필요하다 */}
                {selectable && (
                    <span
                        aria-hidden
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors
                            ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent'}`}
                    >
                        <Check className="size-3.5" />
                    </span>
                )}
            </button>
        </li>
    )
}
