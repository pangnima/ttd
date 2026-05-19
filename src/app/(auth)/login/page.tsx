import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
    return (
        <div className="h-full flex items-center justify-center px-6">
            <div className="w-full max-w-sm">
                <Link href="/" className="flex items-center gap-2.5 mb-10">
                    <div className="w-8 h-8 rounded-md border border-foreground/20 flex items-center justify-center text-foreground text-sm font-bold bg-foreground/5">
                        TC
                    </div>
                    <span className="text-sm font-medium tracking-widest uppercase text-foreground/60">
                        Tennis Club
                    </span>
                </Link>

                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-foreground">로그인</h1>
                    <p className="mt-1 text-sm text-foreground/40">
                        계정이 없으신가요?{' '}
                        <Link href="/signup" className="text-foreground/70 hover:text-foreground underline underline-offset-2 transition-colors">
                            회원가입
                        </Link>
                    </p>
                </div>

                <LoginForm />
            </div>
        </div>
    )
}
