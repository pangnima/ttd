'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { SURFACE_OPTIONS } from '@/lib/dashboard/surface'
import {
    genId,
    filterCandidates,
    matchGameToFormState,
    validateEntries,
    buildMatchGamePayload,
    type FormCourt,
    type SimpleMatchEntry,
} from '@/lib/match-games/form-mapping'
import { createMatchGameAction, updateMatchGameAction, addGuestPlayerAction } from '@/lib/actions/match-games'
import { Plus, Trash2 } from 'lucide-react'
import type { CourtSurface, MatchGame, MatchType, User } from '@/types'

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

/** 기본 신규 코트 생성 헬퍼 */
function makeDefaultCourt(index: number): FormCourt {
    return { id: genId('court'), label: `${index + 1}코트`, surface: '' }
}

export function MatchGameCreateForm({ clubId, members: initialMembers, initialData }: MatchGameCreateFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [name, setName] = useState(initialData?.name ?? '')
    const [date, setDate] = useState(initialData?.date ?? '')

    // 편집 진입 시 matchGameToFormState로 courts/entries 동시 복원.
    // 신규 진입 시 기본 코트 1개, 엔트리 0개.
    const initialState = initialData ? matchGameToFormState(initialData) : null
    const [courts, setCourts] = useState<FormCourt[]>(
        initialState?.courts ?? [makeDefaultCourt(0)]
    )
    const [entries, setEntries] = useState<SimpleMatchEntry[]>(
        initialState?.entries ?? []
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

    // ── 코트 목록 관리 ────────────────────────────────────────
    const addCourt = () =>
        setCourts((prev) => [...prev, makeDefaultCourt(prev.length)])

    const updateCourt = (id: string, patch: Partial<FormCourt>) =>
        setCourts((prev) => prev.map((c) => c.id === id ? { ...c, ...patch } : c))

    const removeCourt = (id: string) => {
        setCourts((prev) => prev.filter((c) => c.id !== id))
        // 삭제된 코트를 참조하던 엔트리의 courtId를 초기화 (검증 단계에서 검출됨)
        setEntries((prev) => prev.map((e) => e.courtId === id ? { ...e, courtId: '' } : e))
    }

    // ── 게임 목록 관리 ────────────────────────────────────────
    const addEntry = () =>
        setEntries((prev) => [
            ...prev,
            {
                id: genId('match'),
                courtId: courts[0]?.id ?? '',
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

        const validationError = validateEntries(entries, courts, allPlayers)
        if (validationError) { setError(validationError); return }

        const { courts: builtCourts, rounds, matches } = buildMatchGamePayload(entries, courts)

        startTransition(async () => {
            const result = initialData
                ? await updateMatchGameAction(clubId, initialData.id, name.trim(), date, builtCourts, rounds, matches)
                : await createMatchGameAction(clubId, name.trim(), date, builtCourts, rounds, matches)
            if (!result.ok) { setError(result.error); return }
            router.push(`/clubs/${clubId}/match-games`)
        })
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

            {/* 코트 목록 */}
            <div className="rounded-lg border">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="text-sm font-medium">코트 목록</span>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addCourt}>
                        <Plus className="w-3 h-3" /> 코트 추가
                    </Button>
                </div>

                {courts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                        코트 추가 버튼을 눌러 코트를 등록하세요.
                    </p>
                ) : (
                    <div className="divide-y">
                        {courts.map((court) => (
                            <div key={court.id} className="flex items-center gap-3 px-4 py-2.5">
                                <Input
                                    value={court.label}
                                    onChange={(e) => updateCourt(court.id, { label: e.target.value })}
                                    className="h-8 text-xs w-24"
                                    placeholder="1코트"
                                />
                                <Select
                                    value={court.surface}
                                    onValueChange={(v) => updateCourt(court.id, { surface: v as CourtSurface | '' })}
                                >
                                    <SelectTrigger className="h-8 text-xs w-28">
                                        <SelectValue placeholder="표면 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">미지정</SelectItem>
                                        {SURFACE_OPTIONS.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                                    onClick={() => removeCourt(court.id)}
                                    disabled={courts.length === 1}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 게임 목록 */}
            <div className="rounded-lg border">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="text-sm font-medium">게임 목록</span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={addEntry}
                        disabled={courts.length === 0}
                    >
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
                                <TableHead className="w-28">코트</TableHead>
                                <TableHead className="w-36">시간</TableHead>
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
                                        {/* 코트 선택 — 코트 목록에서 선택 */}
                                        <TableCell className="pt-3">
                                            <Select
                                                value={entry.courtId}
                                                onValueChange={(v) => updateEntry(entry.id, { courtId: v ?? '' })}
                                            >
                                                <SelectTrigger className="h-8 text-xs w-24">
                                                    <SelectValue placeholder="코트 선택" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {courts.map((c) => (
                                                        <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        {/* 시간 입력 (폭 축소) */}
                                        <TableCell className="pt-3">
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    value={entry.startAt}
                                                    onChange={(e) => updateEntry(entry.id, { startAt: e.target.value })}
                                                    className="h-8 text-xs w-14"
                                                    placeholder="09:00"
                                                />
                                                <span className="text-xs text-muted-foreground shrink-0">~</span>
                                                <Input
                                                    value={entry.endAt}
                                                    onChange={(e) => updateEntry(entry.id, { endAt: e.target.value })}
                                                    className="h-8 text-xs w-14"
                                                    placeholder="09:30"
                                                />
                                            </div>
                                        </TableCell>
                                        {/* 경기 종류 */}
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
