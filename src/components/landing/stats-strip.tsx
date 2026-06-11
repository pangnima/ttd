/** 랜딩 통계 띠 — 정적 마케팅 수치 (하드코딩) */
const STATS = [
    { value: '240', label: '누적 클럽' },
    { value: '1.2만+', label: '기록된 경기' },
    { value: '68%', label: '평균 승률 추적' },
    { value: '4.9', label: '앱 평점 / 5.0' },
] as const

export function StatsStrip() {
    return (
        <section className="border-y border-border bg-secondary/40">
            <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px md:grid-cols-4">
                {STATS.map((stat) => (
                    <div key={stat.label} className="px-6 py-8">
                        <p className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                            {stat.value}
                        </p>
                        <p className="mt-1 type-caption text-muted-foreground">{stat.label}</p>
                    </div>
                ))}
            </div>
        </section>
    )
}
