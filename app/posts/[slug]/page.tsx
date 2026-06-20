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

// ─── Block-level renderers ───────────────────────────────────────────────────

function renderBlock(trimmed: string): string {
  // Custom callouts: :::callout[type]{title="..."}
  const calloutMatch = trimmed.match(/^:::callout\[(\w+)\](?:\{([^}]+)\})?$([\s\S]*?)^\s*:::$/m)
  if (calloutMatch) {
    const [, type, attrs, body] = calloutMatch
    const titleMatch = attrs?.match(/title="([^"]+)"/)
    const title = titleMatch ? `<div class="callout-title">${escapeHtml(titleMatch[1])}</div>` : ''
    const bodyHtml = blockRender(body.trim())
    const icons: Record<string, string> = {
      note: '📝', insight: '💡', warning: '⚠️', keypoint: '🎯', quote: '💬', example: '📌'
    }
    return `<div class="callout callout-${type}">${icons[type] || '•'} ${title}${bodyHtml}</div>`
  }

  // ASCII/SVG diagrams: :::diagram
  const diagramMatch = trimmed.match(/^:::diagram\s*\n([\s\S]*?)^\s*:::$/m)
  if (diagramMatch) {
    const diagram = diagramMatch[1].trim()
    return `<div class="diagram"><pre>${escapeHtml(diagram)}</pre></div>`
  }

  // Two-column layout: :::columns\n[left]\n[right]\n:::
  const columnsMatch = trimmed.match(/^:::columns\s*\n([\s\S]*?)---[\s\S]*?\n([\s\S]*?)^\s*:::$/m)
  if (columnsMatch) {
    return `<div class="columns">
      <div class="col">${blockRender(columnsMatch[1].trim())}</div>
      <div class="col">${blockRender(columnsMatch[2].trim())}</div>
    </div>`
  }

  // Headings
  if (trimmed.startsWith('### ')) return `<h3>${escapeHtml(trimmed.slice(4))}</h3>`
  if (trimmed.startsWith('## ')) return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`
  if (trimmed.startsWith('# ')) return `<h1>${escapeHtml(trimmed.slice(2))}</h1>`

  // Blockquotes
  if (trimmed.startsWith('> ')) {
    const lines = trimmed.split('\n').map(l => l.replace(/^> /, '')).join(' ')
    return `<blockquote>${inlineRender(lines)}</blockquote>`
  }

  // Horizontal rules
  if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) return '<hr>'

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

  // Tables (simple pipe tables)
  if (/^\|.+\|/.test(trimmed)) {
    const rows = trimmed.split('\n').filter(l => /^\|/.test(l))
    const header = rows[0]
    if (rows.length > 1 && !rows[1].includes('---')) {
      const headers = header.split('|').filter(c => c.trim()).map(c => `<th>${escapeHtml(c.trim())}</th>`).join('')
      const body = rows.slice(2).map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${inlineRender(c.trim())}</td>`).join('')
        return `<tr>${cells}</tr>`
      }).join('')
      return `<div class="table-wrap"><table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table></div>`
    }
    if (rows[1]?.includes('---')) {
      const headers = header.split('|').filter(c => c.trim()).map(c => `<th>${escapeHtml(c.trim())}</th>`).join('')
      const body = rows.slice(2).map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${inlineRender(c.trim())}</td>`).join('')
        return `<tr>${cells}</tr>`
      }).join('')
      return `<div class="table-wrap"><table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table></div>`
    }
  }

  // Paragraph
  return `<p>${inlineRender(trimmed)}</p>`
}

function blockRender(content: string): string {
  return content.split(/\n{2,}/).map(b => renderBlock(b.trim())).filter(Boolean).join('\n')
}

function inlineRender(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/!\[(.*?)\]\((.+?)\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/\n/g, ' ')
}

function renderMarkdown(content: string): string {
  return blockRender(content)
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

        /* ── Tables ── */
        .content .table-wrap { overflow-x: auto; margin: 1.5rem 0; border-radius: 8px; border: 1px solid var(--border); }
        .content table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        .content th { background: var(--bg-card); padding: 0.625rem 1rem; text-align: left; font-weight: 600; border-bottom: 1px solid var(--border); white-space: nowrap; }
        .content td { padding: 0.625rem 1rem; border-bottom: 1px solid var(--border); vertical-align: top; }
        .content tr:last-child td { border-bottom: none; }
        .content tr:hover td { background: rgba(168, 85, 247, 0.03); }

        /* ── Callouts ── */
        .content .callout {
          border-radius: 8px;
          padding: 1rem 1.25rem;
          margin: 1.5rem 0;
          font-size: 0.95rem;
        }
        .content .callout-title {
          font-weight: 700;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }
        .content .callout-note { background: rgba(59, 130, 246, 0.08); border-left: 3px solid #3b82f6; }
        .content .callout-insight { background: rgba(168, 85, 247, 0.08); border-left: 3px solid var(--accent); }
        .content .callout-warning { background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; }
        .content .callout-keypoint { background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981; }
        .content .callout-quote { background: rgba(236, 72, 153, 0.08); border-left: 3px solid #ec4899; }
        .content .callout-example { background: rgba(139, 92, 246, 0.08); border-left: 3px solid #8b5cf6; }
        .content .callout p { margin: 0.25rem 0 0; }

        /* ── ASCII Diagrams ── */
        .content .diagram {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 1.25rem;
          margin: 1.5rem 0;
          overflow-x: auto;
        }
        .content .diagram pre {
          margin: 0;
          font-family: 'SF Mono', Consolas, 'Courier New', monospace;
          font-size: 0.8rem;
          line-height: 1.5;
          color: var(--accent-hover);
          white-space: pre;
        }

        /* ── Two-column layout ── */
        .content .columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin: 1.5rem 0;
        }
        .content .columns .col {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 1rem 1.25rem;
        }
        .content .columns .col p { margin: 0 0 0.5rem; }
        .content .columns .col h3 { margin: 0 0 0.5rem; font-size: 1rem; }

        /* ── Images ── */
        .content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1.5rem 0;
          border: 1px solid var(--border);
        }

        @media (max-width: 600px) {
          .content .columns { grid-template-columns: 1fr; }
        }

      `}</style>
    </main>
  )
}
