import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import type { User } from '@/types'

type UserRow = Database['public']['Tables']['users']['Row']

// DB row → User 도메인 타입 변환. queries/clubs.ts, queries/match-games.ts 등에서 재사용.
// 기본값은 게스트 선수의 미입력 NULL 컬럼 대응:
//   - gender/dominantHand: DB에서 NULL이 가능한 컬럼이지만 타입은 string 유니온이므로 기본값 필요
//   - ntrp: 게스트는 레이팅이 없으므로 0 (표시 시 별도 처리 필요)
//   - isGuest: false가 기본이며, is_guest=true인 row는 public.users에 존재하는 임시 선수
export function mapUserRow(row: UserRow): User {
    return {
        id: row.id,
        email: row.email,
        name: row.name,
        nickname: row.nickname,
        role: row.role as User['role'],
        profileImage: row.profile_image ?? undefined,
        phone: row.phone ?? '',
        gender: (row.gender ?? 'male') as User['gender'],
        dominantHand: (row.dominant_hand ?? 'right') as User['dominantHand'],
        ntrp: row.ntrp ?? 0,
        personalNtrp: row.personal_ntrp != null ? Number(row.personal_ntrp) : undefined,
        tennisStartDate: row.tennis_start_date ?? '',
        racketBrand: row.racket_brand ?? undefined,
        createdAt: row.created_at,
        isGuest: row.is_guest ?? false,
        statsHidden: row.stats_hidden ?? false,
    }
}

export async function fetchUserById(id: string): Promise<User | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()
    if (error || !data) return null
    return mapUserRow(data)
}

export async function fetchUsersByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return []
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('id', ids)
    if (error || !data) return []
    return data.map(mapUserRow)
}

export type OpponentCandidate = {
    id: string
    name: string
    nickname?: string      // 전체 회원 검색 결과에서만 채움 (닉네임 매칭 표시·필터용)
    ntrp?: number          // 정적 자가선언 NTRP (fallback)
    personalNtrp?: number  // 동적 개인 NTRP(개인경기 기반 캐시). 있으면 프리필 우선
    dominantHand?: 'right' | 'left'  // 프로필 손잡이 — 선택 시 손잡이 자동 채움
    isGuest: boolean
    clubNames: string[]
}

/** users.dominant_hand 원시값 → 유니온 (NULL·미지원 값은 undefined) */
export function toDominantHand(value: string | null | undefined): 'right' | 'left' | undefined {
    return value === 'right' || value === 'left' ? value : undefined
}

// 내가 가입(approved)한 클럽의 모든 멤버 목록 (자신 제외, 중복 제거).
// 개인 매치 등록 폼에서 상대 자동완성 후보(클럽 회원 그룹)에 사용.
export async function fetchOpponentCandidates(userId: string): Promise<OpponentCandidate[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('club_members')
        .select('club_id, clubs(name), users!club_members_user_id_fkey(id, name, ntrp, personal_ntrp, dominant_hand, is_guest)')
        .eq('status', 'approved')
        .neq('user_id', userId)

    if (error || !data) return []

    const map = new Map<string, OpponentCandidate>()
    for (const row of data) {
        const u = row.users as {
            id: string; name: string; ntrp: number | null; personal_ntrp: number | null
            dominant_hand: string | null; is_guest: boolean
        } | null
        const club = row.clubs as { name: string } | null
        if (!u) continue
        const existing = map.get(u.id)
        if (existing) {
            if (club) existing.clubNames.push(club.name)
        } else {
            map.set(u.id, {
                id: u.id,
                name: u.name,
                ntrp: u.ntrp ?? undefined,
                personalNtrp: u.personal_ntrp != null ? Number(u.personal_ntrp) : undefined,
                dominantHand: toDominantHand(u.dominant_hand),
                isGuest: u.is_guest ?? false,
                clubNames: club ? [club.name] : [],
            })
        }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}
