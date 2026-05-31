'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PersonalMatch, MatchType, CourtSurface, PersonalMatchSetScore, PersonalMatchWinner } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import {
    createPersonalMatchAction,
    updatePersonalMatchAction,
    type PersonalMatchInput,
} from '@/lib/actions/personal-matches'
import { CARD_BASE } from '@/lib/dashboard/tokens'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

type Props = {
    initialData?: PersonalMatch
    opponentCandidates?: OpponentCandidate[]
}

const MATCH_TYPES: { value: MatchType; label: string }[] = [
    { value: 'singles', label: '단식' },
    { value: 'men_doubles', label: '남복' },
    { value: 'women_doubles', label: '여복' },
    { value: 'mixed_doubles', label: '혼복' },
]

const SURFACES: { value: CourtSurface; label: string }[] = [
    { value: 'hard', label: '하드' },
    { value: 'clay', label: '클레이' },
    { value: 'grass', label: '인조잔디' },
    { value: 'other', label: '기타' },
]

type InputMode = 'member' | 'external'

export function PersonalMatchForm({ initialData, opponentCandidates = [] }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    // 초기 모드: 기존 데이터에 opponentUserId가 있으면 member, 없으면 external
    const initialMode: InputMode = initialData?.opponentUserId ? 'member' : 'external'
    const [inputMode, setInputMode] = useState<InputMode>(initialMode)
    const [comboOpen, setComboOpen] = useState(false)

    const [opponentUserId, setOpponentUserId] = useState<string | undefined>(initialData?.opponentUserId)
    const [opponentName, setOpponentName] = useState(initialData?.opponentName ?? '')
    const [playedAt, setPlayedAt] = useState(initialData?.playedAt ?? new Date().toISOString().slice(0, 10))
    const [matchType, setMatchType] = useState<MatchType>(initialData?.matchType ?? 'singles')
    const [surface, setSurface] = useState<CourtSurface | ''>(initialData?.surface ?? '')
    const [winner, setWinner] = useState<PersonalMatchWinner>(initialData?.winner ?? 'me')
    const [sets, setSets] = useState<PersonalMatchSetScore[]>(
        initialData?.setScores?.length ? initialData.setScores : [{ me: 6, opp: 0 }]
    )
    const [notes, setNotes] = useState(initialData?.notes ?? '')

    const selectedCandidate = opponentCandidates.find((c) => c.id === opponentUserId)

    function selectMember(candidate: OpponentCandidate) {
        setOpponentUserId(candidate.id)
        setOpponentName(candidate.name)
        setComboOpen(false)
    }

    function switchToExternal() {
        setInputMode('external')
        setOpponentUserId(undefined)
        setOpponentName('')
    }

    function switchToMember() {
        setInputMode('member')
        setOpponentUserId(undefined)
        setOpponentName('')
    }

    function addSet() {
        setSets((prev) => [...prev, { me: 6, opp: 0 }])
    }
    function removeSet(i: number) {
        setSets((prev) => prev.filter((_, idx) => idx !== i))
    }
    function updateSet(i: number, field: 'me' | 'opp', val: string) {
        const num = parseInt(val, 10)
        if (isNaN(num) || num < 0 || num > 99) return
        setSets((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: num } : s))
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        if (!opponentName.trim() && !opponentUserId) {
            setError('상대를 선택하거나 이름을 입력해주세요.')
            return
        }

        const input: PersonalMatchInput = {
            opponentName: opponentName.trim() || (selectedCandidate?.name ?? ''),
            opponentUserId: opponentUserId,
            playedAt,
            matchType,
            surface: surface || undefined,
            setScores: sets,
            winner,
            notes: notes || undefined,
        }
        startTransition(async () => {
            const res = initialData
                ? await updatePersonalMatchAction(initialData.id, input)
                : await createPersonalMatchAction(input)
            if (res.error) {
                setError(res.error)
            } else {
                router.push('/me/personal-matches')
            }
        })
    }

    const inputClass = 'w-full rounded-[4px] border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring'
    const labelClass = 'text-sm font-medium text-foreground block mb-1'

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className={`${CARD_BASE} p-5 space-y-4`}>
                {/* 상대 선택 */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className={`${labelClass} mb-0`}>상대 *</label>
                        {opponentCandidates.length > 0 && (
                            <button
                                type="button"
                                onClick={inputMode === 'member' ? switchToExternal : switchToMember}
                                className="text-xs text-muted-foreground hover:text-foreground"
                            >
                                {inputMode === 'member' ? '직접 입력' : '클럽 회원 선택'}
                            </button>
                        )}
                    </div>

                    {inputMode === 'member' ? (
                        <Popover open={comboOpen} onOpenChange={setComboOpen}>
                            <PopoverTrigger
                                type="button"
                                className={`${inputClass} text-left flex items-center justify-between`}
                            >
                                {selectedCandidate ? (
                                    <span>
                                        {selectedCandidate.name}
                                        {selectedCandidate.ntrp ? ` (${selectedCandidate.ntrp})` : ''}
                                        {selectedCandidate.isGuest ? ' (게스트)' : ''}
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">클럽 회원 검색...</span>
                                )}
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="이름으로 검색..." />
                                    <CommandList>
                                        <CommandEmpty>검색 결과가 없습니다</CommandEmpty>
                                        <CommandGroup>
                                            {opponentCandidates.map((c) => (
                                                <CommandItem
                                                    key={c.id}
                                                    value={c.name}
                                                    onSelect={() => selectMember(c)}
                                                >
                                                    <span>{c.name}</span>
                                                    {c.ntrp && <span className="ml-1 text-muted-foreground">({c.ntrp})</span>}
                                                    {c.isGuest && <span className="ml-1 text-muted-foreground text-xs">게스트</span>}
                                                    {c.clubNames.length > 0 && (
                                                        <span className="ml-auto text-muted-foreground text-xs">
                                                            {c.clubNames[0]}
                                                        </span>
                                                    )}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    ) : (
                        <input
                            type="text"
                            value={opponentName}
                            onChange={(e) => setOpponentName(e.target.value)}
                            placeholder="상대방 이름 또는 닉네임"
                            className={inputClass}
                        />
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelClass}>경기 날짜 *</label>
                        <input
                            type="date"
                            value={playedAt}
                            onChange={(e) => setPlayedAt(e.target.value)}
                            className={inputClass}
                            required
                        />
                    </div>
                    <div>
                        <label className={labelClass}>경기 타입 *</label>
                        <select
                            value={matchType}
                            onChange={(e) => setMatchType(e.target.value as MatchType)}
                            className={inputClass}
                        >
                            {MATCH_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className={labelClass}>코트 표면 (선택)</label>
                    <select
                        value={surface}
                        onChange={(e) => setSurface(e.target.value as CourtSurface | '')}
                        className={inputClass}
                    >
                        <option value="">미지정</option>
                        {SURFACES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className={`${labelClass} mb-0`}>세트 스코어</label>
                        <button type="button" onClick={addSet} className="text-xs text-muted-foreground hover:text-foreground">
                            + 세트 추가
                        </button>
                    </div>
                    <div className="space-y-2">
                        {sets.map((s, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-10">{i + 1}세트</span>
                                <input
                                    type="number"
                                    min={0} max={99}
                                    value={s.me}
                                    onChange={(e) => updateSet(i, 'me', e.target.value)}
                                    className="w-16 rounded-[4px] border border-input bg-transparent px-2 py-1.5 text-sm text-center"
                                />
                                <span className="text-muted-foreground">-</span>
                                <input
                                    type="number"
                                    min={0} max={99}
                                    value={s.opp}
                                    onChange={(e) => updateSet(i, 'opp', e.target.value)}
                                    className="w-16 rounded-[4px] border border-input bg-transparent px-2 py-1.5 text-sm text-center"
                                />
                                {sets.length > 1 && (
                                    <button type="button" onClick={() => removeSet(i)} className="text-xs text-red-400 hover:text-red-600">
                                        삭제
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label className={labelClass}>결과 *</label>
                    <div className="flex gap-2">
                        {(['me', 'opponent', 'draw'] as PersonalMatchWinner[]).map((w) => {
                            const label = w === 'me' ? '내가 이겼다' : w === 'opponent' ? '상대가 이겼다' : '무승부'
                            return (
                                <button
                                    key={w}
                                    type="button"
                                    onClick={() => setWinner(w)}
                                    className={`flex-1 py-2 text-sm rounded-[4px] border transition-colors ${
                                        winner === w
                                            ? 'border-primary bg-primary/10 text-foreground'
                                            : 'border-border text-muted-foreground hover:border-input'
                                    }`}
                                >
                                    {label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div>
                    <label className={labelClass}>메모 (선택)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="경기 관련 메모"
                        rows={2}
                        className={`${inputClass} resize-none`}
                    />
                </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 py-2.5 text-sm font-medium bg-foreground text-background rounded-[4px] hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                    {isPending ? '저장 중...' : initialData ? '수정 완료' : '경기 저장'}
                </button>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2.5 text-sm text-muted-foreground border border-border rounded-[4px] hover:border-input transition-colors"
                >
                    취소
                </button>
            </div>
        </form>
    )
}
