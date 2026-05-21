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
        tennisStartDate: row.tennis_start_date ?? '',
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
