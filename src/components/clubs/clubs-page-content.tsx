'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { ClubListRow } from '@/components/clubs/club-list-row'
import { SECTION_LABEL, EMPTY_BLOCK } from '@/lib/dashboard/tokens'
import { Plus, Search, Users } from 'lucide-react'
import type { Club, ClubMember } from '@/types'

type ClubsPageContentProps = {
    allClubs: Club[]
    membershipMap: Map<string, { status: ClubMember['status'], role: ClubMember['role'] }>
}

export function ClubsPageContent({ allClubs, membershipMap }: ClubsPageContentProps) {
    const [search, setSearch] = useState('')

    const filtered = search.trim()
        ? allClubs.filter(
            (c) =>
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.region.toLowerCase().includes(search.toLowerCase())
        )
        : allClubs

    const myClubs = filtered.filter((c) => membershipMap.get(c.id)?.status === 'approved')
    const otherClubs = filtered.filter((c) => membershipMap.get(c.id)?.status !== 'approved')

    return (
        <div className="w-full space-y-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">클럽 목록</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">가입할 클럽을 찾아보세요</p>
                </div>
                <Link
                    href="/clubs/new"
                    className="flex items-center gap-1.5 text-sm border border-border rounded-full px-4 py-1.5 text-foreground hover:bg-muted hover:border-input transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" />
                    클럽 만들기
                </Link>
            </div>

            {/* 검색 */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="클럽 이름·지역으로 검색"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-background border-input"
                />
            </div>

            {/* 내 클럽 */}
            {myClubs.length > 0 && (
                <section className="space-y-3">
                    <p className={SECTION_LABEL}>내 클럽</p>
                    <ul className="space-y-2">
                        {myClubs.map((club) => (
                            <ClubListRow
                                key={club.id}
                                club={club}
                                membershipStatus="approved"
                                isOwner={membershipMap.get(club.id)?.role === 'owner'}
                            />
                        ))}
                    </ul>
                </section>
            )}

            {/* 전체 클럽 */}
            <section className="space-y-3">
                <p className={SECTION_LABEL}>전체 클럽</p>
                {otherClubs.length === 0 ? (
                    search.trim() ? (
                        <div className={EMPTY_BLOCK}>검색 결과가 없습니다.</div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 border border-border border-dashed rounded-xl">
                            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                                <Users className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-sm text-foreground">아직 가입 가능한 클럽이 없습니다.</p>
                                <p className="text-xs text-muted-foreground">직접 클럽을 만들어보세요.</p>
                            </div>
                        </div>
                    )
                ) : (
                    <ul className="space-y-2">
                        {otherClubs.map((club) => (
                            <ClubListRow
                                key={club.id}
                                club={club}
                                membershipStatus={membershipMap.get(club.id)?.status ?? null}
                                isOwner={membershipMap.get(club.id)?.role === 'owner'}
                            />
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )
}
