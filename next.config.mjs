/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    images: {
        unoptimized: true,
        domains: ['images.unsplash.com'],
    },

    i18n: {
        locales: ["en"],
        defaultLocale: "en",
    },
};


export default nextConfig;
