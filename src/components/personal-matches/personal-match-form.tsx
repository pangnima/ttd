'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PersonalMatch, MatchType, CourtSurface } from '@/types'
import type { OpponentCandidate } from '@/lib/queries/users'
import type { PastOpponent } from '@/lib/queries/personal-matches'
import {
    createPersonalMatchesAction,
    updatePersonalMatchAction,
} from '@/lib/actions/personal-matches'
import type { PersonalMatchInput } from '@/lib/personal-matches/validate-input'
import { createMatchRequestAction } from '@/lib/actions/match-requests'
import { useUserSearch } from '@/components/personal-matches/use-user-search'
import { ConfirmFlowNotice } from '@/components/personal-matches/form-sections/confirm-flow-notice'
import { PendingResultNotice } from '@/components/personal-matches/form-sections/pending-result-notice'
import { FormSectionCard } from '@/components/common/form-section-card'
import { MATCH_TYPE_OPTIONS } from '@/lib/dashboard/match-type-style'
import { isNtrpValid, isPlayerFilled } from '@/lib/personal-matches/validators'
import type { RotationSessionMeta } from '@/lib/personal-matches/rotation'
import type { PlayerPickerValue } from '@/components/personal-matches/player-picker'
import { FieldToggle } from '@/components/personal-matches/field-toggle'
import { PlayersSection } from '@/components/personal-matches/form-sections/players-section'
import { MatchMetaSection } from '@/components/personal-matches/form-sections/match-meta-section'
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
    // 로그인 유저 id — 전달 시 단식 상대에 플랫폼 전체 회원 검색 + 상호 확인 요청 플로우 활성화
    selfUserId?: string
}

const DOUBLES_TYPES: MatchType[] = ['men_doubles', 'women_doubles', 'mixed_doubles']

// 손잡이는 회원·비회원 모두 저장한다 (회원 선택 시 프로필 값이 자동 채워지고, 이후 편집 가능)
function handOf(p: PlayerPickerValue): 'right' | 'left' | undefined {
    return p.hand || undefined
}

/**
 * 개인 경기 등록/수정 폼.
 * 세트 스코어는 받지 않는다 — 저장 시 결과 미확정(winner NULL)으로 기록되고 세트는 추후 별도 등록한다.
 * 로테이션 복식만 예외적으로 게임별 세트를 그대로 입력받는다.
 */
export function PersonalMatchForm({ initialData, opponentCandidates = [], pastOpponents = [], selfUserId }: Props) {
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
    const [notes, setNotes] = useState(initialData?.notes ?? '')
    // 복식 입력 방식 — 페어 고정(기본) vs 로테이션. 로테이션은 신규 등록에서만 지원.
    const [doublesMode, setDoublesMode] = useState<DoublesMode>('fixed')
    const rotation = useRotationGames()

    const isDoubles = DOUBLES_TYPES.includes(matchType)
    const isRotation = isDoubles && doublesMode === 'rotation' && !initialData

    // 플랫폼 전체 회원 검색 (단식 상대 전용, 로그인 유저 id가 있을 때만)
    const userSearch = useUserSearch(selfUserId)
    // 상대가 클럽 후보에 있으면 게스트 여부를 그 정보로 판단.
    // 후보에 없는 userId는 전체 검색(비게스트만 노출)에서 선택된 회원이다.
    const opponentIsGuest = opponentCandidates.find((c) => c.id === opponent.userId)?.isGuest ?? false
    // 상호 확인 요청 플로우 — 신규 등록 + 단식 + 플랫폼 회원(비게스트) 상대일 때.
    // 게스트·직접 입력·복식·수정 모드는 기존 자유 기록으로 저장한다.
    const isConfirmFlow =
        !initialData && matchType === 'singles' && !!selfUserId && !!opponent.userId && !opponentIsGuest

    // 파트너 NTRP는 선택 — 비어있으면 통과, 입력 시 유효해야 함.
    const partnerNtrpOk = partnerNtrp.trim() === '' || isNtrpValid(partnerNtrp)

    // 세션 공통 메타 (로테이션 모든 게임에 동일 적용)
    function buildSessionMeta(): RotationSessionMeta {
        return { playedAt, playedTime, matchType, surface, notes }
    }

    const fixedValid =
        isPlayerFilled(opponent) &&
        // 확인 요청 플로우는 상대 NTRP를 수락 시 서버가 파생하므로 입력 검증 제외
        (isConfirmFlow || isNtrpValid(opponentNtrp)) &&
        (!isDoubles || (
            isPlayerFilled(partner) &&
            isPlayerFilled(opponent2) &&
            isNtrpValid(opponent2Ntrp) &&
            partnerNtrpOk
        )) &&
        !!playedAt &&
        !!playedTime &&
        !!surface

    const isValid = isRotation ? rotation.isValid(buildSessionMeta()) : fixedValid

    // 자유 기록 페이로드. 세트는 신규면 빈 배열(미확정), 수정이면 기존 세트를 그대로 보존한다.
    function buildInput(): PersonalMatchInput {
        return {
            opponentName: opponent.name.trim(),
            opponentUserId: opponent.userId,
            opponentDominantHand: handOf(opponent),
            // 복식 전용 필드 (단식이면 액션에서 NULL 처리)
            partnerName: partner.name.trim() || undefined,
            partnerUserId: partner.userId,
            partnerDominantHand: handOf(partner),
            partnerNtrp: isDoubles && partnerNtrp ? Number(partnerNtrp) : undefined,
            opponent2Name: opponent2.name.trim() || undefined,
            opponent2UserId: opponent2.userId,
            opponent2DominantHand: handOf(opponent2),
            opponent2Ntrp: isDoubles && opponent2Ntrp ? Number(opponent2Ntrp) : undefined,
            playedAt,
            playedTime: playedTime || undefined,
            matchType,
            surface: surface || undefined,
            setScores: initialData?.setScores ?? [],
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

        // 상호 확인 요청: 직접 저장하지 않고 요청을 생성 — 상대가 수락하면 양쪽 기록에 미확정으로 추가된다
        if (isConfirmFlow && opponent.userId && surface && playedTime) {
            const opponentUserId = opponent.userId
            startTransition(async () => {
                const res = await createMatchRequestAction({
                    opponentUserId,
                    opponentName: opponent.name.trim(),
                    playedAt,
                    playedTime,
                    surface,
                    notes: notes || undefined,
                })
                if (res.error) setError(res.error)
                else router.push('/me/match-requests?tab=sent')
            })
            return
        }

        const input = buildInput()
        startTransition(async () => {
            const res = initialData
                ? await updatePersonalMatchAction(initialData.id, input)
                : await createPersonalMatchesAction([input])
            if (res.error) {
                setError(res.error)
            } else {
                router.push('/me/personal-matches')
            }
        })
    }

    // 섹션 카드 제목 — 경기 타입/방식에 따라 동적
    const participantsTitle = isRotation ? '참가자 (나 제외)' : isDoubles ? '참가자' : '상대'

    return (
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl space-y-5 lg:max-w-5xl">
            {/* 넓은 화면에서는 2열로 분할해 폼 길이를 줄인다 (좌: 누구와 / 우: 언제·어디서) */}
            <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
                {/* ── 왼쪽 열: 경기 타입 + 참가자 ── */}
                <div className="space-y-5">
            {/* 01 경기 타입 (인원 입력란을 동적으로 결정하므로 최상단) */}
            <FormSectionCard title="경기 타입" step="01" contentClassName="space-y-4">
                <FieldToggle
                    label="경기 타입"
                    required
                    options={MATCH_TYPE_OPTIONS}
                    value={matchType}
                    onChange={setMatchType}
                />

                {/* 복식 신규 등록 시에만 방식 토글 노출 (수정 모드는 단일 레코드라 미지원) */}
                {isDoubles && !initialData && (
                    <DoublesModeToggle value={doublesMode} onChange={setDoublesMode} />
                )}
            </FormSectionCard>

            {/* 02 참가자/상대 */}
            <FormSectionCard title={participantsTitle} step="02" contentClassName="space-y-4">
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
                        opponentSearchResults={!isDoubles && selfUserId ? userSearch.results : undefined}
                        onOpponentSearchTermChange={!isDoubles && selfUserId && !initialData ? userSearch.setTerm : undefined}
                        hideOpponentNtrp={isConfirmFlow}
                    />
                )}
                {isConfirmFlow && <ConfirmFlowNotice opponentName={opponent.name.trim() || '상대'} />}
            </FormSectionCard>
                </div>

                {/* ── 오른쪽 열: 경기 정보 + (로테이션 게임) + 메모 ── */}
                <div className="space-y-5">
            {/* 03 경기 정보 */}
            <FormSectionCard title="경기 정보" step="03" contentClassName="space-y-4">
                <MatchMetaSection
                    playedAt={playedAt}
                    onPlayedAtChange={setPlayedAt}
                    playedTime={playedTime}
                    onPlayedTimeChange={setPlayedTime}
                    surface={surface}
                    onSurfaceChange={setSurface}
                />
                {/* 세트 스코어는 받지 않으므로 결과 미확정 저장을 안내 (로테이션은 게임별 세트를 입력받아 해당 없음) */}
                {!isRotation && <PendingResultNotice existingSets={initialData?.setScores} />}
            </FormSectionCard>

            {/* 04 게임 (로테이션 복식 전용 — 게임별 세트 입력은 기존 방식 유지) */}
            {isRotation && (
                <FormSectionCard title="게임" step="04">
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
                </FormSectionCard>
            )}

            {/* 메모 */}
            <FormSectionCard title="메모" step="선택">
                <NotesSection notes={notes} onNotesChange={setNotes} />
            </FormSectionCard>
                </div>
            </div>

            <FormFooter
                error={error}
                isPending={isPending}
                isValid={isValid}
                submitLabel={isConfirmFlow ? '확인 요청 보내기' : initialData ? '수정 완료' : '경기 저장'}
                onCancel={() => router.back()}
            />
        </form>
    )
}
