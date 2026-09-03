'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { ClubListRow } from '@/components/clubs/club-list-row'
import { EMPTY_BLOCK, TYPO } from '@/lib/dashboard/tokens'
import { PageHeader } from '@/components/common/page-header'
import { PageContainer } from '@/components/common/page-container'
import { Plus, Search, RefreshCw } from 'lucide-react'
import type { ClubMemberCount } from '@/lib/queries/clubs'
import type { Club, ClubMember } from '@/types'

type ClubsPageContentProps = {
    allClubs: Club[]
    membershipMap: Map<string, { status: ClubMember['status'], role: ClubMember['role'] }>
    memberCounts: Map<string, ClubMemberCount>
}

export function ClubsPageContent({ allClubs, membershipMap, memberCounts }: ClubsPageContentProps) {
    const [search, setSearch] = useState('')
    const router = useRouter()

    const filtered = search.trim()
        ? allClubs.filter(
            (c) =>
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.region.toLowerCase().includes(search.toLowerCase())
        )
        : allClubs

    // 운영 클럽(오너·임원)을 "내 클럽" 섹션 최상단으로
    const ROLE_ORDER: Record<ClubMember['role'], number> = { owner: 0, officer: 1, member: 2 }
    const myClubs = filtered
        .filter((c) => membershipMap.get(c.id)?.status === 'approved')
        .sort((a, b) =>
            (ROLE_ORDER[membershipMap.get(a.id)!.role] ?? 9) -
            (ROLE_ORDER[membershipMap.get(b.id)!.role] ?? 9)
        )
    const otherClubs = filtered.filter((c) => membershipMap.get(c.id)?.status !== 'approved')

    return (
        <PageContainer>
            {/* 헤더 */}
            <PageHeader
                title="클럽 목록"
                description="가입할 클럽을 찾아보세요"
                actions={
                    <Link
                        href="/clubs/new"
                        className="flex items-center gap-1.5 text-body2 border border-border rounded-full px-4 py-1.5 text-foreground hover:bg-muted hover:border-input transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        클럽 만들기
                    </Link>
                }
            />

            {/* 검색 */}
            <div className="relative max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                    placeholder="클럽 이름·지역으로 검색"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-12 pl-11 text-body bg-background border-input"
                />
            </div>

            {/* 내 클럽 */}
            {myClubs.length > 0 && (
                <section className="space-y-3">
                    <h2 className={TYPO.h3}>내 클럽</h2>
                    <ul className="space-y-2">
                        {myClubs.map((club) => (
                            <ClubListRow
                                key={club.id}
                                club={club}
                                membershipStatus="approved"
                                isOwner={membershipMap.get(club.id)?.role === 'owner'}
                                memberCount={memberCounts.get(club.id)}
                            />
                        ))}
                    </ul>
                </section>
            )}

            {/* 전체 클럽 */}
            <section className="space-y-3">
                <h2 className={TYPO.h3}>전체 클럽</h2>
                {otherClubs.length === 0 ? (
                    search.trim() ? (
                        <div className={EMPTY_BLOCK}>검색 결과가 없습니다.</div>
                    ) : (
                        <div className={`${EMPTY_BLOCK} flex flex-col items-center justify-center gap-4 py-12`}>
                            {/* 정적 SVG 장식 (빈 상태 일러스트 관례) */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/empty/clubs-empty.svg" alt="" aria-hidden width={132} height={96} draggable={false} />
                            <div className="space-y-1">
                                <p className="text-body font-medium text-foreground">아직 가입 가능한 클럽이 없습니다.</p>
                                <p className="text-body2 text-muted-foreground">첫 번째 클럽을 만들어 멤버를 모아보세요.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/clubs/new"
                                    className="inline-flex items-center gap-1.5 text-body2 font-medium rounded-md px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    클럽 만들기
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => router.refresh()}
                                    className="inline-flex items-center gap-1.5 text-body2 rounded-md px-3 py-1.5 border border-border text-foreground hover:bg-muted hover:border-input transition-colors"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    새로고침
                                </button>
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
                                memberCount={memberCounts.get(club.id)}
                            />
                        ))}
                    </ul>
                )}
            </section>
        </PageContainer>
    )
}
