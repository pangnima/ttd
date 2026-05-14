'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { dummyUsers } from '@/lib/dummy/users'
import { setCurrentUserId } from '@/lib/store/auth-store'
import { Shield, User } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()

    function handleLogin(userId: string) {
        setCurrentUserId(userId)
        router.push('/dashboard')
    }

    const adminUser = dummyUsers.find((u) => u.role === 'admin')
    const memberUsers = dummyUsers.filter((u) => u.role === 'member')

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="text-center">로그인</CardTitle>
                <p className="text-sm text-muted-foreground text-center">
                    아래 버튼을 클릭하여 계정을 선택하세요
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* 관리자 */}
                {adminUser && (
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">관리자</p>
                        <Button
                            className="w-full justify-start gap-2 h-10"
                            onClick={() => handleLogin(adminUser.id)}
                        >
                            <Shield className="w-4 h-4 shrink-0" />
                            {adminUser.name}
                        </Button>
                    </div>
                )}

                {/* 회원 목록 */}
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">회원</p>
                    <div className="grid grid-cols-3 gap-2">
                        {memberUsers.map((user) => (
                            <Button
                                key={user.id}
                                variant="outline"
                                className="justify-start gap-1.5 h-9 text-sm"
                                onClick={() => handleLogin(user.id)}
                            >
                                <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                                {user.name}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
