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
import { createMatchGameAction, updateMatchGameAction, addGuestPlayerAction } from '@/lib/actions/match-games'
import { Plus, Trash2 } from 'lucide-react'
import type { Court, Match, MatchGame, MatchType, Round, TimeSlot, User } from '@/types'

const genId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

const MATCH_TYPE_LABELS: Record<MatchType, string> = {
    singles: '단식',
    men_doubles: '남복',
    women_doubles: '여복',
    mixed_doubles: '혼복',
}

const MATCH_TYPE_VARIANTS: Record<MatchType, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    singles: 'default',
    men_doubles: 'secondary',
    women_doubles: 'outline',
    mixed_doubles: 'destructive',
}

type SimpleMatchEntry = {
    id: string
    courtLabel: string
    startAt: string
    endAt: string
    matchType: MatchType
    player1Id: string
    player2Id: string
    team1: [string, string]
    team2: [string, string]
}

type MatchGameCreateFormProps = {
    clubId: string
    members: User[]
    initialData?: MatchGame
}

// 편집 진입 시 정규화된 MatchGame → 평면 SimpleMatchEntry[] 역매핑.
// DB에는 courtId/timeSlotId(UUID)만 저장되므로, 폼 입력값(label 문자열/시각 문자열)을
// 복원하려면 courts/rounds 배열을 역참조해야 한다.
// timeSlot은 round 안에 중첩되어 있으므로 rounds를 순회하며 탐색한다.
function matchGameToEntries(matchGame: MatchGame): SimpleMatchEntry[] {
    return matchGame.matches.map((m) => {
        const court = matchGame.courts.find((c) => c.id === m.courtId)
        let startAt = ''
        let endAt = ''
        for (const round of matchGame.rounds) {
            const ts = round.timeSlots.find((t) => t.id === m.timeSlotId)
            if (ts) { startAt = ts.startAt; endAt = ts.endAt; break }
        }
        return {
            id: m.id,
            courtLabel: court?.label ?? '',
            startAt,
            endAt,
            matchType: m.matchType,
            player1Id: m.player1Id ?? '',
            player2Id: m.player2Id ?? '',
            team1: (m.team1 ?? ['', '']) as [string, string],
            team2: (m.team2 ?? ['', '']) as [string, string],
        }
    })
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
    // email/gender/ntrp 등 placeholder 값은 타입 충족용이며 실제 의미 없음 —
    // 게스트는 Auth 계정이 없으므로 해당 필드를 입력·사용하는 경로가 없다.
    const handleCreatePlayer = (nickname: string) => {
        startTransition(async () => {
            const result = await addGuestPlayerAction(clubId, nickname)
            if (!result.ok) {
                setError(result.error)
                return
            }
            const guest: User = {
                id: result.userId!,
                email: '',
                name: nickname,
                nickname,
                role: 'member',
                phone: '',
                gender: 'male',
                dominantHand: 'right',
                ntrp: 0,
                tennisStartDate: '',
                createdAt: new Date().toISOString(),
                isGuest: true,
            }
            setAllPlayers((prev) => [...prev, guest])
        })
        return ''
    }

    const addEntry = () => {
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
    }

    const updateEntry = (id: string, patch: Partial<SimpleMatchEntry>) =>
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))

    const removeEntry = (id: string) => setEntries((prev) => prev.filter((e) => e.id !== id))

    const updateTeamPlayer = (entryId: string, team: 'team1' | 'team2', index: 0 | 1, userId: string) => {
        setEntries((prev) =>
            prev.map((e) => {
                if (e.id !== entryId) return e
                const t = [...e[team]] as [string, string]
                t[index] = userId
                return { ...e, [team]: t }
            })
        )
    }

    const handleSubmit = () => {
        setError(null)

        if (!name.trim()) { setError('대진표 이름을 입력해주세요.'); return }
        if (!date) { setError('날짜를 입력해주세요.'); return }
        if (entries.length === 0) { setError('게임을 1개 이상 추가해주세요.'); return }

        for (const e of entries) {
            if (!e.courtLabel.trim()) { setError('모든 게임의 코트를 입력해주세요.'); return }
            if (!e.startAt || !e.endAt) { setError('모든 게임의 시간을 입력해주세요.'); return }
            if (e.matchType === 'singles') {
                if (!e.player1Id || !e.player2Id) { setError('모든 게임의 선수를 선택해주세요.'); return }
                if (e.player1Id === e.player2Id) { setError('같은 선수를 두 번 선택할 수 없습니다.'); return }
            } else {
                if (!e.team1[0] || !e.team2[0]) { setError('모든 게임의 선수를 선택해주세요.'); return }
            }
        }

        // 평면 SimpleMatchEntry[] → 정규화된 courts / rounds / matches 3계층으로 변환.
        // 폼은 "코트명 문자열 + 시작/종료 시각"으로 입력받으나, DB는 UUID 기반 정규화 구조를 요구하므로
        // 여기서 중복을 제거하고 ID를 생성한다.
        //
        // 코트: 동일 label이 여러 경기에 반복되어도 Court row는 한 개. Set으로 중복 제거.
        // 타임슬롯: "startAt|endAt" 복합 키로 중복 판단 — 시각이 같으면 같은 슬롯.
        // 라운드: 현재 폼은 단일 라운드("1st")만 지원. 다중 라운드가 필요하면 폼 구조부터 변경 필요.
        const uniqueCourtLabels = [...new Set(entries.map((e) => e.courtLabel.trim()))]
        const courts: Court[] = uniqueCourtLabels.map((label, i) => ({
            id: genId('court'),
            label,
            order: i + 1,
        }))

        const slotMap = new Map<string, TimeSlot>()
        for (const e of entries) {
            const key = `${e.startAt}|${e.endAt}`
            if (!slotMap.has(key)) {
                slotMap.set(key, { id: genId('ts'), startAt: e.startAt, endAt: e.endAt })
            }
        }
        const timeSlots = [...slotMap.values()]
        const round: Round = { id: genId('round'), label: '1st', order: 1, timeSlots }

        // 단식/복식 필드는 상호 배제 — DB Match 타입 규약과 동일.
        const matches: Match[] = entries.map((e, i) => {
            const court = courts.find((c) => c.label === e.courtLabel.trim())!
            const slot = slotMap.get(`${e.startAt}|${e.endAt}`)!
            return {
                id: genId(`m${i}`),
                matchGameId: '',
                roundId: round.id,
                courtId: court.id,
                timeSlotId: slot.id,
                matchType: e.matchType,
                ...(e.matchType === 'singles'
                    ? { player1Id: e.player1Id, player2Id: e.player2Id }
                    : { team1: e.team1.filter(Boolean), team2: e.team2.filter(Boolean) }),
                status: 'scheduled',
            }
        })

        startTransition(async () => {
            const result = initialData
                ? await updateMatchGameAction(clubId, initialData.id, name.trim(), date, courts, [round], matches)
                : await createMatchGameAction(clubId, name.trim(), date, courts, [round], matches)
            if (!result.ok) {
                setError(result.error)
                return
            }
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
                                                    users={allPlayers}
                                                    value={entry.player1Id}
                                                    onChange={(id) => updateEntry(entry.id, { player1Id: id })}
                                                    placeholder="선수 선택"
                                                    onCreatePlayer={handleCreatePlayer}
                                                />
                                            ) : (
                                                <div className="space-y-1">
                                                    <PlayerSelect
                                                        users={allPlayers}
                                                        value={entry.team1[0]}
                                                        onChange={(id) => updateTeamPlayer(entry.id, 'team1', 0, id)}
                                                        placeholder="A팀 1번"
                                                        onCreatePlayer={handleCreatePlayer}
                                                    />
                                                    <PlayerSelect
                                                        users={allPlayers}
                                                        value={entry.team1[1]}
                                                        onChange={(id) => updateTeamPlayer(entry.id, 'team1', 1, id)}
                                                        placeholder="A팀 2번"
                                                        onCreatePlayer={handleCreatePlayer}
                                                    />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="pt-3">
                                            {isSingles ? (
                                                <PlayerSelect
                                                    users={allPlayers}
                                                    value={entry.player2Id}
                                                    onChange={(id) => updateEntry(entry.id, { player2Id: id })}
                                                    placeholder="선수 선택"
                                                    onCreatePlayer={handleCreatePlayer}
                                                />
                                            ) : (
                                                <div className="space-y-1">
                                                    <PlayerSelect
                                                        users={allPlayers}
                                                        value={entry.team2[0]}
                                                        onChange={(id) => updateTeamPlayer(entry.id, 'team2', 0, id)}
                                                        placeholder="B팀 1번"
                                                        onCreatePlayer={handleCreatePlayer}
                                                    />
                                                    <PlayerSelect
                                                        users={allPlayers}
                                                        value={entry.team2[1]}
                                                        onChange={(id) => updateTeamPlayer(entry.id, 'team2', 1, id)}
                                                        placeholder="B팀 2번"
                                                        onCreatePlayer={handleCreatePlayer}
                                                    />
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
