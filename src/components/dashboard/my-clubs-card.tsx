import Link from 'next/link'
import type { Club } from '@/types'
import { CARD_BASE, CARD_HOVER, EMPTY_BLOCK, SECTION_LABEL } from '@/lib/dashboard/tokens'
import { ClubAvatar } from '@/components/clubs/club-avatar'

type Props = { clubs: Club[] }

export function MyClubsCard({ clubs }: Props) {
    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <p className={SECTION_LABEL}>내 클럽</p>
                <Link
                    href="/clubs"
                    className="text-[11px] text-foreground/65 hover:text-foreground/85 transition-colors"
                >
                    전체 보기
                </Link>
            </div>
            {clubs.length === 0 ? (
                <div className={EMPTY_BLOCK}>가입한 클럽이 없습니다</div>
            ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {clubs.map((club) => (
                        <li key={club.id}>
                            <Link
                                href={`/clubs/${club.id}`}
                                className={`${CARD_BASE} ${CARD_HOVER} flex items-center gap-3 px-3 py-3 group`}
                            >
                                <ClubAvatar name={club.name} logoUrl={club.logoUrl} size="sm" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-foreground/95 group-hover:text-foreground transition-colors truncate">
                                        {club.name}
                                    </p>
                                    {club.region && (
                                        <p className="text-[11px] text-foreground/55 mt-0.5">{club.region}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[11px] text-foreground/55">
                                        {club.memberCount}명
                                    </span>
                                    <span className="text-foreground/40">›</span>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
