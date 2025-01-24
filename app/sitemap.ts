import { MetadataRoute } from 'next'

import { host } from '@/lib/config'
import { getSiteMap } from '@/lib/get-site-map'

export default async function generateSitemap(): Promise<MetadataRoute.Sitemap> {
  const siteMap = await getSiteMap()

  return [
    {
      url: host
    },
    ...Object.keys(siteMap.canonicalPageMap).map((path) => ({
      url: `${host}/${path}`
    }))
  ]
}
