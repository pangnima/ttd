import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SignupForm } from '@/components/auth/signup-form'

export default function SignupPage() {
    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="text-center">회원가입</CardTitle>
                <p className="text-sm text-muted-foreground text-center">
                    테니스 클럽 플랫폼에 오신 것을 환영합니다
                </p>
            </CardHeader>
            <CardContent>
                <SignupForm />
            </CardContent>
        </Card>
    )
}
