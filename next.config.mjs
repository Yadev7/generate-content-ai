/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    images: {
        unoptimized: true,
        domains: ['images.unsplash.com'],
    },

    // pdfjs-dist (inside pdf-parse) is an ESM bundle that breaks when webpack
    // transforms it with the eval devtool used in `next dev`, throwing
    // "Object.defineProperty called on non-object" for every PDF. Keeping the
    // parser out of the bundle lets Node load it natively instead. Next reverts
    // any webpack `devtool` override, so this is the supported fix.
    experimental: {
        serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist"],
    },

    // No `i18n` block: this app does its own localisation (see
    // src/lib/i18n/I18nProvider.tsx). Next's i18n routing is unsupported in the
    // App Router and it silently stops middleware from running, which breaks
    // clerkMiddleware() and therefore every server-side auth() call.
};

export default nextConfig;
