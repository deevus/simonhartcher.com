import React from 'react';
import Giscus from '@giscus/react';

export function Comments() {
  return (
    <Giscus
      repo="deevus/simonhartcher.com"
      repoId="MDEwOlJlcG9zaXRvcnkzODkyNzM4ODk="
      category="Blog"
      categoryId="DIC_kwDOFzPZIc4CWURL"
      mapping="og:title"
      strict="1"
      reactionsEnabled="1"
      emitMetadata="1"
      inputPosition="top"
      theme="dark_dimmed"
      lang="en"
      loading="lazy"
    />
  )
}
