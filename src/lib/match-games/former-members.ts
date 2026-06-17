import 'server-only'

import type { Match, User } from '@/types'
import { matchPlayerIds } from '@/lib/match-games/attendance-stats'
import { fetchUsersByIds } from '@/lib/queries/users'

// 경기에 등장한 player id 중 현재(approved) 멤버 목록에 없는(클럽/계정 탈퇴) 선수를
// users에서 직접 조회해 보강한다. 보강된 id 집합은 '탈퇴' 배지·line-through 표시에 사용한다.
// 대진표 상세·목록 페이지에서 공통으로 사용.
export async function augmentWithFormerMembers(
    members: User[],
    matches: Match[],
): Promise<{ members: User[]; formerMemberIds: Set<string> }> {
    const memberIdSet = new Set(members.map((m) => m.id))
    const missingIds = [...new Set(matches.flatMap(matchPlayerIds))].filter((id) => !memberIdSet.has(id))
    const formerUsers = missingIds.length > 0 ? await fetchUsersByIds(missingIds) : []
    return {
        members: [...members, ...formerUsers],
        formerMemberIds: new Set(formerUsers.map((u) => u.id)),
    }
}
