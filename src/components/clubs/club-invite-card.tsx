'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check, Copy, Link2, RefreshCw, Trash2 } from 'lucide-react'
import { createInviteLinkAction, revokeInviteLinkAction } from '@/lib/actions/club-members'

type Props = {
    clubId: string
    activeToken: string | null
}

// owner 전용 초대 링크 관리. 비공개 클럽은 검색 노출이 없어 이 링크가 유일한 멤버 모집 수단.
export function ClubInviteCard({ clubId, activeToken }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const inviteUrl = activeToken
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/clubs/join/${activeToken}`
        : ''

    const handleCreate = () => {
        setError(null)
        startTransition(async () => {
            const result = await createInviteLinkAction(clubId)
            if ('error' in result) {
                setError(result.error)
                return
            }
            router.refresh()
        })
    }

    const handleRevoke = () => {
        setError(null)
        startTransition(async () => {
            const result = await revokeInviteLinkAction(clubId)
            if (result?.error) {
                setError(result.error)
                return
            }
            router.refresh()
        })
    }

    const handleCopy = async () => {
        if (!inviteUrl) return
        await navigator.clipboard.writeText(inviteUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    return (
        <div className="space-y-3">
            {activeToken ? (
                <>
                    <div className="flex items-center gap-2">
                        <Input readOnly value={inviteUrl} className="h-10" onFocus={(e) => e.target.select()} />
                        <Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0" onClick={handleCopy}>
                            {copied ? <Check className="w-3.5 h-3.5 text-win" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? '복사됨' : '복사'}
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleCreate} disabled={isPending}>
                            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
                            재생성
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
                            onClick={handleRevoke}
                            disabled={isPending}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            비활성화
                        </Button>
                    </div>
                </>
            ) : (
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleCreate} disabled={isPending}>
                    <Link2 className="w-3.5 h-3.5" />
                    {isPending ? '생성 중…' : '초대 링크 생성'}
                </Button>
            )}
            {error && <p className="text-caption text-destructive">{error}</p>}
        </div>
    )
}
