'use client'

import { Badge } from '@/components/ui/badge'
import { PlayerSelect } from '@/components/match-games/player-select'
import { sortByGender } from '@/lib/match-games/form-mapping'
import { X } from 'lucide-react'
import type { User } from '@/types'

const GENDER_EMOJI: Record<'male' | 'female', string> = { male: '♂️', female: '♀️' }

type AttendeePickerProps = {
    allPlayers: User[]
    attendeeIds: string[]
    onAdd: (id: string) => void
    onRemove: (id: string) => void
    onCreatePlayer: (nickname: string, gender: 'male' | 'female') => string
}

export function AttendeePicker({ allPlayers, attendeeIds, onAdd, onRemove, onCreatePlayer }: AttendeePickerProps) {
    // 아직 참석자가 아닌 후보만 콤보박스에 노출 (남성→여성 순)
    const available = sortByGender(allPlayers.filter((p) => !attendeeIds.includes(p.id)))
    // 참석자 칩도 남성→여성 순으로 정렬
    const attendees = sortByGender(allPlayers.filter((p) => attendeeIds.includes(p.id)))

    return (
        <div className="space-y-3">
            <div className="max-w-xs">
                <PlayerSelect
                    users={available}
                    value=""
                    onChange={onAdd}
                    placeholder="참석자 이름 검색..."
                    onCreatePlayer={onCreatePlayer}
                />
            </div>

            {attendees.length === 0 ? (
                <p className="text-sm text-muted-foreground">참석자를 추가해주세요.</p>
            ) : (
                <div className="flex flex-wrap gap-1.5">
                    {attendees.map((user) => (
                        <Badge key={user.id} variant="secondary" className="gap-1 pr-1 text-xs font-normal">
                            <span>{GENDER_EMOJI[user.gender]}</span>
                            <span>{user.nickname}</span>
                            {user.isGuest && <span className="text-muted-foreground">(게스트)</span>}
                            <button
                                type="button"
                                onClick={() => onRemove(user.id)}
                                className="ml-0.5 rounded-sm p-0.5 hover:bg-foreground/10"
                                aria-label={`${user.nickname} 삭제`}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    )
}
