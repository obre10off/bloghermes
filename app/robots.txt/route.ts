export async function GET() {
  const body = `User-agent: *
Allow: /

Sitemap: https://bloghermes.vercel.app/sitemap.xml
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
