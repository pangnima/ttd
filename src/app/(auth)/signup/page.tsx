import Link from 'next/link'
import { SignupForm } from '@/components/auth/signup-form'

export default function SignupPage() {
    return (
        <div className="h-full overflow-y-auto">
            <div className="min-h-full flex items-center justify-center px-6 py-10">
                <div className="w-full max-w-md">
                    <Link href="/" className="flex items-center gap-2.5 mb-10">
                        <div className="w-8 h-8 rounded-md border border-foreground/30 flex items-center justify-center text-foreground text-sm font-bold bg-foreground/10">
                            TC
                        </div>
                        <span className="text-sm font-medium tracking-widest uppercase text-foreground/70">
                            Tennis Club
                        </span>
                    </Link>

                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-foreground">계정 만들기</h1>
                        <p className="mt-1.5 text-sm text-foreground/55">
                            이미 계정이 있으신가요?{' '}
                            <Link href="/login" className="text-foreground hover:text-foreground/80 underline underline-offset-2 transition-colors">
                                로그인
                            </Link>
                        </p>
                    </div>

                    <SignupForm />
                </div>
            </div>
        </div>
    )
}
