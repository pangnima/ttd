'use client'

import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type Props = {
    /** 트리거 버튼 안(아이콘 + 라벨) */
    trigger: ReactNode
    title: ReactNode
    /** md = 폼 하나(sm:max-w-md), 2xl = 넓은 폼(게임 추가) */
    width?: 'md' | '2xl'
    /** 본문 — 닫는 함수를 받아 저장·취소 뒤에 부른다 */
    children: (close: () => void) => ReactNode
    triggerClassName?: string
}

/**
 * 「작은 outline 버튼 → 팝업」 골격 — 룸의 [회원 초대]·[비회원 등록]·[게임 추가]가 같은 트리거·같은
 * `DialogContent` 클래스·같은 `useState(false)`를 각자 갖고 있던 것을 하나로(Week 69).
 * 닫히면 본문이 언마운트되므로 폼 상태는 다음에 열 때 비어 있다. `showCloseButton`은 쓰지 않는다(영문 Close).
 */
export function TriggerDialog({ trigger, title, width = 'md', children, triggerClassName }: Props) {
    const [open, setOpen] = useState(false)
    const close = () => setOpen(false)
    return (
        <>
            <Button size="sm" variant="outline" className={cn('h-7 text-caption gap-1', triggerClassName)} onClick={() => setOpen(true)}>
                {trigger}
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className={cn(width === '2xl' ? 'sm:max-w-2xl' : 'sm:max-w-md', 'max-h-[85vh] overflow-y-auto')} showCloseButton={false}>
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                    </DialogHeader>
                    {children(close)}
                </DialogContent>
            </Dialog>
        </>
    )
}
