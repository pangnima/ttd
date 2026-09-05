import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { parseRoomDetail } from '@/lib/match-rooms/parse-detail'
import { countJoined } from '@/lib/match-rooms/headcount'
import { encodeRoomCursor, roomKeysetFilter, type RoomCursor } from '@/lib/match-rooms/room-cursor'
import { toDominantHand, type OpponentCandidate } from '@/lib/queries/users'
import { buildConfirmation } from '@/lib/personal-matches/confirmation'
import type {
    CourtSurface, MatchRoomDetail, MatchRoomHost, MatchRoomInvite, MatchRoomMemberRole, MatchRoomMemberStatus,
    MatchRoomSourceKind, MatchRoomSourceRole, MatchRoomSummary, MatchType, PersonalMatchConfirmation,
} from '@/types'

/**
 * 매칭 리스트(매칭 룸) 조회.
 * match_rooms는 로그인 회원 전원 SELECT(공개 메타), 비밀번호 해시는 match_room_secrets(정책 없음)라 여기서 절대 읽히지 않는다.
 * 상세는 get_match_room_detail RPC가 멤버십을 검증한 뒤 jsonb로 내려준다.
 */

// 공개 메타 컬럼만 명시 (select('*') 금지 — 방 행에는 없지만 습관적으로 secrets를 조인하지 않기 위한 규약)
const ROOM_COLUMNS = 'id, host_user_id, source_kind, played_at, played_time, match_type, surface, court_name, is_settled'
const HOST_JOIN = 'host:users!match_rooms_host_user_id_fkey(id, name, nickname, profile_image, deleted_at)'
const MEMBERS_JOIN = 'members:match_room_members(user_id, role, status)'

type HostRow = { id: string; name: string; nickname: string; profile_image: string | null; deleted_at: string | null } | null
type MemberRow = { user_id: string; role: string; status: string }
type RoomListRow = {
    id: string
    host_user_id: string
    source_kind: string
    played_at: string
    played_time: string | null
    match_type: string
    surface: string | null
    court_name: string | null
    is_settled: boolean
    host: HostRow
    members: MemberRow[]
}

function mapHost(row: HostRow, fallbackId: string): MatchRoomHost {
    return {
        id: row?.id ?? fallbackId,
        name: row?.name ?? '(알 수 없음)',
        nickname: row?.nickname ?? '',
        profileImage: row?.profile_image ?? undefined,
        deleted: !!row?.deleted_at,
    }
}

function mapRoomRow(row: RoomListRow, viewerId: string): MatchRoomSummary {
    const members = row.members ?? []
    const mine = members.find((m) => m.user_id === viewerId)
    return {
        id: row.id,
        hostUserId: row.host_user_id,
        sourceKind: row.source_kind as MatchRoomSourceKind,
        playedAt: row.played_at,
        // Postgres time은 'HH:MM:SS'로 오므로 'HH:MM'로 자른다
        playedTime: row.played_time ? row.played_time.slice(0, 5) : undefined,
        matchType: row.match_type as MatchType,
        surface: (row.surface as CourtSurface | null) ?? undefined,
        courtName: row.court_name ?? undefined,
        isSettled: row.is_settled,
        joinedCount: countJoined(members.map((m) => ({ role: m.role as MatchRoomMemberRole, status: m.status as MatchRoomMemberStatus }))),
        host: mapHost(row.host, row.host_user_id),
        viewer: mine ? { role: mine.role as MatchRoomMemberRole, status: mine.status as MatchRoomMemberStatus } : undefined,
    }
}

/** 한 페이지에 담는 방 수 — 넘치면 커서로 다음 페이지를 연다 */
export const ROOM_PAGE_SIZE = 30

/**
 * '내가 참여한' 탭이 방 목록을 좁히는 데 쓰는 멤버십 id 상한.
 * `.in('id', ids)`가 URL로 나가므로 무한정 늘릴 수 없다. 한 사람의 참여 방 수라
 * 현실적으로 닿지 않지만, 닿으면 최근 멤버십부터 남는다.
 */
const MY_ROOM_ID_LIMIT = 500

/** 진행 중(가까운 순) / 종료(최근순) — 두 축이 정렬 방향과 커서 방향을 함께 결정한다 */
export type RoomListFilter = 'open' | 'past'

export type RoomPage = {
    rooms: MatchRoomSummary[]
    /** 다음 페이지가 있으면 인코딩된 커서, 없으면 null */
    nextCursor: string | null
}

const EMPTY_PAGE: RoomPage = { rooms: [], nextCursor: null }

/**
 * 진행/종료 경계 규칙(0049) — **지난 경기 = 정산 완료(is_settled) 또는 날짜 경과**.
 * 확정이 날짜보다 앞선다: 오늘 잡힌 경기라도 모든 게임이 확정되면 종료로 내려간다.
 * 구 `splitRooms`가 메모리에서 하던 판정을 그대로 서버 필터로 옮긴 것이다.
 * `match_rooms` 자기 컬럼만 건드리므로 `members` 임베드 배열은 훼손되지 않는다.
 *
 * 진행 중은 이 조건의 부정(`is_settled=false ∧ played_at>=오늘`)이라 `.eq().gte()`로 걸린다 —
 * 빌더 타입이 갈려 한 함수로 묶지 않고, 두 호출부가 이 주석을 함께 참조한다.
 */
function pastRoomFilter(todayIso: string): string {
    return `is_settled.eq.true,played_at.lt.${todayIso}`
}

/**
 * 탭 한 페이지. 필터·정렬·커서를 서버에서 처리한다(구 방식: 전체 200건을 받아 메모리 분리).
 *
 * ⚠ 정렬 3열은 `roomKeysetFilter`의 술어와 정확히 짝을 이뤄야 한다 —
 * `played_time`의 nulls 위치까지 포함해서. 한쪽만 바꾸면 페이지 경계에서 행이 새거나 겹친다.
 * PostgREST는 최상위 필터를 전부 AND로 묶으므로 `or`(종료 조건)와 `or`(커서)를 같이 걸어도 안전하다.
 */
export async function fetchRoomPage(
    viewerId: string,
    filter: RoomListFilter,
    todayIso: string,
    opts: { cursor?: RoomCursor | null; roomIds?: string[]; limit?: number } = {},
): Promise<RoomPage> {
    const { cursor, roomIds, limit = ROOM_PAGE_SIZE } = opts
    // 참여 방이 하나도 없으면 .in([])으로 빈 결과를 굳이 왕복시키지 않는다
    if (roomIds && roomIds.length === 0) return EMPTY_PAGE

    const asc = filter === 'open'
    const supabase = await createClient()
    const base = supabase.from('match_rooms').select(`${ROOM_COLUMNS}, ${HOST_JOIN}, ${MEMBERS_JOIN}`)
    let query = asc
        ? base.eq('is_settled', false).gte('played_at', todayIso)
        : base.or(pastRoomFilter(todayIso))
    if (roomIds) query = query.in('id', roomIds)
    if (cursor) query = query.or(roomKeysetFilter(cursor, asc ? 'asc' : 'desc'))

    const { data, error } = await query
        .order('played_at', { ascending: asc })
        .order('played_time', { ascending: asc, nullsFirst: asc })
        .order('id', { ascending: asc })
        .limit(limit + 1)  // 다음 페이지 유무 판정용 1건 더 — 별도 count 왕복을 없앤다
    if (error || !data) return EMPTY_PAGE

    const hasMore = data.length > limit
    const rows = hasMore ? data.slice(0, limit) : data
    const last = rows[rows.length - 1]
    return {
        rooms: rows.map((row) => mapRoomRow(row, viewerId)),
        // 커서는 표시용으로 자르기 전의 DB 원본 시각을 담는다(필터 비교가 어긋나면 안 된다)
        nextCursor: hasMore && last
            ? encodeRoomCursor({ playedAt: last.played_at, playedTime: last.played_time ?? undefined, id: last.id })
            : null,
    }
}

/**
 * 내가 얽힌 방 id — 거절(declined)만 제외한다(`isViewerInvolved`와 같은 술어).
 * '내가 참여한' 탭의 2단 조회 1단계이자 그 탭 배지 숫자의 출처다.
 */
export async function fetchMyRoomIds(viewerId: string): Promise<string[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('match_room_members')
        .select('room_id')
        .eq('user_id', viewerId)
        .neq('status', 'declined')
        .order('created_at', { ascending: false })
        .limit(MY_ROOM_ID_LIMIT)
    if (error || !data) return []
    return data.map((row) => row.room_id)
}

/** '진행 중인 경기' 탭 배지 — 행을 받지 않는 head count라 페이지 크기와 무관하게 정확하다 */
export async function fetchOpenRoomCount(todayIso: string): Promise<number> {
    const supabase = await createClient()
    const { count, error } = await supabase
        .from('match_rooms')
        .select('id', { count: 'exact', head: true })
        .eq('is_settled', false)
        .gte('played_at', todayIso)
    return error ? 0 : (count ?? 0)
}

/** 공개 메타 1건 — 미입장 게이트 화면용 */
export async function fetchMatchRoomSummary(roomId: string, viewerId: string): Promise<MatchRoomSummary | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('match_rooms')
        .select(`${ROOM_COLUMNS}, ${HOST_JOIN}, ${MEMBERS_JOIN}`)
        .eq('id', roomId)
        .maybeSingle()
    if (error || !data) return null
    return mapRoomRow(data, viewerId)
}

/** 상세 — 방장·초대 수락자·비밀번호 입장자만. 멤버가 아니면 null (게이트 렌더) */
export async function fetchMatchRoomDetail(roomId: string): Promise<MatchRoomDetail | null> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_match_room_detail', { p_room_id: roomId })
    if (error) return null
    return parseRoomDetail(data)
}

/**
 * 방 게임의 결과 협상 상태 — key는 sourceRequestId.
 * SELECT 정책(0052)은 요청 당사자 + 복식 참가자(파트너·상대2)에게 열려 있으므로 **행의 존재는 '열람
 * 자격'일 뿐 '입력·확인 자격'이 아니다** — 그 판정은 `viewerIsParty`(요청자 또는 상대 대표)로 한다.
 * 자격 판정에 isRoomGameParty를 쓰면 안 되는 이유 — 로테이션 파생 게임은 대표가 opponent2일 수 있어
 * role로 대표를 추정할 수 없다.
 * proposedSets는 buildConfirmation이 viewer 관점으로 반전해 준다(검증된 코드 재사용).
 */
export async function fetchRoomGameConfirmations(
    requestIds: string[], viewerId: string,
): Promise<Record<string, PersonalMatchConfirmation>> {
    if (requestIds.length === 0) return {}
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('match_requests')
        .select('id, requester_id, opponent_user_id, negotiation:match_result_negotiations(result_status, proposed_by, proposed_set_scores, dispute_reason)')
        .in('id', requestIds)
    if (error || !data) return {}

    const byRequest: Record<string, PersonalMatchConfirmation> = {}
    for (const row of data) {
        const neg = row.negotiation
        byRequest[row.id] = buildConfirmation({
            id: row.id,
            requester_id: row.requester_id,
            opponent_user_id: row.opponent_user_id,
            result_status: neg?.result_status ?? 'none',
            proposed_by: neg?.proposed_by ?? null,
            proposed_set_scores: neg?.proposed_set_scores ?? [],
            dispute_reason: neg?.dispute_reason ?? null,
        }, viewerId)
    }
    return byRequest
}

type ParticipantRow = {
    users: {
        id: string; name: string; nickname: string; ntrp: number | null; personal_ntrp: number | null
        dominant_hand: string | null; is_guest: boolean; deleted_at: string | null
    } | null
}

/**
 * 방에 참가(joined)한 회원 — 방장이 게임을 구성할 때 자동완성 '방 참가자' 그룹(0048).
 * 방장 본인·탈퇴 회원은 제외. 멤버 행은 전원 SELECT, users 프로필 컬럼은 전체 회원 검색과 같은 공개 컬럼이다.
 */
export async function fetchRoomParticipantCandidates(roomId: string, excludeUserId: string): Promise<OpponentCandidate[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('match_room_members')
        .select('users!match_room_members_user_id_fkey(id, name, nickname, ntrp, personal_ntrp, dominant_hand, is_guest, deleted_at)')
        .eq('room_id', roomId)
        .eq('status', 'joined')
        .neq('user_id', excludeUserId)
    if (error || !data) return []
    return (data as ParticipantRow[])
        .map((row) => row.users)
        .filter((u): u is NonNullable<ParticipantRow['users']> => !!u && !u.deleted_at)
        .map(toParticipantCandidate)
        .sort((a, b) => a.name.localeCompare(b.name))
}

function toParticipantCandidate(u: NonNullable<ParticipantRow['users']>): OpponentCandidate {
    return {
        id: u.id,
        name: u.name,
        nickname: u.nickname || undefined,
        ntrp: u.ntrp ?? undefined,
        personalNtrp: u.personal_ntrp != null ? Number(u.personal_ntrp) : undefined,
        dominantHand: toDominantHand(u.dominant_hand),
        isGuest: u.is_guest ?? false,
        clubNames: [],
    }
}

/**
 * 여러 방의 참가자 후보를 한 번에 — 확인 요청 허브가 방 로테이션 세션마다 조회하던 N+1을 없앤다.
 * 결과는 room_id → 후보 목록. 단건(fetchRoomParticipantCandidates)은 룸 게임 폼·로테이션 빌더가 그대로 쓴다.
 */
export async function fetchRoomParticipantCandidatesByRooms(
    roomIds: string[], excludeUserId: string,
): Promise<Record<string, OpponentCandidate[]>> {
    if (roomIds.length === 0) return {}
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('match_room_members')
        .select('room_id, users!match_room_members_user_id_fkey(id, name, nickname, ntrp, personal_ntrp, dominant_hand, is_guest, deleted_at)')
        .in('room_id', roomIds)
        .eq('status', 'joined')
        .neq('user_id', excludeUserId)
    if (error || !data) return {}

    const byRoom: Record<string, OpponentCandidate[]> = {}
    for (const row of data as (ParticipantRow & { room_id: string })[]) {
        const u = row.users
        if (!u || u.deleted_at) continue
        ;(byRoom[row.room_id] ??= []).push(toParticipantCandidate(u))
    }
    for (const list of Object.values(byRoom)) list.sort((a, b) => a.name.localeCompare(b.name))
    return byRoom
}

type InviteRow = {
    room_id: string
    source_role: string | null
    room: {
        played_at: string
        played_time: string | null
        match_type: string
        court_name: string | null
        host: { name: string; nickname: string } | null
    } | null
}

function mapInviteRow(row: InviteRow): MatchRoomInvite | null {
    if (!row.room) return null
    return {
        roomId: row.room_id,
        hostName: row.room.host?.name ?? '(알 수 없음)',
        hostNickname: row.room.host?.nickname ?? '',
        playedAt: row.room.played_at,
        playedTime: row.room.played_time ? row.room.played_time.slice(0, 5) : undefined,
        matchType: row.room.match_type as MatchType,
        courtName: row.room.court_name ?? undefined,
        sourceRole: (row.source_role as MatchRoomSourceRole | null) ?? undefined,
    }
}

/** 내가 받은 방 초대 (status='invited', 최신순) — 확인 요청 허브 '매칭 리스트 초대' 섹션 */
export async function fetchPendingRoomInvites(userId: string): Promise<MatchRoomInvite[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('match_room_members')
        .select(`room_id, source_role, room:match_rooms!inner(played_at, played_time, match_type, court_name, host:users!match_rooms_host_user_id_fkey(name, nickname))`)
        .eq('user_id', userId)
        .eq('status', 'invited')
        .order('created_at', { ascending: false })
    if (error || !data) return []
    return data.map(mapInviteRow).filter((i): i is MatchRoomInvite => !!i)
}

/**
 * 확인 요청 허브·작업 큐용 내 방 멤버십 1회 조회 — 초대 대기(invited)와 참가 중(joined)을 함께 가져온다.
 * 초대 카드(A축)와 방 로테이션 세션 조회(B축)가 같은 행 집합을 두 번 읽던 것을 한 쿼리로 합친다.
 */
export async function fetchMyRoomMemberships(
    userId: string,
): Promise<{ invites: MatchRoomInvite[]; joinedRoomIds: string[] }> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('match_room_members')
        .select(`room_id, status, source_role, room:match_rooms!inner(played_at, played_time, match_type, court_name, host:users!match_rooms_host_user_id_fkey(name, nickname))`)
        .eq('user_id', userId)
        .in('status', ['invited', 'joined'])
        .order('created_at', { ascending: false })
    if (error || !data) return { invites: [], joinedRoomIds: [] }

    const rows = data as (InviteRow & { status: string })[]
    return {
        invites: rows
            .filter((row) => row.status === 'invited')
            .map(mapInviteRow)
            .filter((i): i is MatchRoomInvite => !!i),
        joinedRoomIds: [...new Set(rows.filter((row) => row.status === 'joined').map((row) => row.room_id))],
    }
}
