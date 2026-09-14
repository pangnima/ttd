import { signInWithOAuthAction } from '@/lib/actions/auth'
import { GoogleMark } from '@/components/auth/provider-marks'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
    /**
     * 로그인 전 가려던 내부 경로. 폼 안 hidden input에만 있던 것을 여기로도 내린다 —
     * 초대 링크로 들어온 사람이 소셜로 로그인하면 원래 가려던 곳을 잃고 있었다.
     */
    next?: string
}

/**
 * 소셜 로그인 버튼.
 *
 * Server Action에 폼으로 제출하므로 **서버 컴포넌트인 채로** 둘 수 있다('use client' 불필요).
 * 카카오는 배선이 같지만 콘솔 설정(비즈 앱 전환·Client Secret·이메일 동의)이 남아 있어 아직
 * 노출하지 않는다 — 눌러도 안 되는 버튼을 두지 않는다. 설정이 끝나면 아래 PROVIDERS에
 * `{ id: 'kakao', label: '카카오' }`를 더하면 된다(액션의 provider 검사는 이미 받아들인다).
 */
const PROVIDERS = [{ id: 'google', label: 'Google로 계속하기' }] as const

export function SocialLoginButtons({ next }: Props) {
    return (
        <div className="grid gap-3">
            {PROVIDERS.map((provider) => (
                <form key={provider.id} action={signInWithOAuthAction}>
                    <input type="hidden" name="provider" value={provider.id} />
                    {next && <input type="hidden" name="next" value={next} />}
                    <button
                        type="submit"
                        className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full h-11 gap-2')}
                    >
                        <GoogleMark />
                        {provider.label}
                    </button>
                </form>
            ))}
        </div>
    )
}

