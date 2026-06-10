'use client'

import { useState, useMemo } from 'react'
import {
    aggregateHeadToHeadUnified,
    type UnifiedHeadToHeadDetail,
} from '@/lib/analytics/head-to-head'
import type { UnifiedHeadToHead } from '@/lib/queries/stats'
import type { Match, PersonalMatch, User } from '@/types'
import { CARD_BASE, SECTION_LABEL, calcWinRate } from '@/lib/dashboard/tokens'
import { H2H_OUTCOME_STYLE, H2H_OUTCOME_LABEL } from '@/lib/dashboard/outcome'
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
    }
    userId: string
    userMap: Map<string, User>
}

const SOURCE_LABEL: Record<string, string> = { club: '클럽', personal: '개인' }

function StatBlock({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="text-center">
            <p className="text-xl font-bold text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
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
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center border-b border-border pb-4">
                <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">{myName}</p>
                    <p className="text-3xl font-bold text-foreground">{detail.myWins}</p>
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
                    <p className="text-sm font-medium text-muted-foreground mb-2">{opponentDisplayName}</p>
                    <p className="text-3xl font-bold text-foreground">{detail.myLosses}</p>
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
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                        {detail.matches.map((m) => (
                            <div key={m.id} className="flex items-center gap-3 text-sm py-1 border-b border-border last:border-0">
                                <span className="w-20 shrink-0 text-left text-muted-foreground text-xs">{m.date}</span>
                                <span className="w-8 shrink-0 text-left text-muted-foreground text-xs">{SOURCE_LABEL[m.source]}</span>
                                <span className="flex-1 min-w-0 text-left text-foreground text-xs truncate">{m.score || '—'}</span>
                                <span className={`inline-flex items-center justify-center w-6 h-6 shrink-0 rounded-[4px] text-xs font-bold border ${H2H_OUTCOME_STYLE[m.outcome]}`}>
                                    {H2H_OUTCOME_LABEL[m.outcome]}
                                </span>
                            </div>
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
        )
    }, [bundle, userId, selectedEntry])

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
        const ntrp = u?.ntrp ? ` (${u.ntrp})` : ''
        return { value: key, label: `${label}${ntrp}` }
    })
    const externalItems = externalOpponents.map((h) => ({
        value: `name:${h.opponentName}`,
        label: `${h.opponentName} (외부)`,
    }))
    const opponentItems = [...memberItems, ...externalItems]

    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className={SECTION_LABEL}>1:1 맞대결 비교</p>
                <Select value={selectedKey} onValueChange={(v) => v && setSelectedKey(v)} items={opponentItems}>
                    <SelectTrigger className="w-[200px] h-8 text-sm">
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
                                    const ntrp = u?.ntrp ? ` (${u.ntrp})` : ''
                                    return (
                                        <SelectItem key={key} value={key}>
                                            {label}{ntrp}
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
                                            {h.opponentName} (외부)
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
