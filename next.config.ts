import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Extract hostname from the Supabase URL, e.g., https://PROJECT.supabase.co -> PROJECT.supabase.co
const supabaseHostname = (() => {
  try {
    return supabaseUrl ? new URL(supabaseUrl).hostname : undefined;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Allow Supabase storage public URLs
      ...(supabaseHostname
        ? [
            {
              protocol: "https",
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            } as const,
          ]
        : []),
    ],
  },
};

export default nextConfig;
