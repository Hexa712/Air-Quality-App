/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['react-globe.gl', 'three'],
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
