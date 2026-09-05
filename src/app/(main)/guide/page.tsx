import Link from 'next/link'
import { ArrowRight, BarChart3, CalendarDays, ClipboardList, Inbox, Users, type LucideIcon } from 'lucide-react'

import { PageContainer } from '@/components/common/page-container'
import { PageHeader } from '@/components/common/page-header'
import { CARD_BASE, TYPO } from '@/lib/dashboard/tokens'
import { cn } from '@/lib/utils'

export const metadata = { title: '사용 가이드' }

type GuideSection = {
    icon: LucideIcon
    title: string
    lead: string
    steps: string[]
    href: string
    cta: string
}

// 사이드바와 같은 생애 순서: 경기를 잡고(매칭 리스트) → 결과를 맞추고(확인 요청) → 전적을 본다
const SECTIONS: GuideSection[] = [
    {
        icon: CalendarDays,
        title: '1. 매칭 리스트에서 함께 칠 사람 찾기',
        lead: '경기를 리스트에 올리면 비밀번호를 아는 회원 누구나 들어와 함께 칠 수 있습니다.',
        steps: [
            '「+ 경기 추가」에서 일시·코트를 넣고 「매칭 리스트에 노출」을 켠 뒤 입장 비밀번호를 정합니다.',
            '참가자는 매칭 리스트에서 방을 열고 비밀번호를 넣으면 바로 참가자가 됩니다. 정원 제한은 없습니다.',
            '방 안에서 「+ 게임 추가」로 그날 친 게임을 하나씩 올립니다. 회원·비회원 모두 상대로 넣을 수 있어요.',
        ],
        href: '/match-rooms',
        cta: '매칭 리스트 보기',
    },
    {
        icon: Inbox,
        title: '2. 경기 결과 확인받기',
        lead: '상대가 회원이면 결과는 양쪽이 동의해야 확정됩니다. 그 전까지는 확인 요청에서 기다립니다.',
        steps: [
            '「경기 확인 요청」의 «내 차례»에 지금 내가 처리할 일만 모입니다. 사이드바 숫자와 같은 집합이에요.',
            '한쪽이 게임 스코어를 제안하면 상대가 확인하거나 이의를 제기합니다. 이의가 나오면 다시 입력하면 됩니다.',
            '확정되는 순간 그 경기는 「개인 경기 결과」로 옮겨가고 통계에 반영됩니다. 잘못 확정했다면 «결과 정정»으로 되돌릴 수 있어요.',
        ],
        href: '/me/match-requests',
        cta: '확인 요청 열기',
    },
    {
        icon: ClipboardList,
        title: '3. 개인 경기 기록하기',
        lead: '클럽 밖에서 친 경기도 직접 기록할 수 있어요. 가장 먼저 해볼 일입니다.',
        steps: [
            '왼쪽 메뉴 「개인 경기 결과」를 엽니다.',
            '「+ 경기 추가」에서 상대와 일시·코트를 입력해 저장합니다. 게임 스코어는 나중에 넣습니다.',
            '기록이 쌓이면 승률과 나만의 NTRP 레이팅이 자동으로 계산됩니다.',
        ],
        href: '/me/personal-matches/new',
        cta: '경기 기록하러 가기',
    },
    {
        icon: BarChart3,
        title: '4. 개인 통계 보기',
        lead: '기록한 경기는 다양한 관점의 통계로 정리됩니다.',
        steps: [
            '왼쪽 메뉴 「개인」에서 확정된 경기로 만든 통계를 봅니다. (클럽·통합 탭은 준비 중)',
            '승률, 라이벌·파트너, 코트 표면·손잡이별 강약점을 확인할 수 있어요.',
            'AI 코칭으로 내 경기 데이터에 대한 분석과 조언도 받아보세요.',
        ],
        href: '/me/analytics',
        cta: '개인 통계 보기',
    },
    {
        icon: Users,
        title: '5. 클럽 참여하기',
        lead: '클럽에 가입하면 함께하는 즐거움이 더해집니다.',
        steps: [
            '「클럽 찾기」에서 공개 클럽을 둘러보고 가입을 신청합니다.',
            '클럽 대진표·회원 랭킹·클럽 레이팅을 함께 즐길 수 있어요.',
            '직접 클럽을 만들어 회원 관리·승인·공지까지 운영할 수도 있습니다.',
        ],
        href: '/clubs',
        cta: '클럽 둘러보기',
    },
]

function GuideCard({ section }: { section: GuideSection }) {
    const { icon: Icon } = section
    return (
        <section className={cn(CARD_BASE, 'p-6')}>
            <div className="mb-4 flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-foreground">
                    <Icon className="size-5" />
                </span>
                <h2 className={TYPO.h3}>{section.title}</h2>
            </div>
            <p className="text-body text-muted-foreground">{section.lead}</p>
            <ol className="mt-4 space-y-2">
                {section.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-body text-foreground">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-caption font-medium text-muted-foreground tabular-nums">
                            {i + 1}
                        </span>
                        <span className="break-keep">{step}</span>
                    </li>
                ))}
            </ol>
            <Link
                href={section.href}
                className="mt-5 inline-flex w-fit items-center gap-1 text-body2 font-medium text-primary hover:underline"
            >
                {section.cta}
                <ArrowRight className="size-4" />
            </Link>
        </section>
    )
}

export default function GuidePage() {
    return (
        <PageContainer>
            <PageHeader title="사용 가이드" description="BASELINE을 처음 시작하시나요? 아래 순서대로 따라 해보세요." />

            <div className="grid gap-5 lg:grid-cols-3">
                {SECTIONS.map((section) => (
                    <GuideCard key={section.title} section={section} />
                ))}
            </div>
        </PageContainer>
    )
}
