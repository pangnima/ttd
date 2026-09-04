'use client'

import { useState } from 'react'
import type { PersonalMatchSetScore } from '@/types'
import type { PlayerPickerValue } from '@/components/personal-matches/player-picker'
import {
    buildRotationGamePayloads,
    isPoolRowEmpty,
    validateRotationGames,
    validateRotationPool,
    type PoolPlayer,
    type RotationGame,
    type RotationGamePayload,
    type RotationSessionMeta,
} from '@/lib/personal-matches/rotation'

function uid(): string {
    return crypto.randomUUID()
}

const EMPTY_PLAYER: PlayerPickerValue = { name: '', hand: '' }

function emptyPoolPlayer(): PoolPlayer {
    return { tempId: uid(), player: { ...EMPTY_PLAYER }, ntrp: '' }
}

/**
 * 로테이션 복식 입력 상태(선수 풀 + 게임 배열)와 핸들러를 관리하는 훅.
 * 등록 폼은 풀만 쓰고(세션 저장), 결과 입력 Dialog는 세션의 풀을 initialPool로 받아 게임을 구성한다.
 * 순수 매핑/검증은 lib/personal-matches/rotation.ts에 위임한다.
 */
export function useRotationGames(initialPool?: PoolPlayer[]) {
    // 로테이션은 최소 3명이 필요하므로 기본 3칸을 비워둔 채 시작한다.
    const [pool, setPool] = useState<PoolPlayer[]>(
        () => initialPool ?? [emptyPoolPlayer(), emptyPoolPlayer(), emptyPoolPlayer()],
    )
    const [games, setGames] = useState<RotationGame[]>([])

    // ── 풀 핸들러 ──
    function addPoolPlayer() {
        setPool((prev) => [...prev, emptyPoolPlayer()])
    }
    function updatePoolPlayer(tempId: string, patch: Partial<Omit<PoolPlayer, 'tempId'>>) {
        setPool((prev) => prev.map((p) => (p.tempId === tempId ? { ...p, ...patch } : p)))
    }
    // 모집형(리스트에 노출)으로 전환할 때 입력되지 않은 행을 전부 제거 — 남은 행은 NTRP까지 필수
    function compactEmptyRows() {
        setPool((prev) => prev.filter((p) => !isPoolRowEmpty(p)))
    }
    // 노출을 끄면 최소 인원(3명) 입력칸을 다시 채워 둔다
    function ensureMinRows(min: number) {
        setPool((prev) => (prev.length >= min ? prev : [...prev, ...Array.from({ length: min - prev.length }, emptyPoolPlayer)]))
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
            // 빈 게임(구성 미선택) + 스코어 1줄. 게임 1건 = 세트 1개 고정
            { tempId: uid(), partnerRef: null, opp1Ref: null, opp2Ref: null, sets: [{ me: NaN, opp: NaN }] },
        ])
    }
    function updateGame(tempId: string, patch: Partial<Omit<RotationGame, 'tempId'>>) {
        setGames((prev) => prev.map((g) => (g.tempId === tempId ? { ...g, ...patch } : g)))
    }
    function removeGame(tempId: string) {
        setGames((prev) => prev.filter((g) => g.tempId !== tempId))
    }

    // ── 게임별 스코어 핸들러 — 게임 1건 = 스코어(세트) 1줄 고정이라 추가/삭제는 없다 ──
    function updateGameSets(tempId: string, updater: (sets: PersonalMatchSetScore[]) => PersonalMatchSetScore[]) {
        setGames((prev) => prev.map((g) => (g.tempId === tempId ? { ...g, sets: updater(g.sets) } : g)))
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
    // 게임별 애드/듀스 (복식). undefined = 미지정(둘 다 듀스).
    function setMyAd(gameId: string, i: number, v: 'me' | 'partner' | undefined) {
        updateGameSets(gameId, (sets) => sets.map((s, idx) => (idx === i ? { ...s, myAd: v } : s)))
    }
    function setOppAd(gameId: string, i: number, v: 'opponent' | 'opponent2' | undefined) {
        updateGameSets(gameId, (sets) => sets.map((s, idx) => (idx === i ? { ...s, oppAd: v } : s)))
    }

    // allowEmpty(모집형) — 빈 행을 무시하고 최소 인원을 요구하지 않는다
    function isPoolValid(meta: RotationSessionMeta, options?: { allowEmpty?: boolean }): boolean {
        return validateRotationPool(pool, meta, options)
    }
    const isGamesValid = validateRotationGames(pool, games)
    function buildPayloads(): RotationGamePayload[] {
        return buildRotationGamePayloads(games, pool)
    }

    return {
        pool, games,
        addPoolPlayer, updatePoolPlayer, removePoolPlayer, compactEmptyRows, ensureMinRows,
        addGame, updateGame, removeGame,
        updateSet, setMyAd, setOppAd,
        isPoolValid, isGamesValid, buildPayloads,
    }
}
