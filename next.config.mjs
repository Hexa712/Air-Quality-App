/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['react-globe.gl', 'three'],
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
