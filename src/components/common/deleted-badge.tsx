import { Badge } from '@/components/ui/badge'

/**
 * 탈퇴한 회원 표시(어휘표 「is_guest / 탈퇴 회원」) — 어디서나 같은 한 단어.
 * 이름은 스냅샷이 있는 자리(개인 카드·룸 게임 참가자)에서는 원래 이름, 없는 자리(명단·소유자·프로필)에서는
 * 익명화된 `탈퇴한 회원`이 보이지만 배지는 둘 다 이것이다(F-25).
 */
export function DeletedBadge({ className }: { className?: string }) {
    return (
        <Badge variant="outline" className={`text-caption text-muted-foreground shrink-0 ${className ?? ''}`}>
            탈퇴
        </Badge>
    )
}
