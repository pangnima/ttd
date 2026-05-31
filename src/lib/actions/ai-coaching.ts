'use server'

import Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { fetchPlayerStatsBundle } from '@/lib/queries/player-profile'
import { fetchPersonalMatchesByUser } from '@/lib/queries/personal-matches'
import { aggregateBySurface } from '@/lib/analytics/surface'
import { aggregateByMatchType } from '@/lib/analytics/match-type'
import { aggregateByNtrpDiff } from '@/lib/analytics/ntrp'
import { aggregateComebackRate, aggregateRecentForm } from '@/lib/analytics/form'

export type AICoachingResult = {
    strengths: string[]
    weaknesses: string[]
    tips: string[]
}

export type AICoachingAction = {
    result: AICoachingResult | null
    error: string | null
    cached: boolean
    generatedAt: string | null
}

type CoachingBundle = Awaited<ReturnType<typeof fetchPlayerStatsBundle>> & {
    personalMatches: Awaited<ReturnType<typeof fetchPersonalMatchesByUser>>
}

function buildPayload(bundle: CoachingBundle, userId: string, userNtrp: number | null): string {
    const surface = aggregateBySurface(bundle, userId)
    const matchType = aggregateByMatchType(bundle, userId)
    const ntrp = aggregateByNtrpDiff(bundle, userId, userNtrp)
    const comeback = aggregateComebackRate(bundle, userId)
    const recentForm = aggregateRecentForm(bundle, userId, 10)
    const { singles, menDoubles, womenDoubles, mixedDoubles } = bundle.stats

    const totalWins = singles.wins + menDoubles.wins + womenDoubles.wins + mixedDoubles.wins
    const totalLosses = singles.losses + menDoubles.losses + womenDoubles.losses + mixedDoubles.losses
    const totalDraws = singles.draws + menDoubles.draws + womenDoubles.draws + mixedDoubles.draws
    const decisive = totalWins + totalLosses
    const overallWinRate = decisive === 0 ? 0 : Math.round((totalWins / decisive) * 100)

    return JSON.stringify({
        overall: {
            wins: totalWins + bundle.personalMatches.filter((m) => m.winner === 'me').length,
            losses: totalLosses + bundle.personalMatches.filter((m) => m.winner === 'opponent').length,
            draws: totalDraws + bundle.personalMatches.filter((m) => m.winner === 'draw').length,
            winRate: overallWinRate,
        },
        byMatchType: {
            singles: matchType.singles,
            men_doubles: matchType.men_doubles,
            women_doubles: matchType.women_doubles,
            mixed_doubles: matchType.mixed_doubles,
        },
        bySurface: {
            hard: surface.hard,
            clay: surface.clay,
            grass: surface.grass,
            other: surface.other,
        },
        byNtrpDiff: { stronger: ntrp.stronger, peer: ntrp.peer, weaker: ntrp.weaker },
        comeback,
        recentForm: {
            last10: recentForm.last10.join(''),
            wins: recentForm.recentWins,
            losses: recentForm.recentLosses,
        },
    })
}

export async function generateAICoachingAction(): Promise<AICoachingAction> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { result: null, error: '로그인이 필요합니다.', cached: false, generatedAt: null }

    // 사용자 NTRP 조회
    const { data: userRow } = await supabase
        .from('users')
        .select('ntrp')
        .eq('id', user.id)
        .single()
    const userNtrp = userRow?.ntrp ?? null

    // 통계 번들 조회 (코칭은 클럽 전체 + 개인 통합)
    const [playerBundle, personalMatches] = await Promise.all([
        fetchPlayerStatsBundle(user.id, undefined),
        fetchPersonalMatchesByUser(user.id),
    ])
    const bundle: CoachingBundle = { ...playerBundle, personalMatches }
    const { singles, menDoubles, womenDoubles, mixedDoubles } = bundle.stats
    const clubTotalMatches = singles.totalMatches + menDoubles.totalMatches + womenDoubles.totalMatches + mixedDoubles.totalMatches
    const totalMatches = clubTotalMatches + bundle.personalMatches.length

    if (totalMatches < 3) {
        return { result: null, error: '분석에 필요한 경기 데이터가 부족합니다 (최소 3경기).', cached: false, generatedAt: null }
    }

    const payload = buildPayload(bundle, user.id, userNtrp)
    const bundleHash = createHash('sha1').update(payload + bundle.personalMatches.length).digest('hex')

    // 캐시 확인
    const { data: cache } = await supabase
        .from('ai_coaching_cache')
        .select('bundle_hash, content, generated_at')
        .eq('user_id', user.id)
        .single()

    if (cache && cache.bundle_hash === bundleHash) {
        const diffMinutes = (Date.now() - new Date(cache.generated_at).getTime()) / 60000
        if (diffMinutes < 1) {
            return {
                result: cache.content as AICoachingResult,
                error: null,
                cached: true,
                generatedAt: cache.generated_at,
            }
        }
        // 해시 동일 + 24시간 이내
        const diffHours = diffMinutes / 60
        if (diffHours < 24) {
            return {
                result: cache.content as AICoachingResult,
                error: null,
                cached: true,
                generatedAt: cache.generated_at,
            }
        }
    }

    // Claude API 호출
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return { result: null, error: 'AI 서비스가 설정되지 않았습니다.', cached: false, generatedAt: null }

    const client = new Anthropic({ apiKey })

    try {
        const message = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 512,
            system: `당신은 전문 테니스 코치입니다. 선수의 통계 데이터를 분석해서 한국어로 JSON 형식만 반환하세요.
JSON 구조: {"strengths": ["...", "..."], "weaknesses": ["...", "..."], "tips": ["...", "..."]}
각 항목 2개씩, 각 문장 80자 이내. 통계에서 근거를 찾아 구체적으로 작성하세요. JSON 외 다른 텍스트 금지.`,
            messages: [
                {
                    role: 'user',
                    content: `다음 테니스 통계를 분석해주세요:\n${payload}`,
                },
            ],
        })

        const raw = message.content[0].type === 'text' ? message.content[0].text : ''
        let result: AICoachingResult

        try {
            const jsonMatch = raw.match(/\{[\s\S]*\}/)
            result = jsonMatch ? JSON.parse(jsonMatch[0]) : { strengths: [], weaknesses: [], tips: [raw] }
        } catch {
            result = { strengths: [], weaknesses: [], tips: ['분석 결과를 파싱하는 중 오류가 발생했습니다.'] }
        }

        const now = new Date().toISOString()
        await supabase.from('ai_coaching_cache').upsert({
            user_id: user.id,
            bundle_hash: bundleHash,
            content: result,
            model: 'claude-sonnet-4-6',
            generated_at: now,
        })

        return { result, error: null, cached: false, generatedAt: now }
    } catch {
        return { result: null, error: 'AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', cached: false, generatedAt: null }
    }
}

export async function fetchCachedAICoaching(userId: string): Promise<{
    result: AICoachingResult | null
    generatedAt: string | null
}> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('ai_coaching_cache')
        .select('content, generated_at')
        .eq('user_id', userId)
        .single()

    if (!data) return { result: null, generatedAt: null }
    return { result: data.content as AICoachingResult, generatedAt: data.generated_at }
}
