import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="text-center">로그인</CardTitle>
                <p className="text-sm text-muted-foreground text-center">
                    이메일과 비밀번호로 로그인하세요
                </p>
            </CardHeader>
            <CardContent>
                <LoginForm />
            </CardContent>
        </Card>
    )
}
