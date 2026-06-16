'use client'

import { useState, useMemo } from 'react'
import {
    aggregateHeadToHeadUnified,
    summarizeHeadToHead,
    type HeadToHeadMatchEntry,
    type UnifiedHeadToHeadDetail,
} from '@/lib/analytics/head-to-head'
import type { UnifiedHeadToHead } from '@/lib/queries/stats'
import type { CourtSurface, Match, PersonalMatch, User } from '@/types'
import { CARD_BASE, SECTION_LABEL, PILL_BASE, TYPO, calcWinRate } from '@/lib/dashboard/tokens'
import { H2H_OUTCOME_STYLE, H2H_OUTCOME_LABEL, formatRecord } from '@/lib/dashboard/outcome'
import { MATCH_TYPE_LABELS, getMatchTypeStyle } from '@/lib/dashboard/match-type-style'
import { SURFACE_LABELS } from '@/lib/dashboard/surface'
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

type Props = {
    h2hList: UnifiedHeadToHead[]
    bundle: {
        matches: Match[]
        gameMetaById: Record<string, { date: string }>
        personalMatches: PersonalMatch[]
        courtSurfaceByMatchId: Record<string, CourtSurface | null>
    }
    userId: string
    userMap: Map<string, User>
}

const SOURCE_LABEL: Record<string, string> = { club: '클럽', personal: '개인' }
const HAND_LABEL: Record<'right' | 'left', string> = { right: '오른손', left: '왼손' }

function StatBlock({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="text-center">
            <p className="text-xl font-bold text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
        </div>
    )
}

// 상단 상대 식별 헤더 — 이름 크게 + 주력손/NTRP pill
function H2HOpponentHeader({
    name,
    hand,
    ntrp,
}: {
    name: string
    hand: 'right' | 'left' | null
    ntrp: number | null
}) {
    return (
        <div className="flex items-center flex-wrap gap-2 border-b border-border pb-3">
            <span className="text-base font-semibold text-foreground truncate">{name}</span>
            {hand && <span className={`${PILL_BASE} border-border text-muted-foreground`}>{HAND_LABEL[hand]}</span>}
            {ntrp != null && <span className={`${PILL_BASE} border-border text-muted-foreground`}>NTRP {ntrp.toFixed(1)}</span>}
        </div>
    )
}

// 규칙기반 분석 코멘트 박스
function H2HAnalysisComment({ lines }: { lines: string[] }) {
    if (lines.length === 0) return null
    return (
        <div className="rounded-md border border-border bg-muted/40 p-3 space-y-1">
            <p className={TYPO.meta}>분석</p>
            <p className="text-sm text-foreground">{lines[0]}</p>
            {lines.slice(1).map((l, i) => (
                <p key={i} className="text-sm text-muted-foreground">· {l}</p>
            ))}
        </div>
    )
}

// 분해 그룹 — 제목 아래 라벨·전적 좌우 정렬 (텍스트, 뱃지 없음)
function BreakdownGroup({
    title,
    rows,
}: {
    title: string
    rows: { key: string; label: string; wins: number; losses: number; draws: number }[]
}) {
    if (rows.length === 0) return null
    return (
        <div className="space-y-1">
            <p className={TYPO.meta}>{title}</p>
            <div className="space-y-0.5">
                {rows.map((r) => (
                    <div key={r.key} className="grid grid-cols-[5rem_1fr] text-sm">
                        <span className="text-muted-foreground">{r.label}</span>
                        <span className="text-foreground">{formatRecord(r.wins, r.losses, r.draws)}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// 매치타입별 · 코트별 전적 요약 (정렬된 텍스트 목록)
function H2HBreakdownList({ detail }: { detail: UnifiedHeadToHeadDetail }) {
    if (detail.byMatchType.length === 0) return null
    return (
        <div className="border-t border-border pt-3 space-y-3">
            <BreakdownGroup
                title="매치타입별"
                rows={detail.byMatchType.map((b) => ({
                    key: b.matchType, label: MATCH_TYPE_LABELS[b.matchType],
                    wins: b.wins, losses: b.losses, draws: b.draws,
                }))}
            />
            <BreakdownGroup
                title="코트별"
                rows={detail.bySurface.map((b) => ({
                    key: b.surface, label: SURFACE_LABELS[b.surface],
                    wins: b.wins, losses: b.losses, draws: b.draws,
                }))}
            />
        </div>
    )
}

// 경기 1행 — 타입(텍스트)·표면·스코어·결과 + (복식) 파트너 · (개인) 시간/메모 서브라인
function H2HMatchRow({
    m,
    myName,
    opponentDisplayName,
}: {
    m: HeadToHeadMatchEntry
    myName: string
    opponentDisplayName: string
}) {
    const isDoubles = m.matchType !== 'singles'
    const sub: string[] = []
    if (m.playedTime) sub.push(m.playedTime)
    if (m.notes) sub.push(m.notes)

    return (
        <div className="py-1.5 border-b border-border last:border-0 space-y-1">
            <div className="flex items-center gap-2 text-xs">
                <span className="w-20 shrink-0 text-left text-muted-foreground">{m.date}</span>
                <span className={`shrink-0 font-medium ${getMatchTypeStyle(m.matchType).textClass}`}>
                    {MATCH_TYPE_LABELS[m.matchType]}
                </span>
                {m.surface && <span className="shrink-0 text-muted-foreground">{SURFACE_LABELS[m.surface]}</span>}
                <span className="flex-1 min-w-0 text-left text-foreground truncate">{m.score || '—'}</span>
                <span className="w-7 shrink-0 text-left text-muted-foreground">{SOURCE_LABEL[m.source]}</span>
                <span className={`inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-[4px] text-xs font-bold border ${H2H_OUTCOME_STYLE[m.outcome]}`}>
                    {H2H_OUTCOME_LABEL[m.outcome]}
                </span>
            </div>
            {isDoubles && (m.myPartnerName || m.opponentPartnerName) && (
                <p className="text-[11px] text-muted-foreground pl-1 truncate">
                    {myName}{m.myPartnerName ? `·${m.myPartnerName}` : ''} vs {opponentDisplayName}{m.opponentPartnerName ? `·${m.opponentPartnerName}` : ''}
                </p>
            )}
            {sub.length > 0 && (
                <p className="text-[11px] text-muted-foreground pl-1 truncate">{sub.join(' · ')}</p>
            )}
        </div>
    )
}

function H2HDetail({
    detail,
    myName,
    opponentDisplayName,
}: {
    detail: UnifiedHeadToHeadDetail
    myName: string
    opponentDisplayName: string
}) {
    const commentLines = summarizeHeadToHead(detail, opponentDisplayName)

    return (
        <div className="space-y-4">
            <H2HOpponentHeader
                name={opponentDisplayName}
                hand={detail.opponentDominantHand}
                ntrp={detail.opponentNtrp}
            />

            <div className="grid grid-cols-3 gap-2 text-center border-b border-border pb-4">
                <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2 truncate">{myName}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{detail.myWins}</p>
                    <p className="text-sm text-muted-foreground mt-1">승 ({detail.winRate}%)</p>
                </div>
                <div className="flex flex-col items-center justify-center">
                    <p className="text-xs text-muted-foreground mb-1">총 {detail.totalMatches}경기</p>
                    <p className="text-lg font-bold text-muted-foreground">vs</p>
                    {detail.draws > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">무 {detail.draws}</p>
                    )}
                </div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2 truncate">{opponentDisplayName}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{detail.myLosses}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        승 ({calcWinRate(detail.myLosses, detail.myWins) ?? 0}%)
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 py-1">
                <StatBlock label="세트 획득" value={detail.mySetsWon} />
                <StatBlock label="세트 실점" value={detail.mySetsLost} />
                <StatBlock label="세트 차" value={
                    detail.mySetsWon - detail.mySetsLost > 0
                        ? `+${detail.mySetsWon - detail.mySetsLost}`
                        : detail.mySetsWon - detail.mySetsLost
                } />
            </div>

            <H2HAnalysisComment lines={commentLines} />

            <H2HBreakdownList detail={detail} />

            {detail.last5.length > 0 && (
                <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">최근 {detail.last5.length}경기</p>
                    <div className="flex gap-1.5">
                        {detail.last5.map((o, i) => (
                            <span
                                key={i}
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-[4px] text-xs font-bold border ${H2H_OUTCOME_STYLE[o]}`}
                            >
                                {H2H_OUTCOME_LABEL[o]}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {detail.matches.length > 0 && (
                <div className="border-t border-border pt-3 space-y-1.5">
                    <p className="text-xs text-muted-foreground">전체 경기 내역</p>
                    <div className="space-y-1 max-h-56 overflow-y-auto">
                        {detail.matches.map((m) => (
                            <H2HMatchRow
                                key={m.id}
                                m={m}
                                myName={myName}
                                opponentDisplayName={opponentDisplayName}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export function HeadToHeadCard({ h2hList, bundle, userId, userMap }: Props) {
    const [selectedKey, setSelectedKey] = useState<string>('')

    const selectedEntry = useMemo(
        () => h2hList.find((h) => (h.opponentUserId ?? `name:${h.opponentName}`) === selectedKey),
        [h2hList, selectedKey],
    )

    const detail = useMemo<UnifiedHeadToHeadDetail | null>(() => {
        if (!selectedEntry) return null
        return aggregateHeadToHeadUnified(
            bundle,
            userId,
            { userId: selectedEntry.opponentUserId, name: selectedEntry.opponentName },
            userMap,
        )
    }, [bundle, userId, selectedEntry, userMap])

    const myName = userMap.get(userId)?.name ?? '나'

    // 상대 표시명: opponentName 우선, 없으면 userMap, 없으면 ID 앞 8자
    const opponentDisplayName = useMemo(() => {
        if (!selectedEntry) return ''
        const { opponentName, opponentUserId } = selectedEntry
        if (opponentName) return opponentName
        if (opponentUserId) return userMap.get(opponentUserId)?.name ?? opponentUserId.slice(0, 8)
        return ''
    }, [selectedEntry, userMap])

    if (h2hList.length === 0) return null

    const memberOpponents = h2hList.filter((h) => h.opponentUserId !== null)
    const externalOpponents = h2hList.filter((h) => h.opponentUserId === null)

    // @base-ui Select.Value는 raw value를 표시하므로, value→label 매핑을 items로 넘긴다.
    // 라벨은 아래 SelectItem 드롭다운 표시와 동일하게 유지한다.
    const memberItems = memberOpponents.map((h) => {
        const key = h.opponentUserId!
        const u = userMap.get(key)
        const label = h.opponentName ?? u?.name ?? key.slice(0, 8)
        return { value: key, label: `${label} (${h.matches}경기)` }
    })
    const externalItems = externalOpponents.map((h) => ({
        value: `name:${h.opponentName}`,
        label: `${h.opponentName} (외부 · ${h.matches}경기)`,
    }))
    const opponentItems = [...memberItems, ...externalItems]

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between gap-x-3 gap-y-2 flex-wrap">
                <p className={`${SECTION_LABEL} shrink-0`}>1:1 맞대결 비교</p>
                <Select value={selectedKey} onValueChange={(v) => v && setSelectedKey(v)} items={opponentItems}>
                    <SelectTrigger className="w-full sm:w-[200px] h-8 text-sm">
                        <SelectValue placeholder="상대 선택" />
                    </SelectTrigger>
                    <SelectContent>
                        {memberOpponents.length > 0 && (
                            <SelectGroup>
                                <SelectLabel className="text-xs text-muted-foreground">클럽 회원</SelectLabel>
                                {memberOpponents.map((h) => {
                                    const key = h.opponentUserId!
                                    const u = userMap.get(key)
                                    const label = h.opponentName ?? u?.name ?? key.slice(0, 8)
                                    return (
                                        <SelectItem key={key} value={key}>
                                            {label} ({h.matches}경기)
                                        </SelectItem>
                                    )
                                })}
                            </SelectGroup>
                        )}
                        {externalOpponents.length > 0 && (
                            <SelectGroup>
                                <SelectLabel className="text-xs text-muted-foreground">외부 상대</SelectLabel>
                                {externalOpponents.map((h) => {
                                    const key = `name:${h.opponentName}`
                                    return (
                                        <SelectItem key={key} value={key}>
                                            {h.opponentName} (외부 · {h.matches}경기)
                                        </SelectItem>
                                    )
                                })}
                            </SelectGroup>
                        )}
                    </SelectContent>
                </Select>
            </div>

            <div className={`${CARD_BASE} p-4`}>
                {detail ? (
                    detail.totalMatches > 0 ? (
                        <H2HDetail detail={detail} myName={myName} opponentDisplayName={opponentDisplayName} />
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            해당 상대와의 맞대결 기록이 없습니다
                        </p>
                    )
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-6">
                        상대를 선택하면 1:1 대결 기록을 확인할 수 있습니다
                    </p>
                )}
            </div>
        </section>
    )
}
