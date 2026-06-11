'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PersonalMatch, MatchType, CourtSurface, PersonalMatchSetScore } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import {
    createPersonalMatchesAction,
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
    pastOpponents?: PastOpponent[]
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

export function PersonalMatchForm({ initialData, opponentCandidates = [], pastOpponents = [] }: Props) {
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
    const [sets, setSets] = useState<PersonalMatchSetScore[]>(
        initialData?.setScores?.length ? initialData.setScores : [{ me: 0, opp: 0 }]
    )
    const [notes, setNotes] = useState(initialData?.notes ?? '')

    const isDoubles = DOUBLES_TYPES.includes(matchType)

    function addSet() {
        setSets((prev) => [...prev, { me: 0, opp: 0 }])
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

    // 선수 입력 완료 여부 — 회원 선택은 userId, 비회원은 이름 + 손잡이(필수)까지 입력돼야 한다.
    function isPlayerFilled(p: PlayerPickerValue): boolean {
        if (p.userId) return true
        return !!p.name.trim() && !!p.hand
    }
    // 세트 유효성 — 양쪽 점수가 0~99 정수이고 0-0(미입력) 세트가 아니어야 한다.
    function isSetValid(s: PersonalMatchSetScore): boolean {
        if (Number.isNaN(s.me) || Number.isNaN(s.opp)) return false
        if (s.me === 0 && s.opp === 0) return false
        return true
    }

    const isValid =
        isPlayerFilled(opponent) &&
        (!isDoubles || (isPlayerFilled(partner) && isPlayerFilled(opponent2))) &&
        !!playedAt &&
        sets.length > 0 &&
        sets.every(isSetValid)

    // setScores를 제외한 공통 입력 필드
    function buildBaseInput(): Omit<PersonalMatchInput, 'setScores'> {
        return {
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
            notes: notes || undefined,
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        if (!isValid) {
            setError('필수 항목을 모두 정확히 입력해주세요.')
            return
        }

        const base = buildBaseInput()
        const cleanSets = sets.map((s) => ({
            me: Number.isNaN(s.me) ? 0 : s.me,
            opp: Number.isNaN(s.opp) ? 0 : s.opp,
        }))

        startTransition(async () => {
            const res = initialData
                // 수정: 기존 한 레코드를 그대로 유지 (모든 세트 포함, winner 자동 판정)
                ? await updatePersonalMatchAction(initialData.id, { ...base, setScores: cleanSets })
                // 신규: 세트마다 개별 경기로 분리 저장
                : await createPersonalMatchesAction(cleanSets.map((s) => ({ ...base, setScores: [s] })))
            if (res.error) {
                setError(res.error)
            } else {
                router.push('/me/personal-matches')
            }
        })
    }

    const inputClass = 'w-full rounded-[4px] border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring'
    const labelClass = 'text-sm font-medium text-foreground block mb-1'
    // 세트 스코어 우측 라벨 (상대/상대팀 표시 이름)
    const opponentLabel = opponent.name.trim() || '상대'

    return (
        <form onSubmit={handleSubmit} className="space-y-5 mx-auto w-full max-w-2xl">
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
                        pastOpponents={pastOpponents}
                        value={partner}
                        onChange={setPartner}
                        placeholder="파트너 이름 또는 닉네임"
                    />
                )}

                {/* 상대 (단식: 1명 / 복식: 상대팀 선수 1·2) */}
                <PlayerPicker
                    label={isDoubles ? '상대팀 선수 1 *' : '상대 *'}
                    candidates={opponentCandidates}
                    pastOpponents={pastOpponents}
                    value={opponent}
                    onChange={setOpponent}
                    placeholder="상대방 이름 또는 닉네임"
                />
                {isDoubles && (
                    <PlayerPicker
                        label="상대팀 선수 2 *"
                        candidates={opponentCandidates}
                        pastOpponents={pastOpponents}
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
                    {/* 왼쪽=나(등록유저), 오른쪽=상대 라벨 */}
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-10" />
                        <span className="w-16 text-center text-xs text-muted-foreground truncate">나</span>
                        <span className="w-3" />
                        <span className="w-16 text-center text-xs text-muted-foreground truncate">{opponentLabel}</span>
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
                                <span className="w-3 text-center text-muted-foreground">-</span>
                                <input
                                    type="number"
                                    min={0} max={99}
                                    value={Number.isNaN(s.opp) ? '' : s.opp}
                                    onChange={(e) => updateSet(i, 'opp', e.target.value)}
                                    className="w-16 rounded-[4px] border border-input bg-transparent px-2 py-1.5 text-sm text-center"
                                />
                                {sets.length > 1 && (
                                    <button type="button" onClick={() => removeSet(i)} className="text-xs text-destructive/80 hover:text-destructive">
                                        삭제
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">세트마다 점수가 높은 쪽이 승리한 개별 경기로 저장됩니다.</p>
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

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={isPending || !isValid}
                    className="flex-1 py-2.5 text-sm font-medium bg-foreground text-background rounded-[4px] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
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
