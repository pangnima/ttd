import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
