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
import { CARD_BASE, MATCH_FORM_LABEL } from '@/lib/dashboard/tokens'
import { MATCH_TYPE_OPTIONS } from '@/lib/dashboard/match-type-style'
import { isNtrpValid, isPlayerFilled, isSetValid } from '@/lib/personal-matches/validators'
import type { RotationSessionMeta } from '@/lib/personal-matches/rotation'
import type { PlayerPickerValue } from '@/components/personal-matches/player-picker'
import { EnumSelect } from '@/components/match/enum-select'
import { PlayersSection } from '@/components/personal-matches/form-sections/players-section'
import { MatchMetaSection } from '@/components/personal-matches/form-sections/match-meta-section'
import { SetsSection } from '@/components/personal-matches/form-sections/sets-section'
import { NotesSection } from '@/components/personal-matches/form-sections/notes-section'
import { FormFooter } from '@/components/personal-matches/form-sections/form-footer'
import { useRotationGames } from '@/components/personal-matches/use-rotation-games'
import { DoublesModeToggle, type DoublesMode } from '@/components/personal-matches/doubles-mode-toggle'
import { PlayerPoolSection } from '@/components/personal-matches/rotation/player-pool-section'
import { GameBuilderSection } from '@/components/personal-matches/rotation/game-builder-section'

type Props = {
    initialData?: PersonalMatch
    opponentCandidates?: OpponentCandidate[]
    pastOpponents?: PastOpponent[]
}

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
    const [playedTime, setPlayedTime] = useState(initialData?.playedTime ?? '')
    const [matchType, setMatchType] = useState<MatchType>(initialData?.matchType ?? 'singles')
    const [surface, setSurface] = useState<CourtSurface | ''>(initialData?.surface ?? '')
    // 선수별 NTRP — number input 문자열로 보관('' = 미입력). 소수 원본값 유지.
    // opponentNtrp = 단식 상대 / 복식 상대1
    const [opponentNtrp, setOpponentNtrp] = useState<string>(
        initialData?.opponentNtrp != null ? String(initialData.opponentNtrp) : ''
    )
    const [opponent2Ntrp, setOpponent2Ntrp] = useState<string>(
        initialData?.opponent2Ntrp != null ? String(initialData.opponent2Ntrp) : ''
    )
    const [partnerNtrp, setPartnerNtrp] = useState<string>(
        initialData?.partnerNtrp != null ? String(initialData.partnerNtrp) : ''
    )
    const [sets, setSets] = useState<PersonalMatchSetScore[]>(
        initialData?.setScores?.length ? initialData.setScores : [{ me: 0, opp: 0 }]
    )
    const [notes, setNotes] = useState(initialData?.notes ?? '')
    // 복식 입력 방식 — 페어 고정(기본) vs 로테이션. 로테이션은 신규 등록에서만 지원.
    const [doublesMode, setDoublesMode] = useState<DoublesMode>('fixed')
    const rotation = useRotationGames()

    const isDoubles = DOUBLES_TYPES.includes(matchType)
    const isRotation = isDoubles && doublesMode === 'rotation' && !initialData

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
    // 세트별 애드/듀스 갱신 (복식). undefined = 미지정(둘 다 듀스).
    function setMyAd(i: number, v: 'me' | 'partner' | undefined) {
        setSets((prev) => prev.map((s, idx) => idx === i ? { ...s, myAd: v } : s))
    }
    function setOppAd(i: number, v: 'opponent' | 'opponent2' | undefined) {
        setSets((prev) => prev.map((s, idx) => idx === i ? { ...s, oppAd: v } : s))
    }

    // 파트너 NTRP는 선택 — 비어있으면 통과, 입력 시 유효해야 함.
    const partnerNtrpOk = partnerNtrp.trim() === '' || isNtrpValid(partnerNtrp)

    // 세션 공통 메타 (로테이션 모든 게임에 동일 적용)
    function buildSessionMeta(): RotationSessionMeta {
        return { playedAt, playedTime, matchType, surface, notes }
    }

    const fixedValid =
        isPlayerFilled(opponent) &&
        isNtrpValid(opponentNtrp) &&
        (!isDoubles || (
            isPlayerFilled(partner) &&
            isPlayerFilled(opponent2) &&
            isNtrpValid(opponent2Ntrp) &&
            partnerNtrpOk
        )) &&
        !!playedAt &&
        !!playedTime &&
        !!surface &&
        sets.length > 0 &&
        sets.every(isSetValid)

    const isValid = isRotation ? rotation.isValid(buildSessionMeta()) : fixedValid

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
            partnerNtrp: isDoubles && partnerNtrp ? Number(partnerNtrp) : undefined,
            opponent2Name: opponent2.name.trim() || undefined,
            opponent2UserId: opponent2.userId,
            opponent2DominantHand: !opponent2.userId && opponent2.hand ? opponent2.hand : undefined,
            opponent2Ntrp: isDoubles && opponent2Ntrp ? Number(opponent2Ntrp) : undefined,
            playedAt,
            playedTime: playedTime || undefined,
            matchType,
            surface: surface || undefined,
            opponentNtrp: opponentNtrp ? Number(opponentNtrp) : undefined,
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

        // 로테이션: 각 게임을 별도 레코드로 일괄 저장
        if (isRotation) {
            const inputs = rotation.buildInputs(buildSessionMeta())
            startTransition(async () => {
                const res = await createPersonalMatchesAction(inputs)
                if (res.error) setError(res.error)
                else router.push('/me/personal-matches')
            })
            return
        }

        const base = buildBaseInput()
        const cleanSets = sets.map((s) => ({
            me: Number.isNaN(s.me) ? 0 : s.me,
            opp: Number.isNaN(s.opp) ? 0 : s.opp,
            // 애드/듀스는 복식에서만 보존(단식은 제외)
            ...(isDoubles && s.myAd ? { myAd: s.myAd } : {}),
            ...(isDoubles && s.oppAd ? { oppAd: s.oppAd } : {}),
        }))

        startTransition(async () => {
            const res = initialData
                // 수정: 기존 한 레코드를 그대로 유지 (모든 세트 포함, winner 자동 판정)
                ? await updatePersonalMatchAction(initialData.id, { ...base, setScores: cleanSets })
                // 신규: 모든 세트를 담은 단일 경기 1건으로 저장 (winner는 세트 승수로 자동 판정)
                : await createPersonalMatchesAction([{ ...base, setScores: cleanSets }])
            if (res.error) {
                setError(res.error)
            } else {
                router.push('/me/personal-matches')
            }
        })
    }

    // 세트 스코어 우측 라벨 (상대/상대팀 표시 이름)
    const opponentLabel = opponent.name.trim() || '상대'

    return (
        <form onSubmit={handleSubmit} className="space-y-5 mx-auto w-full max-w-2xl">
            <div className={`${CARD_BASE} p-5 space-y-4`}>
                {/* 경기 타입 (인원 입력란을 동적으로 결정하므로 최상단) */}
                <div>
                    <label className={MATCH_FORM_LABEL}>경기 타입 *</label>
                    <EnumSelect
                        value={matchType}
                        onValueChange={setMatchType}
                        options={MATCH_TYPE_OPTIONS}
                        ariaLabel="경기 타입"
                    />
                </div>

                {/* 복식 신규 등록 시에만 방식 토글 노출 (수정 모드는 단일 레코드라 미지원) */}
                {isDoubles && !initialData && (
                    <DoublesModeToggle value={doublesMode} onChange={setDoublesMode} />
                )}

                {isRotation ? (
                    <PlayerPoolSection
                        pool={rotation.pool}
                        candidates={opponentCandidates}
                        pastOpponents={pastOpponents}
                        onAdd={rotation.addPoolPlayer}
                        onUpdate={rotation.updatePoolPlayer}
                        onRemove={rotation.removePoolPlayer}
                    />
                ) : (
                    <PlayersSection
                        isDoubles={isDoubles}
                        candidates={opponentCandidates}
                        pastOpponents={pastOpponents}
                        opponent={{ player: opponent, onPlayerChange: setOpponent, ntrp: opponentNtrp, onNtrpChange: setOpponentNtrp }}
                        partner={{ player: partner, onPlayerChange: setPartner, ntrp: partnerNtrp, onNtrpChange: setPartnerNtrp }}
                        opponent2={{ player: opponent2, onPlayerChange: setOpponent2, ntrp: opponent2Ntrp, onNtrpChange: setOpponent2Ntrp }}
                    />
                )}

                <MatchMetaSection
                    playedAt={playedAt}
                    onPlayedAtChange={setPlayedAt}
                    playedTime={playedTime}
                    onPlayedTimeChange={setPlayedTime}
                    surface={surface}
                    onSurfaceChange={setSurface}
                />

                {isRotation ? (
                    <GameBuilderSection
                        games={rotation.games}
                        pool={rotation.pool}
                        onAddGame={rotation.addGame}
                        onUpdateGame={rotation.updateGame}
                        onRemoveGame={rotation.removeGame}
                        onAddSet={rotation.addSet}
                        onUpdateSet={rotation.updateSet}
                        onRemoveSet={rotation.removeSet}
                        onMyAd={rotation.setMyAd}
                        onOppAd={rotation.setOppAd}
                    />
                ) : (
                    <SetsSection
                        sets={sets}
                        isDoubles={isDoubles}
                        opponentLabel={opponentLabel}
                        myAdLabels={{ me: '나', partner: partner.name.trim() || '파트너' }}
                        oppAdLabels={{ opponent: opponent.name.trim() || '상대1', opponent2: opponent2.name.trim() || '상대2' }}
                        onAddSet={addSet}
                        onUpdateSet={updateSet}
                        onRemoveSet={removeSet}
                        onMyAd={setMyAd}
                        onOppAd={setOppAd}
                    />
                )}

                <NotesSection notes={notes} onNotesChange={setNotes} />
            </div>

            <FormFooter
                error={error}
                isPending={isPending}
                isValid={isValid}
                submitLabel={initialData ? '수정 완료' : '경기 저장'}
                onCancel={() => router.back()}
            />
        </form>
    )
}
