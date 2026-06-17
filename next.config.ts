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
