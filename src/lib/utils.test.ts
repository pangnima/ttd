import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn — 시맨틱 타이포 토큰과 tailwind-merge', () => {
    it('font-size 토큰이 색상 유틸과 충돌해 삭제되지 않는다', () => {
        expect(cn('text-h1', 'text-foreground')).toBe('text-h1 text-foreground')
        expect(cn('text-foreground', 'text-body2')).toBe('text-foreground text-body2')
    })

    it('나중 font-size 토큰이 앞의 토큰을 덮는다', () => {
        expect(cn('text-body', 'text-caption')).toBe('text-caption')
        expect(cn('text-2xl', 'text-h1')).toBe('text-h1')
    })

    it('tracking-eyebrow가 다른 tracking 유틸과 병합된다', () => {
        expect(cn('tracking-tight', 'tracking-eyebrow')).toBe('tracking-eyebrow')
    })
})
