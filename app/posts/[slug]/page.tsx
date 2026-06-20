import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface PageProps {
  params: { slug: string }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderMarkdown(content: string): string {
  // Split into blocks (paragraphs, headings, lists, blockquotes, code blocks, hr)
  const blocks = content.split(/\n{2,}/)

  return blocks.map(block => {
    const trimmed = block.trim()
    if (!trimmed) return ''

    // Headings
    if (trimmed.startsWith('### ')) {
      return `<h3>${escapeHtml(trimmed.slice(4))}</h3>`
    }
    if (trimmed.startsWith('## ')) {
      return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`
    }
    if (trimmed.startsWith('# ')) {
      return `<h1>${escapeHtml(trimmed.slice(2))}</h1>`
    }

    // Blockquotes
    if (trimmed.startsWith('> ')) {
      const lines = trimmed.split('\n').map(l => l.replace(/^> /, '')).join(' ')
      return `<blockquote>${inlineRender(lines)}</blockquote>`
    }

    // Horizontal rules
    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      return '<hr>'
    }

    // Unordered lists
    if (/^[-*] /.test(trimmed)) {
      const items = trimmed.split('\n')
        .filter(l => /^[-*] /.test(l))
        .map(l => `<li>${inlineRender(l.replace(/^[-*] /, ''))}</li>`)
        .join('')
      return `<ul>${items}</ul>`
    }

    // Ordered lists
    if (/^\d+\. /.test(trimmed)) {
      const items = trimmed.split('\n')
        .filter(l => /^\d+\. /.test(l))
        .map(l => `<li>${inlineRender(l.replace(/^\d+\. /, ''))}</li>`)
        .join('')
      return `<ol>${items}</ol>`
    }

    // Paragraph
    return `<p>${inlineRender(trimmed)}</p>`
  }).join('\n')
}

function inlineRender(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, ' ')
}

export default function PostPage({ params }: PageProps) {
  const postsDirectory = path.join(process.cwd(), 'posts')
  const filePath = path.join(postsDirectory, `${params.slug}.md`)

  if (!fs.existsSync(filePath)) {
    notFound()
  }

  const fileContents = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(fileContents)
  const htmlContent = renderMarkdown(content)

  return (
    <main className="container">
      <nav>
        <Link href="/" className="back">← Back to blog</Link>
      </nav>

      <article>
        <header>
          <h1>{data.title}</h1>
          <div className="meta">
            <time>{new Date(data.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</time>
            {data.tags?.length > 0 && (
              <div className="tags">
                {data.tags.map((tag: string) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </header>

        <div
          className="content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </article>

      <style>{`
        :root {
          --bg: #0a0a0f;
          --bg-card: #111118;
          --text: #e4e4e7;
          --text-muted: #71717a;
          --accent: #a855f7;
          --accent-hover: #c084fc;
          --border: #27272a;
        }

        * { box-sizing: border-box; }

        body { margin: 0; background: var(--bg); color: var(--text); }

        .container {
          max-width: 720px;
          margin: 0 auto;
          padding: 2rem 1.5rem 4rem;
        }

        nav { margin-bottom: 2rem; }

        .back {
          color: var(--text-muted);
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        .back:hover { color: var(--accent); }

        h1 {
          font-size: 2.25rem;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
        }

        .meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid var(--border);
        }

        time { color: var(--text-muted); font-size: 0.875rem; }

        .tags { display: flex; gap: 0.5rem; }
        .tag {
          background: rgba(168, 85, 247, 0.1);
          color: var(--accent);
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .content {
          font-size: 1.0625rem;
          line-height: 1.8;
          color: var(--text);
        }

        .content strong { font-weight: 600; }
        .content em { font-style: italic; }
        .content code {
          background: var(--bg-card);
          padding: 0.125rem 0.375rem;
          border-radius: 4px;
          font-size: 0.875em;
          font-family: 'SF Mono', Consolas, monospace;
        }
        .content a { color: var(--accent); text-decoration: none; }
        .content a:hover { text-decoration: underline; }

        .content h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 2.5rem 0 1rem;
          letter-spacing: -0.01em;
          border-top: 1px solid var(--border);
          padding-top: 2rem;
        }
        .content h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 2rem 0 0.75rem;
          color: var(--accent-hover);
        }

        .content p { margin: 0 0 1.25rem; }
        .content p:last-child { margin-bottom: 0; }

        .content ul, .content ol {
          margin: 0.75rem 0 1.25rem;
          padding-left: 1.5rem;
        }
        .content ul { list-style: none; }
        .content ul li::before {
          content: '→';
          color: var(--accent);
          font-weight: 700;
          display: inline-block;
          width: 1.5rem;
          margin-left: -1.5rem;
        }
        .content ol { list-style: decimal; }
        .content li {
          margin-bottom: 0.5rem;
          padding-left: 0.25rem;
          line-height: 1.7;
        }

        .content blockquote {
          border-left: 3px solid var(--accent);
          margin: 1.5rem 0;
          padding: 0.75rem 1.25rem;
          background: rgba(168, 85, 247, 0.05);
          border-radius: 0 8px 8px 0;
          font-style: italic;
          color: var(--text-muted);
        }

        .content hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 2.5rem 0;
        }

        .content br { display: block; margin-top: 0.5rem; content: ''; }
      `}</style>
    </main>
  )
}
