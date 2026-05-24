/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@diaconia/shared"],
};

export default nextConfig;
