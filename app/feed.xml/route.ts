import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const SITE_URL = 'https://bloghermes.vercel.app'
const SITE_TITLE = 'Zynna Blog'
const SITE_DESC = 'Insights and ideas from conversations'

export async function GET() {
  const postsDirectory = path.join(process.cwd(), 'posts')
  const files = fs.readdirSync(postsDirectory).filter((f: string) => f.endsWith('.md'))

  const posts = files.map((fileName: string) => {
    const slug = fileName.replace(/\.md$/, '')
    const filePath = path.join(postsDirectory, fileName)
    const fileContents = fs.readFileSync(filePath, 'utf8')
    const { data, content } = matter(fileContents)
    // Strip markdown syntax for plain text excerpt
    const plainText = content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/:::[\s\S]*?:::/g, '')
      .replace(/#{1,6} /g, '')
      .replace(/\*\*|__/g, '')
      .replace(/\*|_/g, '')
      .replace(/`/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/>/g, '')
      .replace(/---+\n/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, 500)
    return {
      slug,
      title: data.title || slug,
      date: data.date || new Date().toISOString(),
      excerpt: data.excerpt || plainText,
      tags: data.tags || [],
    }
  }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const feedDate = new Date().toUTCString()

  const items = posts.map(p => {
    const postUrl = `${SITE_URL}/posts/${p.slug}`
    const pubDate = new Date(p.date).toUTCString()
    const categories = p.tags.map((t: string) => `<category>${t}</category>`).join('\n        ')
    return `
    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${p.excerpt}]]></description>
        ${categories}
    </item>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${SITE_TITLE}</title>
    <link>${SITE_URL}</link>
    <description>${SITE_DESC}</description>
    <language>en-us</language>
    <lastBuildDate>${feedDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
