import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Award, Calendar, Settings, Shield } from 'lucide-react'
import type { User } from '@/types'

type ProfileHeaderProps = {
    profile: User
    isMine: boolean
}

export function ProfileHeader({ profile, isMine }: ProfileHeaderProps) {
    return (
        <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
                {profile.profileImage && (
                    <AvatarImage src={profile.profileImage} alt={profile.nickname} />
                )}
                <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">
                    {profile.nickname[0]}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold">{profile.name}</h1>
                    <span className="text-sm text-muted-foreground">@{profile.nickname}</span>
                    {profile.role === 'admin' && (
                        <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400 gap-1">
                            <Shield className="w-3 h-3" />
                            관리자
                        </Badge>
                    )}
                    {profile.isGuest && (
                        <Badge variant="secondary" className="text-xs">게스트</Badge>
                    )}
                    <Badge variant="outline" className="text-xs font-mono">
                        <Award className="w-3 h-3 mr-1" />
                        NTRP {profile.ntrp.toFixed(1)}
                    </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                    <span>{profile.gender === 'male' ? '남성' : '여성'} · {profile.dominantHand === 'right' ? '오른손잡이' : '왼손잡이'}</span>
                    {profile.tennisStartDate && (
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            테니스 시작: {profile.tennisStartDate}
                        </span>
                    )}
                </div>
            </div>

            {isMine && (
                <Link href="/profile/settings">
                    <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                        <Settings className="w-3.5 h-3.5" />
                        프로필 수정
                    </Button>
                </Link>
            )}
        </div>
    )
}
