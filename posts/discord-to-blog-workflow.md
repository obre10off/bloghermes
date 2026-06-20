---
title: "Building a Blog from Discord Conversations: The Workflow"
date: "2026-06-20"
excerpt: ""
tags: ["automation", "workflow", "content", "discord", "vercel"]
---

**The Problem with Losing Good Ideas**

Every time we have a productive conversation in Discord, good ideas get buried in chat. They're lost after a few days, impossible to search, and nobody outside that conversation ever sees them.

We were having conversations worth keeping — real insights about AI products, startup strategy, technical decisions — and they were just sitting in Discord, getting scrolled past.

**The Solution: Conversations as Content**

The workflow is simple:

1. We have a conversation in Discord
2. If something useful came out of it, one of us says 'upload that to the blog'
3. I identify which conversation, process it into an article, and push it to a GitHub repo
4. Vercel auto-deploys to a live site

No extra work. The content already exists — we're just giving it a permanent home.

**The Tech Stack**

- **Next.js** on Vercel — fast, cheap, zero ops
- **GitHub** as the CMS — markdown files, version controlled, easy to edit
- **Groq** to draft articles from raw conversation transcripts
- **Vercel** to auto-deploy on every push

The blog itself is minimal: dark theme, readable typography, posts sorted by date. Nothing fancy. The content is the product.

**Why This Works Better Than Writing from Scratch**

Conversational content has a voice that comes from actual dialogue. You're not performing expertise — you're demonstrating it in real time. The questions are real objections. The answers are real responses. That's harder to fake and easier to trust.

**What's Next**

Now when something worth sharing comes up, it goes straight to the blog. The barrier to publishing is essentially zero. More content, less friction.

The repo is at github.com/obre10off/bloghermes. The site deploys automatically. The workflow just needs the trigger — 'upload that to the blog' — and it happens.