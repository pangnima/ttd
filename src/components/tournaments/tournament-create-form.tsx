'use client'

import { useState, useEffect } from 'react'
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
import { PlayerSelect } from '@/components/tournaments/player-select'
import { cn } from '@/lib/utils'
import { saveTournament } from '@/lib/store/tournament-store'
import { getMembersByClubId } from '@/lib/store/club-member-store'
import { getGuestPlayers, saveGuestPlayer } from '@/lib/store/guest-player-store'
import { getUserById } from '@/lib/dummy/users'
import { Plus, Trash2 } from 'lucide-react'
import type { Court, Game, MatchType, Round, TimeSlot, Tournament, User } from '@/types'

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

type SimpleGameEntry = {
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

type TournamentCreateFormProps = {
    clubId: string
}

export function TournamentCreateForm({ clubId }: TournamentCreateFormProps) {
    const router = useRouter()
    const [name, setName] = useState('')
    const [date, setDate] = useState('')
    const [games, setGames] = useState<SimpleGameEntry[]>([])
    const [allPlayers, setAllPlayers] = useState<User[]>([])
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        const memberRecords = getMembersByClubId(clubId)
        const memberUsers = memberRecords
            .map((m) => getUserById(m.userId))
            .filter((u): u is User => u !== undefined)
        const guests = getGuestPlayers()
        const seen = new Set(memberUsers.map((u) => u.id))
        const newGuests = guests.filter((u) => !seen.has(u.id))
        setAllPlayers([...memberUsers, ...newGuests])
    }, [clubId])

    const handleCreatePlayer = (nickname: string) => {
        const guest = saveGuestPlayer(nickname)
        setAllPlayers((prev) => [...prev, guest])
        return guest.id
    }

    const addGame = () => {
        setGames((prev) => [
            ...prev,
            {
                id: genId('game'),
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

    const updateGame = (id: string, patch: Partial<SimpleGameEntry>) =>
        setGames((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)))

    const removeGame = (id: string) => setGames((prev) => prev.filter((g) => g.id !== id))

    const updateTeamPlayer = (gameId: string, team: 'team1' | 'team2', index: 0 | 1, userId: string) => {
        setGames((prev) =>
            prev.map((g) => {
                if (g.id !== gameId) return g
                const t = [...g[team]] as [string, string]
                t[index] = userId
                return { ...g, [team]: t }
            })
        )
    }

    const handleSubmit = () => {
        setError(null)

        if (!name.trim()) { setError('대진표 이름을 입력해주세요.'); return }
        if (!date) { setError('날짜를 입력해주세요.'); return }
        if (games.length === 0) { setError('게임을 1개 이상 추가해주세요.'); return }

        for (const g of games) {
            if (!g.courtLabel.trim()) { setError('모든 게임의 코트를 입력해주세요.'); return }
            if (!g.startAt || !g.endAt) { setError('모든 게임의 시간을 입력해주세요.'); return }
            if (g.matchType === 'singles') {
                if (!g.player1Id || !g.player2Id) { setError('모든 게임의 선수를 선택해주세요.'); return }
                if (g.player1Id === g.player2Id) { setError('같은 선수를 두 번 선택할 수 없습니다.'); return }
            } else {
                if (!g.team1[0] || !g.team2[0]) { setError('모든 게임의 선수를 선택해주세요.'); return }
            }
        }

        setIsSubmitting(true)

        const now = Date.now()
        const tournamentId = `tc-t-${now}`
        const createdAt = new Date().toISOString()

        // 고유 코트 추출
        const uniqueCourtLabels = [...new Set(games.map((g) => g.courtLabel.trim()))]
        const courts: Court[] = uniqueCourtLabels.map((label, i) => ({
            id: genId('court'),
            label,
            order: i + 1,
        }))

        // 고유 시간 슬롯 추출
        const slotMap = new Map<string, TimeSlot>()
        for (const g of games) {
            const key = `${g.startAt}|${g.endAt}`
            if (!slotMap.has(key)) {
                slotMap.set(key, { id: genId('ts'), startAt: g.startAt, endAt: g.endAt })
            }
        }
        const timeSlots = [...slotMap.values()]

        const round: Round = { id: genId('round'), label: '1st', order: 1, timeSlots }

        const newGames: Game[] = games.map((g, i) => {
            const court = courts.find((c) => c.label === g.courtLabel.trim())!
            const slot = slotMap.get(`${g.startAt}|${g.endAt}`)!
            return {
                id: `tc-g-${now}-${i}`,
                tournamentId,
                roundId: round.id,
                courtId: court.id,
                timeSlotId: slot.id,
                matchType: g.matchType,
                ...(g.matchType === 'singles'
                    ? { player1Id: g.player1Id, player2Id: g.player2Id }
                    : { team1: g.team1.filter(Boolean), team2: g.team2.filter(Boolean) }),
                status: 'scheduled',
            }
        })

        const tournament: Tournament = {
            id: tournamentId,
            clubId,
            name: name.trim(),
            date,
            courts,
            rounds: [round],
            games: newGames,
            isFixed: false,
            createdAt,
        }

        saveTournament(tournament)
        router.push(`/clubs/${clubId}/tournaments`)
    }

    return (
        <div className="w-full space-y-5">
            {/* 기본 정보 */}
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

            {/* 게임 테이블 */}
            <div className="rounded-lg border">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="text-sm font-medium">게임 목록</span>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addGame}>
                        <Plus className="w-3 h-3" /> 게임 추가
                    </Button>
                </div>

                {games.length === 0 ? (
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
                            {games.map((game) => {
                                const isSingles = game.matchType === 'singles'
                                return (
                                    <TableRow key={game.id} className="align-top">
                                        {/* 코트 */}
                                        <TableCell className="pt-3">
                                            <Input
                                                value={game.courtLabel}
                                                onChange={(e) => updateGame(game.id, { courtLabel: e.target.value })}
                                                className="h-8 text-xs w-20"
                                                placeholder="1코트"
                                            />
                                        </TableCell>

                                        {/* 시간 */}
                                        <TableCell className="pt-3">
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    value={game.startAt}
                                                    onChange={(e) => updateGame(game.id, { startAt: e.target.value })}
                                                    className="h-8 text-xs w-16"
                                                    placeholder="09:00"
                                                />
                                                <span className="text-xs text-muted-foreground shrink-0">~</span>
                                                <Input
                                                    value={game.endAt}
                                                    onChange={(e) => updateGame(game.id, { endAt: e.target.value })}
                                                    className="h-8 text-xs w-16"
                                                    placeholder="09:30"
                                                />
                                            </div>
                                        </TableCell>

                                        {/* 종류 */}
                                        <TableCell className="pt-3">
                                            <Select
                                                value={game.matchType}
                                                onValueChange={(v) => updateGame(game.id, { matchType: v as MatchType })}
                                            >
                                                <SelectTrigger className="h-8 text-xs w-20">
                                                    <Badge variant={MATCH_TYPE_VARIANTS[game.matchType]} className="text-xs px-1.5">
                                                        {MATCH_TYPE_LABELS[game.matchType]}
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

                                        {/* 플레이어 1 */}
                                        <TableCell className="pt-3">
                                            {isSingles ? (
                                                <PlayerSelect
                                                    users={allPlayers}
                                                    value={game.player1Id}
                                                    onChange={(id) => updateGame(game.id, { player1Id: id })}
                                                    placeholder="선수 선택"
                                                    onCreatePlayer={handleCreatePlayer}
                                                />
                                            ) : (
                                                <div className="space-y-1">
                                                    <PlayerSelect
                                                        users={allPlayers}
                                                        value={game.team1[0]}
                                                        onChange={(id) => updateTeamPlayer(game.id, 'team1', 0, id)}
                                                        placeholder="A팀 1번"
                                                        onCreatePlayer={handleCreatePlayer}
                                                    />
                                                    <PlayerSelect
                                                        users={allPlayers}
                                                        value={game.team1[1]}
                                                        onChange={(id) => updateTeamPlayer(game.id, 'team1', 1, id)}
                                                        placeholder="A팀 2번"
                                                        onCreatePlayer={handleCreatePlayer}
                                                    />
                                                </div>
                                            )}
                                        </TableCell>

                                        {/* 플레이어 2 */}
                                        <TableCell className="pt-3">
                                            {isSingles ? (
                                                <PlayerSelect
                                                    users={allPlayers}
                                                    value={game.player2Id}
                                                    onChange={(id) => updateGame(game.id, { player2Id: id })}
                                                    placeholder="선수 선택"
                                                    onCreatePlayer={handleCreatePlayer}
                                                />
                                            ) : (
                                                <div className="space-y-1">
                                                    <PlayerSelect
                                                        users={allPlayers}
                                                        value={game.team2[0]}
                                                        onChange={(id) => updateTeamPlayer(game.id, 'team2', 0, id)}
                                                        placeholder="B팀 1번"
                                                        onCreatePlayer={handleCreatePlayer}
                                                    />
                                                    <PlayerSelect
                                                        users={allPlayers}
                                                        value={game.team2[1]}
                                                        onChange={(id) => updateTeamPlayer(game.id, 'team2', 1, id)}
                                                        placeholder="B팀 2번"
                                                        onCreatePlayer={handleCreatePlayer}
                                                    />
                                                </div>
                                            )}
                                        </TableCell>

                                        {/* 관리 */}
                                        <TableCell className="pt-3 text-right">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => removeGame(game.id)}
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
                <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? '저장 중...' : '저장하기'}
                </Button>
                <Link
                    href={`/clubs/${clubId}/tournaments`}
                    className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 justify-center')}
                >
                    취소
                </Link>
            </div>
        </div>
    )
}
