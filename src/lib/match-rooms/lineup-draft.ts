import type { MatchRoomGame, MatchType } from '@/types'
import { courtNeed, type LineupPlayer } from '@/lib/match-games/lineup-core'
import type { LineupGame, LineupResult, LineupSlot } from '@/lib/match-rooms/lineup'

/**
 * 편집 중인 대진 한 건. 자리가 아직 비어 있을 수 있다는 점만 `LineupGame`과 다르다.
 *
 * `key`는 목록이 흔들리지 않게 하는 정체성이다 — 저장된 게임은 게임 id, 방금 만든 게임은
 * 결정적으로 붙인 임시 키. 순서는 배열 순서이고 화면의 「게임 N」은 그 인덱스에서 파생한다.
 */
export type DraftGame = {
    key: string
    matchType: MatchType
    team1: LineupSlot[]
    team2: LineupSlot[]
}

export type DraftSide = 'team1' | 'team2'

/** 한 팀에 들어가는 자리 수 — 단식 1, 복식 2 */
export function teamSizeOf(matchType: MatchType): number {
    return courtNeed(matchType).size / 2
}

/** 자동 생성 결과 → 편집 가능한 대진 */
export function fromResult(result: LineupResult): DraftGame[] {
    return result.games.map((g) => ({
        key: `gen-${g.seq}`,
        matchType: g.matchType,
        team1: [...g.team1],
        team2: [...g.team2],
    }))
}

/**
 * 저장된 룸 게임 → 편집 가능한 대진.
 *
 * 작성자는 `personal_match_participants` 행이 없다(role은 partner·opponent·opponent2 셋뿐)이므로
 * team1의 첫 자리는 언제나 게임 소유자다. 회원은 user_id로, 게스트는 이름으로 명단과 맞춘다 —
 * 저장부가 게스트를 이름만으로 보내기 때문이다(`create_room_lineup`의 슬롯 규약).
 */
export function fromRoomGames(games: MatchRoomGame[], players: LineupPlayer[]): DraftGame[] {
    return games.map((game) => {
        const roleOf = (role: 'partner' | 'opponent' | 'opponent2') =>
            game.participants.find((p) => p.role === role)
        const pick = (ref?: { name: string; userId?: string }): LineupSlot =>
            ref ? resolvePlayer(players, ref.userId, ref.name) : null

        const size = teamSizeOf(game.matchType)
        const team1: LineupSlot[] = [resolvePlayer(players, game.ownerUserId, game.ownerName)]
        const team2: LineupSlot[] = [pick(roleOf('opponent'))]
        if (size > 1) {
            team1.push(pick(roleOf('partner')))
            team2.push(pick(roleOf('opponent2')))
        }
        return { key: game.id, matchType: game.matchType, team1, team2 }
    })
}

/**
 * 명단에서 그 사람을 찾는다. 못 찾으면 **자리를 비우지 않고** 이름만 남긴 자리표시를 준다 —
 * 방을 나간 사람이 슬롯에 남은 게임이 그렇다. 화면이 그 자리를 드러내야 교체할 수 있다.
 */
function resolvePlayer(players: LineupPlayer[], userId: string | undefined, name: string): LineupSlot {
    const found = userId
        ? players.find((p) => p.isMember && p.key === userId)
        : players.find((p) => !p.isMember && p.name.trim() === name.trim())
    if (found) return found
    return { key: `${MISSING_PREFIX}${userId ?? name}`, name, ntrp: 0, isMember: !!userId }
}

const MISSING_PREFIX = 'missing:'

/** 이 자리의 사람이 지금 방 명단에 없다 — 저장하면 `participant_not_in_room`으로 막힌다 */
export function isMissingPlayer(player: LineupSlot): boolean {
    return !!player && player.key.startsWith(MISSING_PREFIX)
}

/**
 * 한 자리를 바꾼다. 그 사람이 같은 게임의 다른 자리에 이미 있으면 **두 자리를 맞바꾼다** —
 * 중복을 만들어 놓고 검증으로 막는 것보다, 애초에 만들 수 없게 하는 편이 손이 덜 간다.
 */
export function setSlot(
    games: DraftGame[], gameKey: string, side: DraftSide, index: number, player: LineupSlot,
): DraftGame[] {
    return games.map((g) => {
        if (g.key !== gameKey) return g
        const next: DraftGame = { ...g, team1: [...g.team1], team2: [...g.team2] }
        const current = next[side][index] ?? null

        if (player) {
            for (const other of ['team1', 'team2'] as const) {
                const at = next[other].findIndex((p) => p?.key === player.key)
                if (at >= 0 && !(other === side && at === index)) next[other][at] = current
            }
        }
        next[side][index] = player
        return next
    })
}

export function removeGame(games: DraftGame[], gameKey: string): DraftGame[] {
    return games.filter((g) => g.key !== gameKey)
}

/** 빈 자리만 있는 게임 한 건을 끝에 붙인다. 키는 기존 임시 키와 겹치지 않게 결정적으로 만든다 */
export function addGame(games: DraftGame[], matchType: MatchType): DraftGame[] {
    const used = games
        .map((g) => Number(g.key.startsWith(NEW_PREFIX) ? g.key.slice(NEW_PREFIX.length) : NaN))
        .filter((n) => Number.isFinite(n))
    const seq = used.length > 0 ? Math.max(...used) + 1 : 1
    const size = teamSizeOf(matchType)
    return [
        ...games,
        {
            key: `${NEW_PREFIX}${seq}`,
            matchType,
            team1: Array.from({ length: size }, () => null),
            team2: Array.from({ length: size }, () => null),
        },
    ]
}

const NEW_PREFIX = 'new-'

/** 자리가 다 찬 게임만 읽기 카드로 그릴 수 있다 */
export function toLineupGame(draft: DraftGame, index: number): LineupGame | null {
    const team1 = draft.team1.filter((p): p is LineupPlayer => !!p)
    const team2 = draft.team2.filter((p): p is LineupPlayer => !!p)
    if (team1.length !== draft.team1.length || team2.length !== draft.team2.length) return null
    return { seq: index + 1, matchType: draft.matchType, team1, team2 }
}

/**
 * 저장할 수 있는 대진인지. `create_room_lineup`이 던지는 예외의 거울이다 —
 * `invalid_games`(자리 수·게임에 회원 한 명)와 `duplicate_players`를 화면에서 먼저 말한다.
 */
export function validateDraft(games: DraftGame[]): string[] {
    const errors: string[] = []
    if (games.length === 0) {
        errors.push('경기를 한 건 이상 만들어주세요.')
        return errors
    }

    games.forEach((g, i) => {
        const label = `게임 ${i + 1}`
        const size = teamSizeOf(g.matchType)
        const slots = [...g.team1, ...g.team2]

        if (g.team1.length !== size || g.team2.length !== size || slots.some((p) => !p)) {
            errors.push(`${label}: 아직 비어 있는 자리가 있습니다.`)
            return
        }

        const filled = slots.filter((p): p is LineupPlayer => !!p)
        if (new Set(filled.map((p) => p.key)).size !== filled.length) {
            errors.push(`${label}: 같은 사람이 두 번 들어갔습니다.`)
            return
        }
        // 게임에 회원이 한 명은 있어야 저장할 자리가 있다(0076) — 한 팀만 회원이면 그 회원의 자유 기록
        if (!filled.some((p) => p.isMember)) {
            errors.push(`${label}: 회원이 한 명은 있어야 합니다.`)
            return
        }
        const missing = filled.filter((p) => isMissingPlayer(p))
        if (missing.length > 0) {
            errors.push(`${label}: ${missing.map((p) => p.name).join(', ')} 님은 매칭 명단에 없습니다.`)
        }
    })

    return errors
}

/** 저장 payload — `createRoomLineupAction`·`replaceRoomLineupAction`이 받는 모양 */
export function toSavePayload(games: DraftGame[]) {
    const slot = (p: LineupSlot) => ({ userId: p?.isMember ? p.key : undefined, name: p?.name ?? '' })
    return games.map((g) => ({ team1: g.team1.map(slot), team2: g.team2.map(slot) }))
}
