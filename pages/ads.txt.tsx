import type { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.write(JSON.stringify({ error: 'method not allowed' }))
    res.end()

    return {
      props: {}
    }
  }

  // cache for up to one day
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable')
  res.setHeader('Content-Type', 'text/plain')

  // only allow the site to be crawlable on the production deployment
  if (process.env.NODE_ENV === 'production') {
    res.write(`google.com, pub-7902686358110976, DIRECT, f08c47fec0942fa0`)
  }

  res.end()

  return {
    props: {}
  }
}

export default () => null
