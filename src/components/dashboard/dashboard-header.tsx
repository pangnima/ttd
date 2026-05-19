import type { User } from '@/types'

type Props = { me: User }

export function DashboardHeader({ me }: Props) {
    // 서버 UTC 시각을 한국 시간대(Asia/Seoul, UTC+9)로 변환
    const hour = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
    ).getHours()
    const greeting =
        hour < 12 ? '좋은 아침이에요' : hour < 18 ? '안녕하세요' : '좋은 저녁이에요'

    return (
        <div className="space-y-1">
            <p className="text-[11px] font-medium tracking-widest uppercase text-foreground/65">
                대시보드
            </p>
            <h1 className="text-2xl font-bold text-foreground">
                {greeting},{' '}
                <span className="text-foreground/85">{me.nickname}</span>
            </h1>
        </div>
    )
}
