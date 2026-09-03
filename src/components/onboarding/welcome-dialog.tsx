'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BarChart3, LayoutGrid, Users, type LucideIcon } from 'lucide-react'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'

// 1회 노출 영속 키 — 닫으면 다시 뜨지 않는다
const SEEN_KEY = 'onboarding:welcome-seen'

type WelcomeStep = { icon: LucideIcon; title: string; body: string }

// 개인 경기 분석을 1순위로 배치
const STEPS: WelcomeStep[] = [
    {
        icon: BarChart3,
        title: '나의 테니스를 데이터로',
        body: '경기를 기록하면 승률·라이벌·파트너·코트별 통계와 나만의 NTRP 레이팅이 자동으로 쌓입니다.',
    },
    {
        icon: LayoutGrid,
        title: '대진표는 자동으로',
        body: '클럽 경기는 실력 기반 대진을 자동 생성하고, 라운드·코트·시간까지 깔끔하게 정리됩니다.',
    },
    {
        icon: Users,
        title: '함께하는 클럽',
        body: '클럽에 가입하면 회원 랭킹과 클럽 레이팅을 함께 즐길 수 있어요. 운영자라면 회원·승인·공지까지 한 곳에서.',
    },
]

export function WelcomeDialog() {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState(0)

    useEffect(() => {
        // mount 후 미열람 사용자에게만 1회 노출 — 의도된 동기 setState
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (localStorage.getItem(SEEN_KEY) !== '1') setOpen(true)
    }, [])

    // 어떤 경로로 닫혀도(X·백드롭·버튼) 본 것으로 기록
    const close = () => {
        localStorage.setItem(SEEN_KEY, '1')
        setOpen(false)
    }

    const current = STEPS[step]
    const Icon = current.icon
    const isLast = step === STEPS.length - 1
    const pct = Math.round(((step + 1) / STEPS.length) * 100)

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) close()
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <span className="grid size-10 place-items-center rounded-md bg-secondary text-foreground">
                        <Icon className="size-5" />
                    </span>
                    <DialogTitle>{current.title}</DialogTitle>
                    <DialogDescription>{current.body}</DialogDescription>
                </DialogHeader>

                <Progress value={pct} aria-label={`${STEPS.length}단계 중 ${step + 1}단계`} />

                <Link
                    href="/guide"
                    onClick={close}
                    className="w-fit text-caption text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                    사용 가이드 보기 →
                </Link>

                <DialogFooter>
                    {step > 0 && (
                        <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                            이전
                        </Button>
                    )}
                    {isLast ? (
                        <Button render={<Link href="/me/personal-matches/new" />} onClick={close}>
                            첫 경기 기록하기
                        </Button>
                    ) : (
                        <Button onClick={() => setStep((s) => s + 1)}>다음</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
