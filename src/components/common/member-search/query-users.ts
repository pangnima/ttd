import type { createClient } from '@/lib/supabase/client'
import type { OpponentCandidate } from '@/lib/queries/users'
import {
    USER_SEARCH_LIMIT, buildUserSearchPattern, rankUserSearchResults, splitOverflow,
} from '@/lib/profile/user-search'

type BrowserClient = ReturnType<typeof createClient>

export type UserSearchResult = {
    results: OpponentCandidate[]
    /** 상한(USER_SEARCH_LIMIT)보다 더 있다 — 화면은 검색어를 좁히라고 말한다 */
    hasMore: boolean
    error: string | null
}

const EMPTY: UserSearchResult = { results: [], hasMore: false, error: null }

/**
 * 플랫폼 전체 회원 검색 — 브라우저 read-only 조회(users SELECT는 RLS상 인증 유저에게 열려 있다).
 * 명시 조회 훅(useMemberLookup)과 자동완성 훅(useUserSearch)이 **같은 함수**를 쓰므로 두 자리의 결과가 갈리지 않는다.
 *
 * 이름·닉네임 부분 일치. 게스트·탈퇴 유저·본인은 제외. `order('name')`은 상한에 걸릴 때 어떤 21건인지를
 * 결정적으로 만들기 위한 것이고, 화면 순서는 rankUserSearchResults(검색어로 시작하는 사람 우선)가 정한다.
 */
export async function queryUsers(supabase: BrowserClient, rawQuery: string, selfUserId: string): Promise<UserSearchResult> {
    const pattern = buildUserSearchPattern(rawQuery)
    if (!pattern) return EMPTY

    const { data, error } = await supabase
        .from('users')
        .select('id, name, nickname, ntrp, personal_ntrp, stats_hidden, dominant_hand, profile_image')
        .eq('is_guest', false)
        .is('deleted_at', null)
        .neq('id', selfUserId)
        .or(`name.ilike.${pattern},nickname.ilike.${pattern}`)
        .order('name')
        .limit(USER_SEARCH_LIMIT + 1)
    if (error) return { ...EMPTY, error: '회원을 검색하지 못했습니다. 잠시 후 다시 시도해 주세요.' }

    const rows: OpponentCandidate[] = (data ?? []).map((u) => ({
        id: u.id,
        name: u.name,
        nickname: u.nickname,
        profileImage: u.profile_image ?? undefined,
        ntrp: u.ntrp ?? undefined,
        personalNtrp: u.personal_ntrp != null ? Number(u.personal_ntrp) : undefined,
        statsHidden: u.stats_hidden ?? false,
        dominantHand: u.dominant_hand === 'right' || u.dominant_hand === 'left' ? u.dominant_hand : undefined,
        isGuest: false,
        clubNames: [],
    }))
    const { items, hasMore } = splitOverflow(rows, USER_SEARCH_LIMIT)
    return { results: rankUserSearchResults(items, rawQuery), hasMore, error: null }
}
