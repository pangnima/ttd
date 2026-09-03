import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type FormSectionCardProps = {
    title: ReactNode
    /** 헤더 우측 보조 라벨 (예: "01" | "01 / 03" | "선택") */
    step?: string
    /** destructive면 카드 테두리를 위험색으로 강조 (삭제 비밀번호 등) */
    tone?: 'default' | 'destructive'
    /** 본문 래퍼 className (예: 'space-y-4') */
    contentClassName?: string
    className?: string
    children: ReactNode
}

/**
 * 단계형 폼 섹션 카드 — 제목 + 우측 단계 라벨 + 구분선 헤더를 가진 카드.
 * 클럽 만들기·개인 경기 기록 등 섹션 분리형 폼에서 공유한다.
 * (통계 화면의 SectionCard와는 별개 — 이쪽은 입력 폼 섹션 전용)
 */
export function FormSectionCard({
    title,
    step,
    tone = 'default',
    contentClassName,
    className,
    children,
}: FormSectionCardProps) {
    return (
        <Card className={cn(tone === 'destructive' && 'border-destructive/40', className)}>
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <CardTitle className="text-h4">{title}</CardTitle>
                {step && (
                    <span className="text-caption font-medium tracking-widest text-muted-foreground tabular-nums">
                        {step}
                    </span>
                )}
            </CardHeader>
            <CardContent className={contentClassName}>{children}</CardContent>
        </Card>
    )
}
