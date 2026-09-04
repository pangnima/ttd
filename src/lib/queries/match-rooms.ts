import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { parseRoomDetail } from '@/lib/match-rooms/parse-detail'
import { countJoined } from '@/lib/match-rooms/headcount'
import type {
    CourtSurface, MatchRoomDetail, MatchRoomHost, MatchRoomInvite, MatchRoomMemberRole, MatchRoomMemberStatus,
    MatchRoomSourceKind, MatchRoomSourceRole, MatchRoomSummary, MatchType,
} from '@/types'

/**
 * 경기 리스트(경기 방) 조회.
 * match_rooms는 로그인 회원 전원 SELECT(공개 메타), 비밀번호 해시는 match_room_secrets(정책 없음)라 여기서 절대 읽히지 않는다.
 * 상세는 get_match_room_detail RPC가 멤버십을 검증한 뒤 jsonb로 내려준다.
 */

// 공개 메타 컬럼만 명시 (select('*') 금지 — 방 행에는 없지만 습관적으로 secrets를 조인하지 않기 위한 규약)
const ROOM_COLUMNS = 'id, host_user_id, source_kind, played_at, played_time, match_type, surface, court_name, capacity, has_result'
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
    capacity: number
    has_result: boolean
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
        capacity: row.capacity,
        hasResult: row.has_result,
        joinedCount: countJoined(members.map((m) => ({ role: m.role as MatchRoomMemberRole, status: m.status as MatchRoomMemberStatus }))),
        host: mapHost(row.host, row.host_user_id),
        viewer: mine ? { role: mine.role as MatchRoomMemberRole, status: mine.status as MatchRoomMemberStatus } : undefined,
    }
}

/** 경기 리스트 전체 (예정/지난 분리는 lib/match-rooms/split.ts) */
export async function fetchMatchRooms(viewerId: string): Promise<MatchRoomSummary[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('match_rooms')
        .select(`${ROOM_COLUMNS}, ${HOST_JOIN}, ${MEMBERS_JOIN}`)
        .order('played_at', { ascending: false })
        .limit(200)
    if (error || !data) return []
    return data.map((row) => mapRoomRow(row, viewerId))
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

/** 내가 받은 방 초대 (status='invited', 최신순) — 확인 요청 허브 '경기 리스트 초대' 섹션 */
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

/** 사이드바 뱃지용 초대 건수 (fetchPendingReceivedCount가 합산) */
export async function fetchPendingRoomInviteCount(userId: string): Promise<number> {
    const supabase = await createClient()
    const { count, error } = await supabase
        .from('match_room_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'invited')
    return error ? 0 : count ?? 0
}
