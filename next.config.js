/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    allowedDevOrigins: ['http://localhost:3001', 'http://127.0.0.1:3001'],
    // Expose au bundle client les variables nommées NEXT_CONFIG_* (définies
    // ainsi dans Vercel, où le préfixe NEXT_PUBLIC_ est refusé), en plus des
    // NEXT_PUBLIC_* classiques.
    env: {
        NEXT_PUBLIC_USE_DIGICARTE: process.env.NEXT_PUBLIC_USE_DIGICARTE || process.env.NEXT_CONFIG_USE_DIGICARTE,
        NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL || process.env.NEXT_CONFIG_WEB_URL,
    },
};

module.exports = nextConfig;
