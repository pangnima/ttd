import { describe, expect, it } from 'vitest'
import { validateCourtName, validatePersonalMatchInput, type PersonalMatchInput } from './validate-input'

const singles: PersonalMatchInput = {
    opponentName: '상대',
    opponentNtrp: 3.0,
    playedAt: '2026-06-15',
    playedTime: '18:00',
    matchType: 'singles',
    surface: 'hard',
    setScores: [],
}

const doubles: PersonalMatchInput = {
    ...singles,
    matchType: 'men_doubles',
    partnerName: '파트너',
    partnerNtrp: 3.0,
    opponent2Name: '상대2',
    opponent2Ntrp: 3.5,
}

describe('validatePersonalMatchInput — 파트너 NTRP', () => {
    it('복식 정상 입력은 통과', () => {
        expect(validatePersonalMatchInput(doubles)).toBeNull()
    })

    it('파트너 NTRP 미입력이면 거부 (상대와 동일 규칙)', () => {
        expect(validatePersonalMatchInput({ ...doubles, partnerNtrp: undefined })).toBe('파트너 NTRP를 입력해주세요.')
    })

    it('파트너 NTRP 범위 밖이면 거부', () => {
        expect(validatePersonalMatchInput({ ...doubles, partnerNtrp: 8 })).toBe('파트너 NTRP는 1.0~7.0 범위로 입력해주세요.')
    })

    it('skipNtrpFor에 partner가 있으면 미입력이어도 통과 (회원 파트너는 수락 시 서버 파생)', () => {
        expect(validatePersonalMatchInput({ ...doubles, partnerNtrp: undefined }, { skipNtrpFor: ['partner'] })).toBeNull()
    })

    it('단식은 파트너 NTRP를 보지 않는다', () => {
        expect(validatePersonalMatchInput(singles)).toBeNull()
    })
})

describe('validatePersonalMatchInput — 코트명', () => {
    it('코트명은 선택 — 없거나 공백이어도 통과', () => {
        expect(validatePersonalMatchInput({ ...singles, courtName: undefined })).toBeNull()
        expect(validatePersonalMatchInput({ ...singles, courtName: '   ' })).toBeNull()
        expect(validatePersonalMatchInput({ ...singles, courtName: '올림픽공원 3번' })).toBeNull()
    })

    it('40자 초과면 거부', () => {
        expect(validatePersonalMatchInput({ ...singles, courtName: 'a'.repeat(41) })).toBe('코트명은 40자 이내로 입력해주세요.')
    })
})

describe('validateCourtName', () => {
    it('trim 후 40자까지 허용', () => {
        expect(validateCourtName(undefined)).toBeNull()
        expect(validateCourtName('a'.repeat(40))).toBeNull()
        expect(validateCourtName(`  ${'a'.repeat(40)}  `)).toBeNull()
        expect(validateCourtName('a'.repeat(41))).not.toBeNull()
    })
})

describe('validatePersonalMatchInput — 모집형(allowMissingPlayers)', () => {
    const opts = { allowMissingPlayers: true } as const
    const emptySingles: PersonalMatchInput = { ...singles, opponentName: '', opponentNtrp: undefined }

    it('참가자를 전부 비워도 통과 (세트 없음)', () => {
        expect(validatePersonalMatchInput(emptySingles, opts)).toBeNull()
        expect(validatePersonalMatchInput({
            ...doubles, opponentName: '', opponentNtrp: undefined,
            partnerName: undefined, partnerNtrp: undefined, opponent2Name: undefined, opponent2Ntrp: undefined,
        }, opts)).toBeNull()
    })

    it('세트가 있으면 옵션이 있어도 거부 — 결과가 있는 기록은 라인업이 완성돼야 한다', () => {
        expect(validatePersonalMatchInput({ ...emptySingles, setScores: [{ me: 6, opp: 3 }] }, opts))
            .toBe('상대 이름을 입력해주세요.')
    })

    it('이름을 넣은 슬롯은 NTRP가 여전히 필수', () => {
        expect(validatePersonalMatchInput({ ...emptySingles, opponentName: '상대' }, opts)).toBe('상대 NTRP를 입력해주세요.')
    })

    it('복식에서 파트너만 채워도 통과, 채운 슬롯 범위는 검사', () => {
        expect(validatePersonalMatchInput({
            ...doubles, opponentName: '', opponentNtrp: undefined, opponent2Name: undefined, opponent2Ntrp: undefined,
        }, opts)).toBeNull()
        expect(validatePersonalMatchInput({
            ...doubles, opponentName: '', opponentNtrp: undefined, opponent2Name: undefined, opponent2Ntrp: undefined,
            partnerNtrp: 9,
        }, opts)).toBe('파트너 NTRP는 1.0~7.0 범위로 입력해주세요.')
    })

    it('옵션이 없으면 기존 문구로 거부', () => {
        expect(validatePersonalMatchInput(emptySingles)).toBe('상대 이름을 입력해주세요.')
    })

    it('회원 연결만 있고 이름이 없어도 슬롯으로 인정한다', () => {
        expect(validatePersonalMatchInput({ ...emptySingles, opponentUserId: 'u1' }, opts)).toBe('상대 NTRP를 입력해주세요.')
    })
})
