import type { PersonalMatch } from '@/types'
import { hasResult, tallySets, type SetTally } from '@/lib/personal-matches/winner'

/**
 * 개인 경기 목록의 표시 그룹 — 카드(경기 1건)는 그대로 두고, 같은 로테이션 세션에서 분해된 게임 카드들을
 * 헤더 행(일시·코트명·참여 멤버·전적)으로 한 번 감싸기 위한 묶음. 그 외 레코드는 행마다 1그룹(헤더 없음).
 * 통계 경로의 explodePersonalMatchSets와 무관한 표시 전용 모듈.
 */

export type MatchGroupKind = 'rotation' | 'record'

export type MatchGroup = SetTally & {
    key: string
    kind: MatchGroupKind
    playedAt: string
    playedTime?: string
    courtName?: string
    notes?: string
    matches: PersonalMatch[]     // 로테이션은 groupSeq(입력 순), record는 1개
    participantNames: string[]   // 나 제외 참여 멤버 — 파트너/상대1/상대2 이름을 첫 등장 순으로 중복 제거
    gameCount: number            // 세트(게임) 수 합 — 세트 1개 = 게임 1개
}

export function isRotationMatch(m: PersonalMatch): boolean {
    return !!m.rotationSessionId || m.sourceType === 'rotation'
}

// 최신 경기 먼저, 같은 일시면 로테이션 게임 순번(입력 순) → id로 결정적 정렬
function compareMatches(a: PersonalMatch, b: PersonalMatch): number {
    const d = b.playedAt.localeCompare(a.playedAt)
    if (d !== 0) return d
    const t = (b.playedTime ?? '').localeCompare(a.playedTime ?? '')
    if (t !== 0) return t
    const s = (a.groupSeq ?? 0) - (b.groupSeq ?? 0)
    if (s !== 0) return s
    return a.id.localeCompare(b.id)
}

function groupKeyOf(m: PersonalMatch): string {
    // 같은 세션이라도 개별 수정으로 날짜가 갈리면 다른 그룹(헤더 일시 모순 방지)
    return m.rotationSessionId ? `rotation:${m.rotationSessionId}:${m.playedAt}` : `record:${m.id}`
}

// 전적 집계 — 미확정 행(세트 없음)은 0 (explode 초크포인트와 동일 규칙)
function tallyMatch(m: PersonalMatch): SetTally {
    return hasResult(m) ? tallySets(m.setScores) : { wins: 0, losses: 0, draws: 0 }
}

function addParticipants(names: string[], m: PersonalMatch) {
    for (const n of [m.partnerName, m.opponentName, m.opponent2Name]) {
        const name = n?.trim()
        if (name && !names.includes(name)) names.push(name)
    }
}

/** 개인 경기 → 표시 그룹 (입력 순서 무관, 결정적). */
export function buildMatchGroups(matches: PersonalMatch[]): MatchGroup[] {
    const sorted = [...matches].sort(compareMatches)
    const groups: MatchGroup[] = []
    const byKey = new Map<string, MatchGroup>()

    for (const m of sorted) {
        const key = groupKeyOf(m)
        let g = byKey.get(key)
        if (!g) {
            g = {
                key, kind: m.rotationSessionId ? 'rotation' : 'record',
                playedAt: m.playedAt, playedTime: m.playedTime, courtName: m.courtName, notes: m.notes,
                matches: [], participantNames: [], gameCount: 0, wins: 0, losses: 0, draws: 0,
            }
            byKey.set(key, g)
            groups.push(g)
        }
        const t = tallyMatch(m)
        g.matches.push(m)
        addParticipants(g.participantNames, m)
        g.gameCount += Math.max(1, m.setScores.length)
        g.wins += t.wins
        g.losses += t.losses
        g.draws += t.draws
    }
    return groups
}
