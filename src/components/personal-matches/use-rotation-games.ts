'use client'

import { useState } from 'react'
import type { PersonalMatchSetScore } from '@/types'
import type { PlayerPickerValue } from '@/components/personal-matches/player-picker'
import type { PersonalMatchInput } from '@/lib/actions/personal-matches'
import {
    buildRotationInputs,
    validateRotation,
    type PoolPlayer,
    type RotationGame,
    type RotationSessionMeta,
} from '@/lib/personal-matches/rotation'

function uid(): string {
    return crypto.randomUUID()
}

const EMPTY_PLAYER: PlayerPickerValue = { name: '', hand: '' }

/**
 * 로테이션 복식 입력 상태(선수 풀 + 게임 배열)와 핸들러를 관리하는 훅.
 * 순수 매핑/검증은 lib/personal-matches/rotation.ts에 위임한다.
 */
export function useRotationGames() {
    const [pool, setPool] = useState<PoolPlayer[]>([])
    const [games, setGames] = useState<RotationGame[]>([])

    // ── 풀 핸들러 ──
    function addPoolPlayer() {
        setPool((prev) => [...prev, { tempId: uid(), player: { ...EMPTY_PLAYER }, ntrp: '' }])
    }
    function updatePoolPlayer(tempId: string, patch: Partial<Omit<PoolPlayer, 'tempId'>>) {
        setPool((prev) => prev.map((p) => (p.tempId === tempId ? { ...p, ...patch } : p)))
    }
    function removePoolPlayer(tempId: string) {
        setPool((prev) => prev.filter((p) => p.tempId !== tempId))
        // 삭제된 선수를 참조하던 게임의 ref를 초기화해 무결성 유지
        setGames((prev) =>
            prev.map((g) => ({
                ...g,
                partnerRef: g.partnerRef === tempId ? null : g.partnerRef,
                opp1Ref: g.opp1Ref === tempId ? null : g.opp1Ref,
                opp2Ref: g.opp2Ref === tempId ? null : g.opp2Ref,
            })),
        )
    }

    // ── 게임 핸들러 ──
    function addGame() {
        setGames((prev) => [
            ...prev,
            { tempId: uid(), partnerRef: null, opp1Ref: null, opp2Ref: null, sets: [{ me: 0, opp: 0 }] },
        ])
    }
    function updateGame(tempId: string, patch: Partial<Omit<RotationGame, 'tempId'>>) {
        setGames((prev) => prev.map((g) => (g.tempId === tempId ? { ...g, ...patch } : g)))
    }
    function removeGame(tempId: string) {
        setGames((prev) => prev.filter((g) => g.tempId !== tempId))
    }

    // ── 게임별 세트 핸들러 ──
    function updateGameSets(tempId: string, updater: (sets: PersonalMatchSetScore[]) => PersonalMatchSetScore[]) {
        setGames((prev) => prev.map((g) => (g.tempId === tempId ? { ...g, sets: updater(g.sets) } : g)))
    }
    function addSet(gameId: string) {
        updateGameSets(gameId, (sets) => [...sets, { me: 0, opp: 0 }])
    }
    function removeSet(gameId: string, i: number) {
        updateGameSets(gameId, (sets) => sets.filter((_, idx) => idx !== i))
    }
    function updateSet(gameId: string, i: number, field: 'me' | 'opp', val: string) {
        updateGameSets(gameId, (sets) =>
            sets.map((s, idx) => {
                if (idx !== i) return s
                // 빈 값은 NaN으로 보관(입력란 비움), 제출 시 0으로 정리
                if (val === '') return { ...s, [field]: NaN }
                const num = parseInt(val, 10)
                if (isNaN(num) || num < 0 || num > 99) return s
                return { ...s, [field]: num }
            }),
        )
    }
    // 세트별 애드/듀스 (복식). undefined = 미지정(둘 다 듀스).
    function setMyAd(gameId: string, i: number, v: 'me' | 'partner' | undefined) {
        updateGameSets(gameId, (sets) => sets.map((s, idx) => (idx === i ? { ...s, myAd: v } : s)))
    }
    function setOppAd(gameId: string, i: number, v: 'opponent' | 'opponent2' | undefined) {
        updateGameSets(gameId, (sets) => sets.map((s, idx) => (idx === i ? { ...s, oppAd: v } : s)))
    }

    function isValid(meta: RotationSessionMeta): boolean {
        return validateRotation(pool, games, meta)
    }
    function buildInputs(meta: RotationSessionMeta): PersonalMatchInput[] {
        return buildRotationInputs(meta, games, pool)
    }

    return {
        pool, games,
        addPoolPlayer, updatePoolPlayer, removePoolPlayer,
        addGame, updateGame, removeGame,
        addSet, removeSet, updateSet, setMyAd, setOppAd,
        isValid, buildInputs,
    }
}
