import Image from 'next/image';
import { parse } from 'node-html-parser';
import parseSrcset from 'parse-srcset';
import { renderToString } from 'react-dom/server';

import { api, apiHost, host } from './config'

export function getSocialImageUrl(pageId: string) {
  try {
    const url = new URL(api.getSocialImage, host)

    if (pageId) {
      url.searchParams.set('id', pageId)

      return url.toString()
    }
  } catch (err) {
    console.warn('error invalid social image url', pageId, err.message)
  }

  return null
}

export function getSocialImageUrlWithNextImage(pageId: string) {
  const url = getSocialImageUrl(pageId)

  if (url) {
    const relativeUrl = url.replace(apiHost, '')

    const image = <Image src={relativeUrl} alt='' width={1200} height={630} />
    const imageStr = renderToString(image);
    const imageElement = parse(imageStr).querySelector('img');

    const src = imageElement.getAttribute('src');
    const srcset = parseSrcset(imageElement.getAttribute('srcset')).map((src) => src.url)

    return [
      ...srcset,
      src,
    ][0]
  }

  return null
}
