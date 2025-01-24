import type { MetadataRoute } from 'next'

export default function generateRobots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/'
      }
    ]
  }
}
