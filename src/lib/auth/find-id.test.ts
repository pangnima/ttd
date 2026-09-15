import { describe, it, expect } from 'vitest'
import { parseFindIdResult } from './find-id'

describe('parseFindIdResult', () => {
    it('아이디가 있는 회원 — 마스킹된 값을 그대로', () => {
        expect(parseFindIdResult({ kind: 'login_id', masked: 'na*****' })).toEqual({ kind: 'login_id', masked: 'na*****' })
    })

    it('아이디 없는 비밀번호 계정', () => {
        expect(parseFindIdResult({ kind: 'email_only' })).toEqual({ kind: 'email_only' })
    })

    it('소셜 전용 계정 — provider 보존', () => {
        expect(parseFindIdResult({ kind: 'social', provider: 'google' })).toEqual({ kind: 'social', provider: 'google' })
    })

    it.each<{ input: unknown; why: string }>([
        { input: null, why: 'RPC가 null(불일치·탈퇴)' },
        { input: undefined, why: 'undefined' },
        { input: 'na*****', why: '문자열' },
        { input: {}, why: 'kind 없음' },
        { input: { kind: 'login_id' }, why: 'masked 없음' },
        { input: { kind: 'login_id', masked: '' }, why: 'masked 빈 문자열' },
        { input: { kind: 'unknown' }, why: '모르는 kind' },
    ])('$why → none', ({ input }) => {
        expect(parseFindIdResult(input)).toEqual({ kind: 'none' })
    })

    it('provider가 문자열이 아니면 빈 문자열로', () => {
        expect(parseFindIdResult({ kind: 'social', provider: 7 })).toEqual({ kind: 'social', provider: '' })
    })
})
