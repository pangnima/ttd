'use client'

import { Plus } from 'lucide-react'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import type { NtrpField } from '@/lib/personal-matches/validate-input'
import { cn } from '@/lib/utils'
import { PlayerNtrpField } from '@/components/personal-matches/player-ntrp-field'
import type { PlayerFieldState } from '@/components/personal-matches/form-sections/players-section'
import { AddButton, ADD_BUTTON_CLASS } from '@/components/personal-matches/add-button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

type Props = {
    isDoubles: boolean
    candidates: OpponentCandidate[]
    pastOpponents: PastOpponent[]
    roomParticipants?: OpponentCandidate[]
    slots: Record<NtrpField, PlayerFieldState>
    openSlots: NtrpField[]
    onOpenSlot: (key: NtrpField) => void
    onCloseSlot: (key: NtrpField) => void
    searchSelfUserId?: string
    hideNtrpFor?: NtrpField[]
}

const PLACEHOLDER: Record<NtrpField, string> = {
    partner: '파트너 이름 또는 닉네임',
    opponent: '상대방 이름 또는 닉네임',
    opponent2: '상대방 이름 또는 닉네임',
}

function slotLabel(key: NtrpField, isDoubles: boolean): string {
    if (key === 'partner') return '내 파트너'
    if (key === 'opponent2') return '상대팀 선수 2'
    return isDoubles ? '상대팀 선수 1' : '상대'
}

/**
 * 모집형(리스트에 노출) 참가자 입력 — 빈 슬롯을 미리 그리지 않고 '참가자 추가'로 연 슬롯만 보여 준다(0048).
 * 열린 슬롯은 이름·손잡이·NTRP가 모두 필수이고 '삭제'로 닫는다. 닫힌 슬롯은 매칭 리스트에서 모집한다.
 * 복식은 어느 자리(내 파트너/상대 1/상대 2)를 열지 메뉴에서 고른다.
 */
export function RecruitingPlayersSection({
    isDoubles, candidates, pastOpponents, roomParticipants, slots, openSlots, onOpenSlot, onCloseSlot, searchSelfUserId, hideNtrpFor = [],
}: Props) {
    const order: NtrpField[] = isDoubles ? ['partner', 'opponent', 'opponent2'] : ['opponent']
    const open = order.filter((k) => openSlots.includes(k))
    const closed = order.filter((k) => !openSlots.includes(k))

    return (
        <div className="space-y-4">
            {open.length === 0 && (
                <p className="text-body2 text-muted-foreground">비워 두면 매칭 리스트에서 참가자를 모집합니다.</p>
            )}
            <div>
                {open.map((key, i) => (
                    <div key={key} className={cn('space-y-2', i > 0 && 'mt-6 border-t border-border pt-6')}>
                        <div className="flex items-center justify-between">
                            <span className="text-caption font-semibold text-foreground">{slotLabel(key, isDoubles)}</span>
                            <button type="button" onClick={() => onCloseSlot(key)} className="text-caption text-destructive/80 hover:text-destructive">
                                삭제
                            </button>
                        </div>
                        <PlayerNtrpField
                            label="이름"
                            candidates={candidates}
                            pastOpponents={pastOpponents}
                            roomParticipants={roomParticipants}
                            player={slots[key].player}
                            onPlayerChange={slots[key].onPlayerChange}
                            ntrp={slots[key].ntrp}
                            onNtrpChange={slots[key].onNtrpChange}
                            ntrpRequired
                            placeholder={PLACEHOLDER[key]}
                            searchSelfUserId={searchSelfUserId}
                            hideNtrp={hideNtrpFor.includes(key)}
                        />
                    </div>
                ))}
            </div>
            {closed.length > 0 && (isDoubles ? (
                <DropdownMenu>
                    <DropdownMenuTrigger className={ADD_BUTTON_CLASS}>
                        <Plus className="size-4" />
                        참가자 추가
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {closed.map((key) => (
                            <DropdownMenuItem key={key} onClick={() => onOpenSlot(key)}>{slotLabel(key, true)}</DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <AddButton label="참가자 추가" onClick={() => onOpenSlot('opponent')} />
            ))}
        </div>
    )
}
