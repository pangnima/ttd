import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function SignupPage() {
    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle className="text-center">회원가입</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                    Week 6에서 Supabase 인증이 연결됩니다.
                </p>
                <Link
                    href="/dashboard"
                    className={cn(buttonVariants(), 'w-full justify-center')}
                >
                    임시 가입 (개발용)
                </Link>
                <p className="text-sm text-center text-muted-foreground">
                    이미 계정이 있으신가요?{' '}
                    <Link href="/login" className="underline">
                        로그인
                    </Link>
                </p>
            </CardContent>
        </Card>
    )
}
