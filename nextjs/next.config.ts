import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      'd39st1yc0t52gi.cloudfront.net'
    ]
  }, 
  serverExternalPackages : ['pdf2json'],
  allowedDevOrigins: ['http://213.136.68.185:3000', 'http://arora.shubhamxshah.xyz', 'https://arora.shubhamxshah.xyz']
};

export default nextConfig;
