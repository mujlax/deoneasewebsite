#!/usr/bin/env node
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import matter from 'gray-matter'

const rootDir = process.cwd()
const newsDir = path.join(rootDir, 'src', 'content', 'news')
const draftsDir = path.join(newsDir, 'drafts')
const processedDir = path.join(draftsDir, '_processed')
const publicAssetsDir = path.join(rootDir, 'public', 'news-assets')
const indexPath = path.join(newsDir, 'index.json')

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

function resolveReadingTime(blocks, resolveAsset) {
  const text = blocks
    .map((block) => {
      if (block.type === 'image') {
        const asset = block.assetId ? resolveAsset(block.assetId) : null
        return [asset?.alt ?? '', block.content ?? ''].join(' ')
      }
      return block.content ?? ''
    })
    .join(' ')

  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

function blocksToMarkdown(blocks, resolveAsset) {
  return blocks
    .map((block) => {
      const content = block.content?.trim() ?? ''

      switch (block.type) {
        case 'heading2':
          return content ? `## ${content}` : ''
        case 'heading3':
          return content ? `### ${content}` : ''
        case 'image': {
          if (!block.assetId) {
            return ''
          }
          const asset = resolveAsset(block.assetId)
          if (!asset) {
            return ''
          }
          const alt = (asset.alt ?? content ?? 'Изображение').trim() || 'Изображение'
          const caption = content ? `\n\n*${content}*` : ''
          return `![${alt}](${asset.path})${caption}`
        }
        default:
          return content
      }
    })
    .filter(Boolean)
    .join('\n\n')
}

function normaliseTags(raw) {
  if (!raw) {
    return []
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.toLowerCase().replace(/\s+/g, '-'))
}

async function writeAssetFile(slug, asset, fallbackName) {
  if (!asset || !asset.dataUrl) {
    return null
  }

  // Если dataUrl это уже существующий путь к файлу, не копируем его снова
  if (asset.dataUrl.startsWith('/news-assets/') || asset.dataUrl.startsWith('news-assets/')) {
    // Извлекаем имя файла из пути
    const fileName = asset.dataUrl.split('/').pop() || asset.filename
    console.log(`Reusing existing asset: ${asset.dataUrl}`)
    
    return {
      path: asset.dataUrl.startsWith('/') ? asset.dataUrl : `/${asset.dataUrl}`,
      alt: asset.alt ?? '',
      filename: fileName,
    }
  }

  const targetDir = path.join(publicAssetsDir, slug)
  await ensureDir(targetDir)

  const ext = path.extname(asset.filename || '').toLowerCase() || '.png'
  const baseName = slugify(path.basename(asset.filename || fallbackName, ext)) || fallbackName
  const fileName = `${baseName}${ext}`
  const targetPath = path.join(targetDir, fileName)

  // Проверяем, что dataUrl это base64
  if (!asset.dataUrl.includes(',')) {
    console.warn(`Warning: asset.dataUrl doesn't look like base64 data for ${fileName}`)
    return null
  }

  const [, base64Payload = ''] = asset.dataUrl.split(',')
  if (!base64Payload) {
    console.warn(`Warning: empty base64 payload for ${fileName}`)
    return null
  }

  const buffer = Buffer.from(base64Payload, 'base64')
  await fs.writeFile(targetPath, buffer)

  return {
    path: `/news-assets/${slug}/${fileName}`,
    alt: asset.alt ?? '',
    filename: fileName,
  }
}

async function processDraft(draftPath) {
  const raw = await fs.readFile(draftPath, 'utf-8')
  const parsed = JSON.parse(raw)

  const meta = parsed.meta ?? {}
  const blocks = parsed.blocks ?? []
  const assets = parsed.assets ?? []

  if (!meta.title) {
    throw new Error(`Draft ${path.basename(draftPath)} is missing meta.title`)
  }

  if (!meta.date) {
    throw new Error(`Draft ${path.basename(draftPath)} is missing meta.date`)
  }

  const slugPart = slugify(meta.title)
  const slug = `${meta.date}-${slugPart || 'material'}`
  const mdxPath = path.join(newsDir, `${slug}.mdx`)

  const assetMap = new Map()

  const coverAsset = assets.find((asset) => asset.kind === 'cover')
  if (coverAsset) {
    const savedCover = await writeAssetFile(slug, coverAsset, 'cover')
    if (savedCover) {
      assetMap.set(coverAsset.id, savedCover)
    }
  }

  const inlineAssets = assets.filter((asset) => asset.kind === 'inline')
  for (let index = 0; index < inlineAssets.length; index += 1) {
    const asset = inlineAssets[index]
    const savedInline = await writeAssetFile(slug, asset, `image-${index + 1}`)
    if (savedInline) {
      assetMap.set(asset.id, savedInline)
    }
  }

  const tags = normaliseTags(meta.tags)
  const resolveAsset = (assetId) => assetMap.get(assetId)
  const readingTime = resolveReadingTime(blocks, resolveAsset)
  const body = blocksToMarkdown(blocks, resolveAsset)

  const frontmatter = {
    title: meta.title,
    description: meta.description ?? '',
    date: meta.date,
    tags,
    readingTime,
  }

  if (coverAsset) {
    const savedCover = assetMap.get(coverAsset.id)
    if (savedCover) {
      frontmatter.cover = savedCover.path
      const coverAlt = savedCover.alt || meta.coverAlt
      if (coverAlt) {
        frontmatter.coverAlt = coverAlt
      }
    }
  }

  const mdxContent = matter.stringify(body, frontmatter)
  await fs.writeFile(mdxPath, `${mdxContent}\n`)

  await ensureDir(processedDir)
  const archivedDraftPath = path.join(processedDir, path.basename(draftPath))
  await fs.rename(draftPath, archivedDraftPath).catch(async () => {
    await fs.writeFile(archivedDraftPath, raw)
    await fs.unlink(draftPath)
  })

  console.log(`Processed draft -> ${path.relative(rootDir, mdxPath)}`)
}

async function regenerateIndex() {
  const entries = await fs.readdir(newsDir)
  const mdxFiles = entries.filter((file) => file.endsWith('.mdx'))

  const items = await Promise.all(
    mdxFiles.map(async (file) => {
      const filePath = path.join(newsDir, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const { data } = matter(content)
      const slug = path.basename(file, '.mdx')

      const rawDate = data.date
      const normalisedDate =
        typeof rawDate === 'string'
          ? rawDate
          : rawDate instanceof Date
            ? rawDate.toISOString().slice(0, 10)
            : ''

      return {
        slug,
        title: data.title ?? slug,
        description: data.description ?? '',
        date: normalisedDate,
        readingTime: data.readingTime ?? 3,
        cover: data.cover ?? null,
        coverAlt: data.coverAlt ?? '',
        tags: Array.isArray(data.tags) ? data.tags : [],
      }
    }),
  )

  items.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))

  await fs.writeFile(indexPath, `${JSON.stringify(items, null, 2)}\n`)
  console.log(`Updated ${path.relative(rootDir, indexPath)}`)
}

async function main() {
  await ensureDir(draftsDir)
  const draftEntries = await fs.readdir(draftsDir)
  const draftFiles = draftEntries.filter((file) => file.endsWith('.json')).map((file) => path.join(draftsDir, file))

  if (draftFiles.length === 0) {
    console.log('No draft files found. Regenerating index...')
    await regenerateIndex()
    return
  }

  for (const file of draftFiles) {
    await processDraft(file)
  }

  await regenerateIndex()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
