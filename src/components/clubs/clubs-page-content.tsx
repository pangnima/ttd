'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { ClubTableRow } from '@/components/clubs/club-table-row'
import { cn } from '@/lib/utils'
import { dummyClubs } from '@/lib/dummy/clubs'
import { getStoredClubs } from '@/lib/store/club-store'
import { createClient } from '@/lib/supabase/client'
import { getMembershipStatus } from '@/lib/store/club-member-store'
import { Plus, Search } from 'lucide-react'
import type { Club, ClubMember } from '@/types'

type MembershipMap = Record<string, ClubMember['status'] | null>

const TABLE_HEADER = (
    <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="text-xs font-medium w-[40%]">클럽</TableHead>
            <TableHead className="text-xs font-medium">지역</TableHead>
            <TableHead className="text-xs font-medium">회원 수</TableHead>
            <TableHead className="text-xs font-medium text-right">관리</TableHead>
        </TableRow>
    </TableHeader>
)

export function ClubsPageContent() {
    const [allClubs, setAllClubs] = useState<Club[]>(dummyClubs)
    const [search, setSearch] = useState('')
    const [membershipMap, setMembershipMap] = useState<MembershipMap>({})

    const loadData = useCallback(async () => {
        const stored = getStoredClubs()
        const storedIds = new Set(stored.map((c) => c.id))
        const merged = [
            ...dummyClubs.filter((c) => !storedIds.has(c.id)),
            ...stored,
        ]
        setAllClubs(merged)

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            const map: MembershipMap = {}
            merged.forEach((club) => {
                map[club.id] = getMembershipStatus(user.id, club.id)
            })
            setMembershipMap(map)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    // getStoredMembers 변경 감지를 위해 storage 이벤트 구독
    useEffect(() => {
        const handler = () => loadData()
        window.addEventListener('storage', handler)
        return () => window.removeEventListener('storage', handler)
    }, [loadData])

    const filtered = search.trim()
        ? allClubs.filter(
            (c) =>
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.region.toLowerCase().includes(search.toLowerCase())
        )
        : allClubs

    const myClubs = filtered.filter((c) => membershipMap[c.id] === 'approved')
    const otherClubs = filtered.filter((c) => membershipMap[c.id] !== 'approved')

    return (
        <div className="w-full">
            <div className="flex items-start justify-between mb-1">
                <div>
                    <h1 className="text-2xl font-bold">클럽 목록</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        가입할 클럽을 찾아보세요.
                    </p>
                </div>
                <Link
                    href="/clubs/new"
                    className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}
                >
                    <Plus className="w-4 h-4" />
                    클럽 만들기
                </Link>
            </div>

            <div className="flex justify-end mb-4 mt-6">
                <div className="relative w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                        placeholder="클럽 검색"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 h-8 text-sm"
                    />
                </div>
            </div>

            {myClubs.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                        내 클럽
                    </h2>
                    <div className="rounded-lg border border-border overflow-hidden">
                        <Table>
                            {TABLE_HEADER}
                            <TableBody>
                                {myClubs.map((club) => (
                                    <ClubTableRow
                                        key={club.id}
                                        club={club}
                                        membershipStatus="approved"
                                        onStatusChange={loadData}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    전체 클럽
                </h2>
                {otherClubs.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center border rounded-lg">
                        검색 결과가 없습니다.
                    </p>
                ) : (
                    <div className="rounded-lg border border-border overflow-hidden">
                        <Table>
                            {TABLE_HEADER}
                            <TableBody>
                                {otherClubs.map((club) => (
                                    <ClubTableRow
                                        key={club.id}
                                        club={club}
                                        membershipStatus={membershipMap[club.id] ?? null}
                                        onStatusChange={loadData}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                    총 {otherClubs.length}개 클럽
                </p>
            </div>
        </div>
    )
}
