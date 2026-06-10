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
import { SURFACE_OPTIONS } from '@/lib/dashboard/surface'
import { PlayerPicker, type PlayerPickerValue } from '@/components/personal-matches/player-picker'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

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

// 코트 표면 select 항목 ('' = 미지정)
const SURFACE_SELECT_ITEMS: { value: string; label: string }[] = [
    { value: '', label: '미지정' },
    ...SURFACE_OPTIONS,
]

const DOUBLES_TYPES: MatchType[] = ['men_doubles', 'women_doubles', 'mixed_doubles']

export function PersonalMatchForm({ initialData, opponentCandidates = [] }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const [opponent, setOpponent] = useState<PlayerPickerValue>({
        userId: initialData?.opponentUserId,
        name: initialData?.opponentName ?? '',
        hand: initialData?.opponentDominantHand ?? '',
    })
    const [partner, setPartner] = useState<PlayerPickerValue>({
        userId: initialData?.partnerUserId,
        name: initialData?.partnerName ?? '',
        hand: initialData?.partnerDominantHand ?? '',
    })
    const [opponent2, setOpponent2] = useState<PlayerPickerValue>({
        userId: initialData?.opponent2UserId,
        name: initialData?.opponent2Name ?? '',
        hand: initialData?.opponent2DominantHand ?? '',
    })
    const [playedAt, setPlayedAt] = useState(initialData?.playedAt ?? new Date().toISOString().slice(0, 10))
    const [matchType, setMatchType] = useState<MatchType>(initialData?.matchType ?? 'singles')
    const [surface, setSurface] = useState<CourtSurface | ''>(initialData?.surface ?? '')
    const [winner, setWinner] = useState<PersonalMatchWinner>(initialData?.winner ?? 'me')
    const [sets, setSets] = useState<PersonalMatchSetScore[]>(
        initialData?.setScores?.length ? initialData.setScores : [{ me: 6, opp: 0 }]
    )
    const [notes, setNotes] = useState(initialData?.notes ?? '')

    const isDoubles = DOUBLES_TYPES.includes(matchType)

    function addSet() {
        setSets((prev) => [...prev, { me: 6, opp: 0 }])
    }
    function removeSet(i: number) {
        setSets((prev) => prev.filter((_, idx) => idx !== i))
    }
    function updateSet(i: number, field: 'me' | 'opp', val: string) {
        // 빈 값(전체 삭제)은 NaN으로 보관해 입력란을 비울 수 있게 하고, 제출 시 0으로 정리한다.
        if (val === '') {
            setSets((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: NaN } : s))
            return
        }
        const num = parseInt(val, 10)
        if (isNaN(num) || num < 0 || num > 99) return
        setSets((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: num } : s))
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        if (!opponent.name.trim() && !opponent.userId) {
            setError('상대를 선택하거나 이름을 입력해주세요.')
            return
        }
        if (isDoubles) {
            if (!partner.name.trim() && !partner.userId) {
                setError('복식은 내 파트너를 입력해주세요.')
                return
            }
            if (!opponent2.name.trim() && !opponent2.userId) {
                setError('복식은 상대팀 2번째 선수를 입력해주세요.')
                return
            }
        }

        const input: PersonalMatchInput = {
            opponentName: opponent.name.trim(),
            opponentUserId: opponent.userId,
            // 손잡이는 직접 입력(회원 미선택) 모드에서만 저장
            opponentDominantHand: !opponent.userId && opponent.hand ? opponent.hand : undefined,
            // 복식 전용 필드 (단식이면 액션에서 NULL 처리)
            partnerName: partner.name.trim() || undefined,
            partnerUserId: partner.userId,
            partnerDominantHand: !partner.userId && partner.hand ? partner.hand : undefined,
            opponent2Name: opponent2.name.trim() || undefined,
            opponent2UserId: opponent2.userId,
            opponent2DominantHand: !opponent2.userId && opponent2.hand ? opponent2.hand : undefined,
            playedAt,
            matchType,
            surface: surface || undefined,
            // 비워둔 입력(NaN)은 0으로 정리해 저장
            setScores: sets.map((s) => ({
                me: Number.isNaN(s.me) ? 0 : s.me,
                opp: Number.isNaN(s.opp) ? 0 : s.opp,
            })),
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
                {/* 경기 타입 (인원 입력란을 동적으로 결정하므로 최상단) */}
                <div>
                    <label className={labelClass}>경기 타입 *</label>
                    <Select
                        value={matchType}
                        onValueChange={(v) => v && setMatchType(v as MatchType)}
                        items={MATCH_TYPES}
                    >
                        <SelectTrigger className="w-full bg-background border-input focus:border-ring">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MATCH_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* 내 파트너 (복식 전용) */}
                {isDoubles && (
                    <PlayerPicker
                        label="내 파트너 *"
                        candidates={opponentCandidates}
                        value={partner}
                        onChange={setPartner}
                        placeholder="파트너 이름 또는 닉네임"
                    />
                )}

                {/* 상대 (단식: 1명 / 복식: 상대팀 선수 1·2) */}
                <PlayerPicker
                    label={isDoubles ? '상대팀 선수 1 *' : '상대 *'}
                    candidates={opponentCandidates}
                    value={opponent}
                    onChange={setOpponent}
                    placeholder="상대방 이름 또는 닉네임"
                />
                {isDoubles && (
                    <PlayerPicker
                        label="상대팀 선수 2 *"
                        candidates={opponentCandidates}
                        value={opponent2}
                        onChange={setOpponent2}
                        placeholder="상대방 이름 또는 닉네임"
                    />
                )}

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
                        <label className={labelClass}>코트 표면 (선택)</label>
                        <Select
                            value={surface}
                            onValueChange={(v) => setSurface(v as CourtSurface | '')}
                            items={SURFACE_SELECT_ITEMS}
                        >
                            <SelectTrigger className="w-full bg-background border-input focus:border-ring">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {SURFACE_SELECT_ITEMS.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
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
                                    value={Number.isNaN(s.me) ? '' : s.me}
                                    onChange={(e) => updateSet(i, 'me', e.target.value)}
                                    className="w-16 rounded-[4px] border border-input bg-transparent px-2 py-1.5 text-sm text-center"
                                />
                                <span className="text-muted-foreground">-</span>
                                <input
                                    type="number"
                                    min={0} max={99}
                                    value={Number.isNaN(s.opp) ? '' : s.opp}
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
