import type { RotationPoolPlayer } from '@/types'

/**
 * 로테이션 게임 빌더의 선수 풀 파생 (순수 함수, 0050).
 *
 * 0049까지 빌더의 '나'는 세션 소유자(방장)로 고정이었고 풀은 rotation_sessions.players 그대로였다.
 * 방을 참가자 공유 자원으로 바꾸면서 앵커가 **입력자(로그인한 참가자)**로 바뀌었으므로,
 * 풀도 "세션 풀 ∪ 방 참가자(joined) − 나"로 다시 계산해야 한다.
 *  - 세션 소유자는 players에 들어 있지 않으므로 방 참가자 목록(host 멤버 행)에서 합쳐진다.
 *  - NTRP가 없어 풀 append를 건너뛴 입장자(0050 join_match_room_as_player)도 방 참가자로 합류한다.
 *  - 방이 아닌 개인 세션은 방 참가자가 없으므로 players 그대로가 된다.
 */

/** 방 참가자 후보의 최소 형태 — OpponentCandidate가 구조적으로 대입된다(server-only 모듈 의존 회피) */
export type RoomParticipant = {
    id: string
    name: string
    dominantHand?: 'right' | 'left'
    ntrp?: number
    personalNtrp?: number
}

function fromParticipant(p: RoomParticipant): RotationPoolPlayer {
    const ntrp = p.personalNtrp ?? p.ntrp
    return {
        userId: p.id,
        name: p.name,
        ...(p.dominantHand ? { hand: p.dominantHand } : {}),
        ...(ntrp != null ? { ntrp } : {}),
    }
}

/** dedupe 키 — 회원은 userId, 비회원은 이름 */
function keyOf(p: RotationPoolPlayer): string {
    return p.userId ? `id:${p.userId}` : `name:${p.name.trim()}`
}

/**
 * 빌더 풀 = 세션 풀 ∪ 방 참가자 − 나.
 * 세션 풀 항목을 먼저 두어 방장이 입력한 순서를 보존하고, 중복 회원은 방 참가자의 최신 프로필로 보강한다.
 */
export function buildBuilderPool(
    sessionPlayers: RotationPoolPlayer[],
    roomParticipants: RoomParticipant[],
    viewerId: string,
): RotationPoolPlayer[] {
    const out: RotationPoolPlayer[] = []
    const seen = new Map<string, number>()

    for (const p of [...sessionPlayers, ...roomParticipants.map(fromParticipant)]) {
        if (p.userId === viewerId) continue
        if (!p.userId && !p.name.trim()) continue
        const key = keyOf(p)
        const at = seen.get(key)
        if (at == null) {
            seen.set(key, out.length)
            out.push(p)
            continue
        }
        // 이미 있는 회원이면 비어 있는 값만 방 참가자 정보로 채운다 (세션에 남은 NTRP를 덮어쓰지 않는다)
        const prev = out[at]
        out[at] = {
            ...prev,
            hand: prev.hand ?? p.hand,
            ntrp: prev.ntrp ?? p.ntrp,
        }
    }
    return out
}
