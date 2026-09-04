import type { Json } from '@/types/supabase'
import type {
    CourtSurface, MatchRequestStatus, MatchResultStatus, MatchRoomDetail, MatchRoomGame, MatchRoomHost, MatchRoomMember,
    MatchRoomMemberRole, MatchRoomMemberStatus, MatchRoomParticipantRef, MatchRoomSource, MatchRoomSourceKind,
    MatchRoomSourceRole, MatchRoomViewer, MatchType, PersonalMatchSetScore, RotationPoolPlayer,
} from '@/types'

/**
 * get_match_room_detail RPC의 jsonb 응답 → MatchRoomDetail 런타임 가드 파서.
 * 생성 타입이 Json이라 필드마다 타입을 확인한다(any 금지). 계약이 어긋난 항목은 조용히 버린다.
 */
type Rec = Record<string, unknown>
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)
const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined)
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
// Postgres time은 'HH:MM:SS'로 오므로 'HH:MM'로 자른다
const hhmm = (v: unknown): string | undefined => str(v)?.slice(0, 5)

function toParticipant(v: unknown): MatchRoomParticipantRef | null {
    if (!isRec(v)) return null
    const role = str(v.role)
    const name = str(v.name)
    if (!role || !name) return null
    return { role, name, userId: str(v.userId) }
}

function toSetScore(v: unknown): PersonalMatchSetScore | null {
    if (!isRec(v)) return null
    const me = num(v.me)
    const opp = num(v.opp)
    if (me == null || opp == null) return null
    const myAd = v.myAd === 'me' || v.myAd === 'partner' ? v.myAd : undefined
    const oppAd = v.oppAd === 'opponent' || v.oppAd === 'opponent2' ? v.oppAd : undefined
    return { me, opp, ...(myAd ? { myAd } : {}), ...(oppAd ? { oppAd } : {}) }
}

function toMember(v: unknown): MatchRoomMember | null {
    if (!isRec(v)) return null
    const userId = str(v.userId)
    const name = str(v.name)
    if (!userId || !name) return null
    return {
        userId,
        name,
        nickname: str(v.nickname) ?? '',
        profileImage: str(v.profileImage),
        deleted: v.deleted === true,
        role: (str(v.role) ?? 'player') as MatchRoomMemberRole,
        status: (str(v.status) ?? 'joined') as MatchRoomMemberStatus,
        sourceRole: str(v.sourceRole) as MatchRoomSourceRole | undefined,
    }
}

function toGame(v: unknown): MatchRoomGame | null {
    if (!isRec(v)) return null
    const id = str(v.id)
    if (!id) return null
    return {
        id,
        groupSeq: num(v.groupSeq),
        matchType: (str(v.matchType) ?? 'singles') as MatchType,
        setScores: arr(v.setScores).map(toSetScore).filter((s): s is PersonalMatchSetScore => !!s),
        participants: arr(v.participants).map(toParticipant).filter((p): p is MatchRoomParticipantRef => !!p),
    }
}

function toPoolPlayer(v: unknown): RotationPoolPlayer | null {
    if (!isRec(v)) return null
    const name = str(v.name)
    if (!name) return null
    const hand = v.hand === 'right' || v.hand === 'left' ? v.hand : undefined
    return { name, userId: str(v.userId), hand, ntrp: num(v.ntrp) }
}

function toSource(v: unknown): MatchRoomSource {
    const s = isRec(v) ? v : {}
    const kind = str(s.kind) as MatchRoomSourceKind | undefined
    if (kind === 'confirmation') {
        return {
            kind,
            requestStatus: str(s.requestStatus) as MatchRequestStatus | undefined,
            resultStatus: str(s.resultStatus) as MatchResultStatus | undefined,
            repName: str(s.repName),
            repUserId: str(s.repUserId),
            participants: arr(s.participants).map(toParticipant).filter((p): p is MatchRoomParticipantRef => !!p),
        }
    }
    if (kind === 'rotation') {
        const pool = Array.isArray(s.pool)
            ? s.pool.map(toPoolPlayer).filter((p): p is RotationPoolPlayer => !!p)
            : undefined
        return { kind, isFinalized: s.isFinalized === true, pool }
    }
    return { kind: 'direct' }
}

function toHost(v: unknown): MatchRoomHost | null {
    if (!isRec(v)) return null
    const id = str(v.id)
    if (!id) return null
    return { id, name: str(v.name) ?? '(알 수 없음)', nickname: str(v.nickname) ?? '', profileImage: str(v.profileImage), deleted: v.deleted === true }
}

function toViewer(v: unknown): MatchRoomViewer | undefined {
    if (!isRec(v)) return undefined
    const role = str(v.role)
    const status = str(v.status)
    if (!role || !status) return undefined
    return { role: role as MatchRoomMemberRole, status: status as MatchRoomMemberStatus }
}

export function parseRoomDetail(json: Json | null): MatchRoomDetail | null {
    if (!isRec(json) || !isRec(json.room)) return null
    const r = json.room
    const id = str(r.id)
    const hostUserId = str(r.hostUserId)
    const playedAt = str(r.playedAt)
    const host = toHost(json.host)
    if (!id || !hostUserId || !playedAt || !host) return null
    return {
        room: {
            id,
            hostUserId,
            sourceKind: (str(r.sourceKind) ?? 'direct') as MatchRoomSourceKind,
            playedAt,
            playedTime: hhmm(r.playedTime),
            matchType: (str(r.matchType) ?? 'singles') as MatchType,
            surface: str(r.surface) as CourtSurface | undefined,
            courtName: str(r.courtName),
            notes: str(r.notes),
            hasResult: r.hasResult === true,
            createdAt: str(r.createdAt) ?? '',
        },
        host,
        viewer: toViewer(json.viewer),
        members: arr(json.members).map(toMember).filter((m): m is MatchRoomMember => !!m),
        source: toSource(json.source),
        games: arr(json.games).map(toGame).filter((g): g is MatchRoomGame => !!g),
    }
}
