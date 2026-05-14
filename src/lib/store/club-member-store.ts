import type { ClubMember } from '@/types'

const MEMBERS_KEY = 'tc_club_members'

function isClient(): boolean {
    return typeof window !== 'undefined'
}

export function getStoredMembers(): ClubMember[] {
    if (!isClient()) return []
    try {
        const raw = localStorage.getItem(MEMBERS_KEY)
        return raw ? (JSON.parse(raw) as ClubMember[]) : []
    } catch {
        return []
    }
}

function saveAllMembers(members: ClubMember[]): void {
    if (!isClient()) return
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(members))
}

export function saveMember(member: ClubMember): void {
    const all = getStoredMembers()
    const idx = all.findIndex((m) => m.userId === member.userId && m.clubId === member.clubId)
    if (idx >= 0) {
        all[idx] = member
    } else {
        all.push(member)
    }
    saveAllMembers(all)
}

export function deleteMember(userId: string, clubId: string): void {
    const filtered = getStoredMembers().filter(
        (m) => !(m.userId === userId && m.clubId === clubId)
    )
    saveAllMembers(filtered)
}

export function getMembershipStatus(userId: string, clubId: string): ClubMember['status'] | null {
    const member = getStoredMembers().find(
        (m) => m.userId === userId && m.clubId === clubId
    )
    return member?.status ?? null
}

export function getMemberRoleInClub(userId: string, clubId: string): ClubMember['role'] | null {
    const member = getStoredMembers().find(
        (m) => m.userId === userId && m.clubId === clubId
    )
    return member?.role ?? null
}

export function getJoinedClubIds(userId: string): string[] {
    return getStoredMembers()
        .filter((m) => m.userId === userId && m.status === 'approved')
        .map((m) => m.clubId)
}

export function getMembersByClubId(clubId: string): ClubMember[] {
    return getStoredMembers().filter((m) => m.clubId === clubId && m.status === 'approved')
}

export function getPendingMembersByClubId(clubId: string): ClubMember[] {
    return getStoredMembers().filter((m) => m.clubId === clubId && m.status === 'pending')
}

export function applyToClub(userId: string, clubId: string): void {
    const today = new Date().toISOString().split('T')[0]
    saveMember({
        userId,
        clubId,
        role: 'member',
        status: 'pending',
        joinedAt: today,
    })
}

export function cancelApplication(userId: string, clubId: string): void {
    deleteMember(userId, clubId)
}

export function approveMember(userId: string, clubId: string): void {
    const all = getStoredMembers()
    const member = all.find((m) => m.userId === userId && m.clubId === clubId)
    if (member) {
        saveMember({ ...member, status: 'approved' })
    }
}

export function rejectMember(userId: string, clubId: string): void {
    const all = getStoredMembers()
    const member = all.find((m) => m.userId === userId && m.clubId === clubId)
    if (member) {
        saveMember({ ...member, status: 'rejected' })
    }
}
