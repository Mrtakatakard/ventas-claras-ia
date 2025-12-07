import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const getFirebaseAppHostingEnv = () => {
  try {
    const configStr = process.env.FIREBASE_WEBAPP_CONFIG;
    if (configStr) {
      const config = JSON.parse(configStr);
      return {
        NEXT_PUBLIC_FIREBASE_API_KEY: config.apiKey,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: config.authDomain,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: config.projectId,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: config.storageBucket,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: config.messagingSenderId,
        NEXT_PUBLIC_FIREBASE_APP_ID: config.appId,
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: config.measurementId,
      };
    }
  } catch (e) {
    // console.warn("Failed to parse FIREBASE_WEBAPP_CONFIG", e);
  }
  return {};
};

const nextConfig: NextConfig = {
  env: {
    ...getFirebaseAppHostingEnv(),
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "ventas-claras",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});