import withPWA from "next-pwa";

const pwa = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // reactStrictMode: true,
  // Add any other Next.js configuration options here
};

export default pwa(nextConfig);
