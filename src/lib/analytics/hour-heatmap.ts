import {
    type BundleWithMatches, type BundleWithGameMeta, type BundleWithPersonal,
} from '@/lib/analytics/shared'
import { isValidDate, isoWeekday, diffDays } from '@/lib/analytics/date-utils'

// ── 요일×시간 경기활동 히트맵 ────────────────────────────────────────────
// 클럽 경기 시간(timeSlot start)·개인 경기 시각(playedTime)으로 요일×시간 빈도 집계.
// 시간 정보가 없는 경기는 그리드에서 제외하고 untimed로만 카운트한다.

export type HourHeatmap = {
    grid: number[][]   // [7요일(0=월..6=일)][24시(0..23)] 경기 수
    maxCount: number
    totalGames: number   // 그리드에 배치된 경기 수(시간 있는 경기)
    untimed: number      // 기간 내 시간 미입력 경기 수
    mostActive: { weekday: number; hour: number } | null
}

type HourBundle = BundleWithMatches & BundleWithGameMeta & BundleWithPersonal & {
    matchTimeById: Record<string, string | null>
}

function emptyGrid(): number[][] {
    return Array.from({ length: 7 }, () => new Array(24).fill(0))
}

// 'HH:MM' → 0~23 시. 형식 불량이면 null.
function parseHour(time: string | null | undefined): number | null {
    if (!time) return null
    const h = Number(time.slice(0, 2))
    return Number.isInteger(h) && h >= 0 && h <= 23 ? h : null
}

/**
 * today 기준 최근 sinceDays일의 경기를 요일×시간으로 집계한다.
 * today는 'YYYY-MM-DD'(서버에서 주입). 순수 함수로 테스트 가능.
 */
export function aggregateHourHeatmap(bundle: HourBundle, today: string, sinceDays: number): HourHeatmap {
    const grid = emptyGrid()
    let untimed = 0
    let totalGames = 0

    const place = (dateStr: string, time: string | null | undefined) => {
        if (!isValidDate(dateStr)) return
        const age = diffDays(today, dateStr)
        if (age < 0 || age >= sinceDays) return   // 기간 밖
        const hour = parseHour(time)
        if (hour === null) { untimed++; return }
        grid[isoWeekday(dateStr)][hour]++
        totalGames++
    }

    for (const m of bundle.matches) {
        place(bundle.gameMetaById[m.matchGameId]?.date ?? '0000-00-00', bundle.matchTimeById[m.id])
    }
    for (const pm of bundle.personalMatches) {
        place(pm.playedAt, pm.playedTime)
    }

    let maxCount = 0
    let mostActive: { weekday: number; hour: number } | null = null
    for (let w = 0; w < 7; w++) {
        for (let h = 0; h < 24; h++) {
            if (grid[w][h] > maxCount) {
                maxCount = grid[w][h]
                mostActive = { weekday: w, hour: h }
            }
        }
    }

    return { grid, maxCount, totalGames, untimed, mostActive }
}
