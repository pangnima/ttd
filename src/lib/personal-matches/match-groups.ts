import type { PersonalMatch } from '@/types'
import { hasResult, tallySets, type SetTally } from '@/lib/personal-matches/winner'

/**
 * 개인 경기 목록의 표시 그룹 — 카드(게임 1건)는 그대로 두고, 같은 묶음에 속한 카드들을
 * 헤더 행(일시·코트명·참여 멤버·전적)으로 한 번 감싸기 위한 단위. 묶음은 두 가지다:
 *  - rotation: 같은 로테이션 세션에서 분해된 행 N개 (행 = 카드)
 *  - multi:    게임(세트) 2개 이상인 행 1개 → 표시용 게임 카드 N장 (로테이션과 같은 관용구)
 * 게임 1개짜리 행은 record — 헤더 없이 카드 1장.
 * 통계 경로의 explodePersonalMatchSets와 무관한 표시 전용 모듈이다.
 */

export type MatchGroupKind = 'rotation' | 'multi' | 'record'

export type MatchGroup = SetTally & {
    key: string
    kind: MatchGroupKind
    playedAt: string
    playedTime?: string
    courtName?: string
    notes?: string
    matchType: PersonalMatch['matchType']
    matches: PersonalMatch[]     // 표시 카드 — rotation은 groupSeq(입력 순) 행들, multi는 가상 게임 카드, record는 1개
    sourceMatch: PersonalMatch   // 액션(수정·삭제·정정)·링크가 기준으로 삼는 원본 행. 가상 카드 id가 새어 나가면 안 된다
    participantNames: string[]   // 나 제외 참여 멤버 — 파트너/상대1/상대2 이름을 첫 등장 순으로 중복 제거
    gameCount: number            // 세트(게임) 수 합 — 세트 1개 = 게임 1개
}

export function isRotationMatch(m: PersonalMatch): boolean {
    return !!m.rotationSessionId || m.sourceType === 'rotation'
}

/**
 * 표시용 게임 분해 — 게임(세트) 2개 이상인 행 1개를 게임마다 카드 1장으로 편다.
 * 통계용 explodePersonalMatchSets와 id 규약(`원본id#세트인덱스`)만 공유하고 경로는 분리한다:
 * 저쪽은 winner를 붙인 집계 입력, 이쪽은 화면에 그릴 카드다. 원본 행은 그룹의 sourceMatch가 들고 있다.
 */
export function splitGameCards(m: PersonalMatch): PersonalMatch[] {
    return m.setScores.map((s, i) => ({ ...m, id: `${m.id}#${i}`, setScores: [s] }))
}

function kindOf(m: PersonalMatch): MatchGroupKind {
    if (m.rotationSessionId) return 'rotation'
    return m.setScores.length > 1 ? 'multi' : 'record'
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
                key, kind: kindOf(m),
                playedAt: m.playedAt, playedTime: m.playedTime, courtName: m.courtName, notes: m.notes,
                matchType: m.matchType, sourceMatch: m,
                matches: [], participantNames: [], gameCount: 0, wins: 0, losses: 0, draws: 0,
            }
            byKey.set(key, g)
            groups.push(g)
        }
        const t = tallyMatch(m)
        // multi 그룹만 카드를 편다 — 로테이션은 행이 곧 게임이라 그대로 두고(레거시 멀티세트 행 포함, 0044),
        // 카드마다 액션이 붙는 유일한 종류라 가상 카드를 섞으면 액션이 없는 id를 가리키게 된다.
        g.matches.push(...(g.kind === 'multi' ? splitGameCards(m) : [m]))
        addParticipants(g.participantNames, m)
        g.gameCount += Math.max(1, m.setScores.length)
        g.wins += t.wins
        g.losses += t.losses
        g.draws += t.draws
    }
    return groups
}

/**
 * 카드 순번 라벨 '게임 N' — 로테이션은 groupSeq(입력 순. 한 세션의 게임이 허브 섹션마다 갈려도 번호가 보존된다),
 * 멀티 게임은 가상 카드 인덱스, 게임 1개짜리 레코드는 없음. 룸 행·로테이션 요청 묶음 카드와 같은 어휘다.
 */
export function gameLabelOf(kind: MatchGroupKind, m: PersonalMatch, index: number): string | undefined {
    if (kind === 'record') return undefined
    if (kind === 'rotation') return `게임 ${m.groupSeq ?? index + 1}`
    return `게임 ${index + 1}`
}
