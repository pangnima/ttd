import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // OG 이미지 라우트가 런타임에 읽는 정적 폰트를 배포 번들에 포함시킨다.
    outputFileTracingIncludes: {
        '/opengraph-image': ['./src/lib/og/Pretendard-SemiBold.otf'],
        '/clubs/join/[token]/opengraph-image': ['./src/lib/og/Pretendard-SemiBold.otf'],
    },
    async redirects() {
        return [
            // 죽은 라우트 처리: /dashboard는 /clubs로 리다이렉트
            { source: '/dashboard', destination: '/clubs', permanent: true },
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
     */
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'xiwwbgltkbvxdzxxxoba.supabase.co',
                pathname: '/storage/v1/object/public/avatars/**',
            },
            {
                protocol: 'https',
                hostname: 'xiwwbgltkbvxdzxxxoba.supabase.co',
                pathname: '/storage/v1/object/public/club-logos/**',
            },
        ],
    },
};

export default nextConfig;
