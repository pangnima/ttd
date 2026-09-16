import type { UnifiedHeadToHeadDetail } from '@/lib/analytics/head-to-head'
import { TYPO } from '@/lib/dashboard/tokens'
import { formatRecord } from '@/lib/dashboard/outcome'
import { MATCH_TYPE_LABELS } from '@/lib/dashboard/match-type-style'
import { SURFACE_LABELS } from '@/lib/dashboard/surface'

/** 규칙기반 분석 코멘트 박스 */
export function H2HAnalysisComment({ lines }: { lines: string[] }) {
    if (lines.length === 0) return null
    return (
        <div className="rounded-md border border-border bg-muted/40 p-3 space-y-1">
            <p className={TYPO.caption}>분석</p>
            <p className="text-body2 text-foreground">{lines[0]}</p>
            {lines.slice(1).map((l, i) => (
                <p key={i} className="text-body2 text-muted-foreground">· {l}</p>
            ))}
        </div>
    )
}

type Row = { key: string; label: string; wins: number; losses: number; draws: number }

/** 분해 그룹 — 제목 아래 라벨·전적 좌우 정렬 (텍스트, 뱃지 없음) */
function BreakdownGroup({ title, rows }: { title: string; rows: Row[] }) {
    if (rows.length === 0) return null
    return (
        <div className="space-y-1">
            <p className={TYPO.caption}>{title}</p>
            <div className="space-y-0.5">
                {rows.map((r) => (
                    <div key={r.key} className="grid grid-cols-[5rem_1fr] text-body2">
                        <span className="text-muted-foreground">{r.label}</span>
                        <span className="text-foreground">{formatRecord(r.wins, r.losses, r.draws)}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

/** 매치타입별 · 코트별 전적 요약 (정렬된 텍스트 목록) */
export function H2HBreakdownList({ detail }: { detail: UnifiedHeadToHeadDetail }) {
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
