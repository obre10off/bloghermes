import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const SITE_URL = 'https://bloghermes.vercel.app'

export async function GET() {
  const postsDirectory = path.join(process.cwd(), 'posts')
  const files = fs.readdirSync(postsDirectory).filter(f => f.endsWith('.md'))

  const posts = files.map(fileName => {
    const slug = fileName.replace(/\.md$/, '')
    const filePath = path.join(postsDirectory, fileName)
    const fileContents = fs.readFileSync(filePath, 'utf8')
    const { data } = matter(fileContents)
    return {
      slug,
      title: data.title || slug,
      date: data.date || new Date().toISOString(),
      excerpt: data.excerpt || '',
      tags: data.tags || [],
    }
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const urls = [
    { loc: SITE_URL, priority: '1.0', changefreq: 'daily' },
    ...posts.map(p => ({
      loc: `${SITE_URL}/posts/${p.slug}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: new Date(p.date).toISOString().split('T')[0],
    })),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>${'lastmod' in u && u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
