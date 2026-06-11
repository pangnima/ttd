'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PlayerSelect } from '@/components/match-games/player-select'
import { sortByGender } from '@/lib/match-games/form-mapping'
import { UsersRound, X } from 'lucide-react'
import type { User } from '@/types'

const GENDER_EMOJI: Record<'male' | 'female', string> = { male: '♂️', female: '♀️' }

type AttendeePickerProps = {
    allPlayers: User[]
    attendeeIds: string[]
    onAdd: (id: string) => void
    onAddAll: () => void
    onRemove: (id: string) => void
    onCreatePlayer: (nickname: string, gender: 'male' | 'female') => string
}

export function AttendeePicker({ allPlayers, attendeeIds, onAdd, onAddAll, onRemove, onCreatePlayer }: AttendeePickerProps) {
    // 아직 참석자가 아닌 후보만 콤보박스에 노출 (남성→여성 순)
    const available = sortByGender(allPlayers.filter((p) => !attendeeIds.includes(p.id)))
    // 참석자 칩도 남성→여성 순으로 정렬
    const attendees = sortByGender(allPlayers.filter((p) => attendeeIds.includes(p.id)))
    // 전체 등록 대상은 정회원만 (게스트 제외)
    const addableMemberCount = available.filter((p) => !p.isGuest).length

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div className="max-w-xs flex-1">
                    <PlayerSelect
                        users={available}
                        value=""
                        onChange={onAdd}
                        placeholder="참석자 이름 검색..."
                        onCreatePlayer={onCreatePlayer}
                    />
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 gap-1 text-xs"
                    onClick={onAddAll}
                    disabled={addableMemberCount === 0}
                >
                    <UsersRound className="h-3.5 w-3.5" /> 전체 등록
                </Button>
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
