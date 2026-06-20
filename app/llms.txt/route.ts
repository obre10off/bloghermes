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
      .slice(0, 800)
    return {
      slug,
      title: data.title || slug,
      date: data.date || new Date().toISOString(),
      excerpt: data.excerpt || plainText,
      tags: data.tags || [],
    }
  }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const lines = [`# ${SITE_TITLE}`, '', SITE_DESC, '', '---', '']

  for (const post of posts) {
    const postUrl = `${SITE_URL}/posts/${post.slug}`
    const date = new Date(post.date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
    lines.push(`## ${post.title}`)
    lines.push(`Published: ${date}`)
    if (post.tags.length) lines.push(`Tags: ${post.tags.join(', ')}`)
    lines.push(`URL: ${postUrl}`)
    lines.push('')
    lines.push(post.excerpt || '')
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  const txt = lines.join('\n').trim() + '\n'

  return new Response(txt, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
