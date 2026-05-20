import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
