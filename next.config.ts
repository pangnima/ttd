import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /**
     * 서버 액션 본문 한계(기본 1MB). 프로필 사진은 필드가 **브라우저에서 512px로 줄여** 보내므로(F-15)
     * 정상 경로는 100KB 안팎이다. 2MB는 축소를 우회한 제출이 액션 안의 사람 말 검사
     * (`avatarFileError`, 1MB)에 닿게 두는 여유일 뿐이다. 더 올리지 않는다 — Vercel 함수의 요청 본문
     * 상한이 4.5MB라 "큰 파일을 그대로 받는" 해법은 배포에서 성립하지 않는다.
     */
    experimental: {
        serverActions: { bodySizeLimit: '2mb' },
    },
    // OG 이미지 라우트가 런타임에 읽는 정적 폰트를 배포 번들에 포함시킨다.
    outputFileTracingIncludes: {
        '/opengraph-image': ['./src/lib/og/Pretendard-SemiBold.otf'],
    },
    async redirects() {
        return [
            // 옛 라우트 — /dashboard·/clubs(Week 69에 UI 삭제, 태그 frozen-clubs-ui-2026-09-16)는 루트로.
            // 미들웨어가 로그인 상태면 프로필로 보낸다. /clubs는 해동 가능성이 있어 permanent가 아니다.
            { source: '/dashboard', destination: '/', permanent: true },
            { source: '/clubs/:path*', destination: '/', permanent: false },
        ]
    },
    /**
     * ⚠ 여기 등록하는 것은 **우리가 URL을 쥔 이미지**뿐이다(Supabase 스토리지 두 버킷).
     *
     * **사용자 아바타는 `next/image`로 그리지 않는다.** 소셜 가입자의 `users.profile_image`에는
     * provider가 준 외부 URL이 들어온다(구글: `https://lh3.googleusercontent.com/a/…=s96-c`).
     * 등록되지 않은 호스트를 `<Image src>`에 넣으면 `Invalid src prop`이 **렌더 중 throw**되어
     * 그 화면이 error 경계로 통째로 대체된다 — Week 56에 `/profile/settings`가 그렇게 죽었다.
     *
     * 호스트를 하나씩 더해 막는 것은 틀린 수다: 구글만 해도 lh3~lh6이고 카카오를 켜면
     * k.kakaocdn.net이 따라오며 provider는 언제든 호스트를 바꾼다. **열린 집합에 허용목록을 쓰면
     * 안 된다.** 대신 아바타는 shadcn `Avatar`/`AvatarImage`(네이티브 <img>)로 그린다 —
     * 헤더·프로필 상세·룸 명단·클럽 랭킹이 이미 전부 그렇다.
     *
     * 최적화가 정말 필요해지면 호스트를 늘리지 말고 가입 시 provider 사진을 우리 `avatars`
     * 버킷으로 복사해 URL을 우리 것으로 닫는다(백로그).
     *
     * 호스트가 `*.supabase.co`인 이유(Week 68): dev·prod 프로젝트가 둘이라 ref를 박으면 환경마다
     * 설정이 갈린다. 위 원칙("열린 집합에 허용목록 금지")과 어긋나지 않는다 — 경로가 **우리 버킷 두 개**로
     * 닫혀 있고, 호스트는 우리 프로젝트 둘 중 하나다(사용자 데이터가 고르는 값이 아니다).
     */
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.supabase.co',
                pathname: '/storage/v1/object/public/avatars/**',
            },
            {
                protocol: 'https',
                hostname: '*.supabase.co',
                pathname: '/storage/v1/object/public/club-logos/**',
            },
        ],
    },
};

export default nextConfig;
