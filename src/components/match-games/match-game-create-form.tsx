'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { PlayerSelect } from '@/components/match-games/player-select'
import { cn } from '@/lib/utils'
import { MATCH_TYPE_LABELS } from '@/lib/dashboard/match-type-style'
import {
    genId,
    filterCandidates,
    matchGameToEntries,
    validateEntries,
    buildMatchGamePayload,
    type SimpleMatchEntry,
} from '@/lib/match-games/form-mapping'
import { createMatchGameAction, updateMatchGameAction, addGuestPlayerAction } from '@/lib/actions/match-games'
import { Plus, Trash2 } from 'lucide-react'
import type { MatchGame, MatchType, User } from '@/types'

const MATCH_TYPE_VARIANTS: Record<MatchType, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    singles: 'default',
    men_doubles: 'secondary',
    women_doubles: 'outline',
    mixed_doubles: 'destructive',
}

type MatchGameCreateFormProps = {
    clubId: string
    members: User[]
    initialData?: MatchGame
}

export function MatchGameCreateForm({ clubId, members: initialMembers, initialData }: MatchGameCreateFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [name, setName] = useState(initialData?.name ?? '')
    const [date, setDate] = useState(initialData?.date ?? '')
    const [entries, setEntries] = useState<SimpleMatchEntry[]>(() =>
        initialData ? matchGameToEntries(initialData) : []
    )
    const [allPlayers, setAllPlayers] = useState<User[]>(initialMembers)
    const [error, setError] = useState<string | null>(null)

    // DB에 게스트 row를 생성하고, 성공 시 클라이언트 목록에 즉시 추가한다.
    // 페이지 새로고침 없이 바로 선택 가능해야 UX가 끊기지 않기 때문.
    const handleCreatePlayer = (nickname: string, gender: 'male' | 'female') => {
        startTransition(async () => {
            const result = await addGuestPlayerAction(clubId, nickname, gender)
            if (!result.ok) { setError(result.error); return }
            const guest: User = {
                id: result.userId!,
                email: '',
                name: nickname,
                nickname,
                role: 'member',
                phone: '',
                gender,
                dominantHand: 'right',
                ntrp: 0,
                tennisStartDate: '',
                createdAt: new Date().toISOString(),
                isGuest: true,
                statsHidden: false,
            }
            setAllPlayers((prev) => [...prev, guest])
        })
        return ''
    }

    const addEntry = () =>
        setEntries((prev) => [
            ...prev,
            {
                id: genId('match'),
                courtLabel: '1코트',
                startAt: '09:00',
                endAt: '09:30',
                matchType: 'singles',
                player1Id: '',
                player2Id: '',
                team1: ['', ''],
                team2: ['', ''],
            },
        ])

    const updateEntry = (id: string, patch: Partial<SimpleMatchEntry>) =>
        setEntries((prev) =>
            prev.map((e) => {
                if (e.id !== id) return e
                const next = { ...e, ...patch }
                if (patch.matchType && patch.matchType !== e.matchType) {
                    next.player1Id = ''
                    next.player2Id = ''
                    next.team1 = ['', '']
                    next.team2 = ['', '']
                }
                return next
            })
        )

    const removeEntry = (id: string) => setEntries((prev) => prev.filter((e) => e.id !== id))

    const updateTeamPlayer = (entryId: string, team: 'team1' | 'team2', index: 0 | 1, userId: string) =>
        setEntries((prev) =>
            prev.map((e) => {
                if (e.id !== entryId) return e
                const t = [...e[team]] as [string, string]
                t[index] = userId
                return { ...e, [team]: t }
            })
        )

    const handleSubmit = () => {
        setError(null)
        if (!name.trim()) { setError('대진표 이름을 입력해주세요.'); return }
        if (!date) { setError('날짜를 입력해주세요.'); return }

        const validationError = validateEntries(entries, allPlayers)
        if (validationError) { setError(validationError); return }

        const { courts, rounds, matches } = buildMatchGamePayload(entries)

        startTransition(async () => {
            const result = initialData
                ? await updateMatchGameAction(clubId, initialData.id, name.trim(), date, courts, rounds, matches)
                : await createMatchGameAction(clubId, name.trim(), date, courts, rounds, matches)
            if (!result.ok) { setError(result.error); return }
            router.push(`/clubs/${clubId}/match-games`)
        })
    }

    return (
        <div className="w-full space-y-5">
            <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                    <Label htmlFor="name">대진표 이름 *</Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="예: 5월 정기 대진표"
                        maxLength={40}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="date">날짜 *</Label>
                    <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-40"
                    />
                </div>
            </div>

            <div className="rounded-lg border">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="text-sm font-medium">게임 목록</span>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addEntry}>
                        <Plus className="w-3 h-3" /> 게임 추가
                    </Button>
                </div>

                {entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">
                        게임 추가 버튼을 눌러 게임을 등록하세요.
                    </p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-24">코트</TableHead>
                                <TableHead className="w-44">시간</TableHead>
                                <TableHead className="w-24">종류</TableHead>
                                <TableHead>플레이어 1</TableHead>
                                <TableHead>플레이어 2</TableHead>
                                <TableHead className="w-10 text-right">관리</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.map((entry) => {
                                const isSingles = entry.matchType === 'singles'
                                const candidates = filterCandidates(allPlayers, entry.matchType)
                                return (
                                    <TableRow key={entry.id} className="align-top">
                                        <TableCell className="pt-3">
                                            <Input
                                                value={entry.courtLabel}
                                                onChange={(e) => updateEntry(entry.id, { courtLabel: e.target.value })}
                                                className="h-8 text-xs w-20"
                                                placeholder="1코트"
                                            />
                                        </TableCell>
                                        <TableCell className="pt-3">
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    value={entry.startAt}
                                                    onChange={(e) => updateEntry(entry.id, { startAt: e.target.value })}
                                                    className="h-8 text-xs w-16"
                                                    placeholder="09:00"
                                                />
                                                <span className="text-xs text-muted-foreground shrink-0">~</span>
                                                <Input
                                                    value={entry.endAt}
                                                    onChange={(e) => updateEntry(entry.id, { endAt: e.target.value })}
                                                    className="h-8 text-xs w-16"
                                                    placeholder="09:30"
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="pt-3">
                                            <Select
                                                value={entry.matchType}
                                                onValueChange={(v) => updateEntry(entry.id, { matchType: v as MatchType })}
                                            >
                                                <SelectTrigger className="h-8 text-xs w-20">
                                                    <Badge variant={MATCH_TYPE_VARIANTS[entry.matchType]} className="text-xs px-1.5">
                                                        {MATCH_TYPE_LABELS[entry.matchType]}
                                                    </Badge>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="singles">단식</SelectItem>
                                                    <SelectItem value="men_doubles">남복</SelectItem>
                                                    <SelectItem value="women_doubles">여복</SelectItem>
                                                    <SelectItem value="mixed_doubles">혼복</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="pt-3">
                                            {isSingles ? (
                                                <PlayerSelect
                                                    users={candidates}
                                                    value={entry.player1Id}
                                                    onChange={(id) => updateEntry(entry.id, { player1Id: id })}
                                                    placeholder="선수 선택"
                                                    onCreatePlayer={handleCreatePlayer}
                                                />
                                            ) : (
                                                <div className="space-y-1">
                                                    <PlayerSelect users={candidates} value={entry.team1[0]} onChange={(id) => updateTeamPlayer(entry.id, 'team1', 0, id)} placeholder="A팀 1번" onCreatePlayer={handleCreatePlayer} />
                                                    <PlayerSelect users={candidates} value={entry.team1[1]} onChange={(id) => updateTeamPlayer(entry.id, 'team1', 1, id)} placeholder="A팀 2번" onCreatePlayer={handleCreatePlayer} />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="pt-3">
                                            {isSingles ? (
                                                <PlayerSelect
                                                    users={candidates}
                                                    value={entry.player2Id}
                                                    onChange={(id) => updateEntry(entry.id, { player2Id: id })}
                                                    placeholder="선수 선택"
                                                    onCreatePlayer={handleCreatePlayer}
                                                />
                                            ) : (
                                                <div className="space-y-1">
                                                    <PlayerSelect users={candidates} value={entry.team2[0]} onChange={(id) => updateTeamPlayer(entry.id, 'team2', 0, id)} placeholder="B팀 1번" onCreatePlayer={handleCreatePlayer} />
                                                    <PlayerSelect users={candidates} value={entry.team2[1]} onChange={(id) => updateTeamPlayer(entry.id, 'team2', 1, id)} placeholder="B팀 2번" onCreatePlayer={handleCreatePlayer} />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="pt-3 text-right">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => removeEntry(entry.id)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            {initialData && (
                <p className="text-xs text-muted-foreground text-center">
                    선수가 바뀐 경기의 점수는 초기화됩니다.
                </p>
            )}

            <div className="flex gap-2">
                <Button type="button" onClick={handleSubmit} disabled={isPending} className="flex-1">
                    {isPending ? '저장 중...' : initialData ? '수정 저장' : '저장하기'}
                </Button>
                <Link
                    href={`/clubs/${clubId}/match-games`}
                    className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 justify-center')}
                >
                    취소
                </Link>
            </div>
        </div>
    )
}
