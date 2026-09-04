'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { MATCH_FORM_INPUT, MATCH_FORM_LABEL } from '@/lib/dashboard/tokens'
import { ROOM_PASSWORD_MAX, ROOM_PASSWORD_MIN, validateRoomPassword } from '@/lib/match-rooms/password'

type Props = {
    listed: boolean
    onListedChange: (v: boolean) => void
    password: string
    onPasswordChange: (v: string) => void
}

/**
 * '리스트에 노출' 토글 + 비밀번호 — 켜면 이 기록이 경기 리스트의 방이 되고, 비밀번호를 아는 회원만 상세에 입장한다.
 * 기록에 입력된 회원은 자동 초대되므로 비밀번호 없이 수락만으로 참가한다.
 */
export function ListingSection({ listed, onListedChange, password, onPasswordChange }: Props) {
    const [show, setShow] = useState(false)
    const error = listed && password ? validateRoomPassword(password) : null

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-body font-medium">리스트에 노출</p>
                    <p className="text-caption text-muted-foreground break-keep">
                        회원 누구나 경기 리스트에서 볼 수 있습니다. 입력한 회원은 자동 초대되고, 그 외 회원은 비밀번호로 입장합니다. 메모도 방에 공개됩니다.
                    </p>
                </div>
                <Switch checked={listed} onCheckedChange={onListedChange} aria-label="리스트에 노출" className="mt-1 shrink-0" />
            </div>

            {listed && (
                <div>
                    <label htmlFor="room-password" className={MATCH_FORM_LABEL}>입장 비밀번호 *</label>
                    <div className="flex gap-2">
                        <input
                            id="room-password"
                            type={show ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => onPasswordChange(e.target.value)}
                            autoComplete="new-password"
                            maxLength={ROOM_PASSWORD_MAX}
                            placeholder={`${ROOM_PASSWORD_MIN}~${ROOM_PASSWORD_MAX}자, 공백 없이`}
                            className={`${MATCH_FORM_INPUT} h-12 flex-1`}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShow((v) => !v)}
                            className="shrink-0 px-3 h-12 rounded-md border border-border text-caption text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {show ? '숨김' : '표시'}
                        </button>
                    </div>
                    {error && <p className="mt-1 text-caption text-destructive">{error}</p>}
                </div>
            )}
        </div>
    )
}
