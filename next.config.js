// eslint-disable-next-line @typescript-eslint/no-var-requires
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
})

module.exports = withBundleAnalyzer({
  output: 'export',
  staticPageGenerationTimeout: 300,
  images: {
    domains: [
      'www.notion.so',
      'notion.so',
      'images.unsplash.com',
      'pbs.twimg.com',
      'abs.twimg.com',
      's3.us-west-2.amazonaws.com',
      'transitivebullsh.it'
    ],
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: true
  },
  typescript: {
    ignoreBuildErrors: true
  }
  // async redirects() {
  //   return [
  //     {
  //       source: '/bio',
  //       destination: '/about',
  //       permanent: false,
  //     },
  //     {
  //       source: '/modern-approach-to-legacy-web-applications-1-add-js-bundling-to-an-existing-mvc-project',
  //       destination: '/how-to-add-java-script-bundling-to-an-existing-mvc-project',
  //       permanent: true,
  //     }
  //   ]
  // },
})
