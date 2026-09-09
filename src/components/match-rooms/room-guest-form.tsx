'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addRoomGuestAction } from '@/lib/actions/match-rooms'
import {
    GENDER_OPTIONS, HAND_OPTIONS, SIGNUP_NTRP_OPTIONS,
    type GenderValue, type HandValue, type SignupNtrp,
} from '@/lib/profile/signup-fields'
import { DialogFooter } from '@/components/ui/dialog'
import { FormActions } from '@/components/common/form-actions'
import { Input } from '@/components/ui/input'
import { FieldToggle } from '@/components/common/field-toggle'

type Props = {
    roomId: string
    onDone: () => void
}

const NTRP_CHOICES = SIGNUP_NTRP_OPTIONS.map((v) => ({ value: v, label: v }))

/**
 * 비회원 추가 폼 (0069) — 계정 없이 코트에 온 사람을 명단에 올린다.
 *
 * '초대'가 아니다: 수락할 상대가 없으므로 저장하는 순간 참가자가 된다. 이름만 필수이고
 * 손잡이·NTRP·성별은 **자동 대진표가 균형을 맞출 때만** 쓰는 참고값이라 비워도 된다.
 */
export function RoomGuestForm({ roomId, onDone }: Props) {
    const [name, setName] = useState('')
    const [hand, setHand] = useState<HandValue | undefined>()
    const [ntrp, setNtrp] = useState<SignupNtrp | undefined>()
    const [gender, setGender] = useState<GenderValue | undefined>()
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    function handleSubmit() {
        if (!name.trim()) {
            setError('이름을 입력해주세요.')
            return
        }
        startTransition(async () => {
            setError(null)
            const res = await addRoomGuestAction(roomId, {
                name,
                dominantHand: hand,
                ntrp: ntrp ? Number(ntrp) : undefined,
                gender,
            })
            if (res.error) {
                setError(res.error)
                return
            }
            onDone()
            router.refresh()
        })
    }

    return (
        <div className="space-y-3">
            <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 (예: 게스트 김코치)"
                maxLength={40}
                autoFocus
            />
            <FieldToggle label="주력손" options={[...HAND_OPTIONS]} value={hand} onChange={setHand} />
            <FieldToggle label="성별" options={[...GENDER_OPTIONS]} value={gender} onChange={setGender} />
            <FieldToggle label="NTRP" options={NTRP_CHOICES} value={ntrp} onChange={setNtrp} columns={7} />
            <p className="text-caption text-muted-foreground break-keep">
                손잡이·성별·NTRP는 자동 대진표의 균형에만 쓰입니다. 몰라도 그냥 두세요.
            </p>
            {error && <p className="text-caption text-destructive break-keep">{error}</p>}
            <DialogFooter>
                <FormActions
                    submitLabel="참가자로 추가"
                    pendingLabel="추가하는 중…"
                    onSubmit={handleSubmit}
                    onCancel={onDone}
                    isPending={isPending}
                />
            </DialogFooter>
        </div>
    )
}
