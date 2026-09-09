'use client'

import { useState } from 'react'
import { MATCH_FORM_INPUT, MATCH_FORM_LABEL } from '@/lib/dashboard/tokens'
import { ROOM_PASSWORD_MAX, ROOM_PASSWORD_MIN, validateRoomPassword } from '@/lib/match-rooms/password'

type Props = {
    password: string
    onPasswordChange: (v: string) => void
}

/**
 * 입장 비밀번호 — 매칭은 언제나 매칭 리스트에 노출되므로 항상 필수다.
 * 지목해 초대한 사람은 이 비밀번호를 몰라도 수락만으로 들어온다(respond_room_invite에는 비밀번호 검증이 없다).
 */
export function RoomPasswordSection({ password, onPasswordChange }: Props) {
    const [show, setShow] = useState(false)
    const error = password ? validateRoomPassword(password) : null

    return (
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
            <p className="mt-2 text-caption text-muted-foreground break-keep">
                매칭 리스트에서 이 경기를 발견한 회원은 비밀번호를 입력해 참가합니다.
                아래에서 지목한 상대는 비밀번호 없이 초대 수락만으로 들어옵니다.
            </p>
            {error && <p className="mt-1 text-caption text-destructive">{error}</p>}
        </div>
    )
}
