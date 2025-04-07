import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      'd39st1yc0t52gi.cloudfront.net'
    ]
  }, 
  serverExternalPackages : ['pdf2json'],
};

export default nextConfig;
