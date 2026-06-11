import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * 소셜 로그인 버튼 — 현재 UI만 구현(무동작).
 * TODO: Supabase OAuth provider 활성화 후 signInWithOAuth Server Action 연결.
 */
export function SocialLoginButtons() {
    return (
        <div className="grid grid-cols-2 gap-3">
            <button
                type="button"
                className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11')}
            >
                카카오
            </button>
            <button
                type="button"
                className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11')}
            >
                Google
            </button>
        </div>
    )
}
