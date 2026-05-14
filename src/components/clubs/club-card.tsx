import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, MapPin } from 'lucide-react'
import type { Club } from '@/types'

type ClubCardProps = {
    club: Club
}

export function ClubCard({ club }: ClubCardProps) {
    return (
        <Link href={`/clubs/${club.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">{club.name}</CardTitle>
                        <Badge variant={club.isPublic ? 'default' : 'secondary'} className="shrink-0 text-xs">
                            {club.isPublic ? '공개' : '비공개'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">{club.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {club.region}
                        </span>
                        <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {club.memberCount}명
                        </span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
