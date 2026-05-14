import type { ClubMember } from '@/types'

export const dummyClubMembers: ClubMember[] = []

export function getMembersByClubId(clubId: string): ClubMember[] {
    return dummyClubMembers.filter((m) => m.clubId === clubId && m.status === 'approved')
}

export function getPendingMembersByClubId(clubId: string): ClubMember[] {
    return dummyClubMembers.filter((m) => m.clubId === clubId && m.status === 'pending')
}

export function getJoinedClubIds(userId: string): string[] {
    return dummyClubMembers
        .filter((m) => m.userId === userId && m.status === 'approved')
        .map((m) => m.clubId)
}
