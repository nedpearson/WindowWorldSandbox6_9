/**
 * seed-youtube-resources.ts
 *
 * Seeds YouTube/resource cards into TrainingAsset table.
 * Uses findFirst + create/update to handle null companyId.
 * Idempotent - safe to re-run.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const YOUTUBE_RESOURCES = [
  {
    title: 'Window World Video Resources',
    description: 'Official Window World videos and product demonstrations',
    sourceType: 'link',
    sourceUrl: 'https://www.youtube.com/results?search_query=windowworld',
    category: 'general',
    tagsJson: ['window-world', 'brand', 'overview'],
    attribution: 'YouTube Search',
    copyrightNote: 'External YouTube search link - no content downloaded',
  },
  {
    title: 'Replacement Windows Overview',
    description: 'Window World replacement window product videos',
    sourceType: 'link',
    sourceUrl: 'https://www.youtube.com/results?search_query=Window+World+replacement+windows',
    category: 'windows',
    tagsJson: ['replacement', 'windows', 'products'],
    attribution: 'YouTube Search',
    copyrightNote: 'External YouTube search link',
  },
  {
    title: 'Window Installation Training',
    description: 'Window World installation process and techniques',
    sourceType: 'link',
    sourceUrl: 'https://www.youtube.com/results?search_query=Window+World+window+installation',
    category: 'installation',
    tagsJson: ['installation', 'training', 'process'],
    attribution: 'YouTube Search',
    copyrightNote: 'External YouTube search link',
  },
  {
    title: 'Door Products and Installation',
    description: 'Window World door product lineup and installation',
    sourceType: 'link',
    sourceUrl: 'https://www.youtube.com/results?search_query=Window+World+doors',
    category: 'doors',
    tagsJson: ['doors', 'patio', 'entry', 'products'],
    attribution: 'YouTube Search',
    copyrightNote: 'External YouTube search link',
  },
  {
    title: 'Siding Products and Installation',
    description: 'Window World siding options and installation process',
    sourceType: 'link',
    sourceUrl: 'https://www.youtube.com/results?search_query=Window+World+siding',
    category: 'siding',
    tagsJson: ['siding', 'vinyl', 'exterior'],
    attribution: 'YouTube Search',
    copyrightNote: 'External YouTube search link',
  },
  {
    title: 'How to Measure Replacement Windows',
    description: 'Step-by-step measuring techniques for replacement windows',
    sourceType: 'link',
    sourceUrl: 'https://www.youtube.com/results?search_query=how+to+measure+replacement+windows',
    category: 'measuring',
    tagsJson: ['measuring', 'field', 'technique'],
    attribution: 'YouTube Search',
    copyrightNote: 'External YouTube search link',
  },
  {
    title: 'Brick Opening Window Installation',
    description: 'Replacement window installation in brick openings',
    sourceType: 'link',
    sourceUrl: 'https://www.youtube.com/results?search_query=replacement+window+brick+opening+installation',
    category: 'installation',
    tagsJson: ['brick', 'opening', 'installation', 'masonry'],
    attribution: 'YouTube Search',
    copyrightNote: 'External YouTube search link',
  },
  {
    title: 'Vinyl Siding Installation Basics',
    description: 'Fundamentals of vinyl siding installation',
    sourceType: 'link',
    sourceUrl: 'https://www.youtube.com/results?search_query=vinyl+siding+installation+basics',
    category: 'siding',
    tagsJson: ['vinyl', 'siding', 'basics', 'installation'],
    attribution: 'YouTube Search',
    copyrightNote: 'External YouTube search link',
  },
  {
    title: 'Patio Door Replacement',
    description: 'Replacement patio door installation process',
    sourceType: 'link',
    sourceUrl: 'https://www.youtube.com/results?search_query=replacement+patio+door+installation',
    category: 'doors',
    tagsJson: ['patio', 'door', 'replacement', 'sliding'],
    attribution: 'YouTube Search',
    copyrightNote: 'External YouTube search link',
  },
  {
    title: 'Tempered Glass and Window Safety',
    description: 'Safety glass requirements and tempered glass specifications',
    sourceType: 'link',
    sourceUrl: 'https://www.youtube.com/results?search_query=tempered+glass+window+safety',
    category: 'glass-safety',
    tagsJson: ['tempered', 'safety', 'glass', 'code'],
    attribution: 'YouTube Search',
    copyrightNote: 'External YouTube search link',
  },
  {
    title: 'Obscure Privacy Glass Options',
    description: 'Privacy glass and obscure glass window options',
    sourceType: 'link',
    sourceUrl: 'https://www.youtube.com/results?search_query=obscure+privacy+glass+window',
    category: 'glass-options',
    tagsJson: ['obscure', 'privacy', 'glass', 'bathroom'],
    attribution: 'YouTube Search',
    copyrightNote: 'External YouTube search link',
  },
  {
    title: 'Window Grids: Flat vs Contoured',
    description: 'Understanding flat and contoured grid options for windows',
    sourceType: 'link',
    sourceUrl: 'https://www.youtube.com/results?search_query=window+grids+flat+contoured',
    category: 'glass-options',
    tagsJson: ['grids', 'flat', 'contoured', 'GBG', 'SDL'],
    attribution: 'YouTube Search',
    copyrightNote: 'External YouTube search link',
  },
];

async function main() {
  console.log(`[seed-youtube] Seeding ${YOUTUBE_RESOURCES.length} YouTube/resource cards...`);

  for (const resource of YOUTUBE_RESOURCES) {
    const existing = await prisma.trainingAsset.findFirst({
      where: { sourceUrl: resource.sourceUrl, companyId: null },
    });
    if (existing) {
      await prisma.trainingAsset.update({
        where: { id: existing.id },
        data: {
          title: resource.title,
          description: resource.description,
          sourceType: resource.sourceType,
          category: resource.category,
          tagsJson: resource.tagsJson,
          attribution: resource.attribution,
          copyrightNote: resource.copyrightNote,
          approvedForTraining: true,
        },
      });
      console.log(`  Updated: ${resource.title}`);
    } else {
      await prisma.trainingAsset.create({
        data: {
          companyId: null,
          title: resource.title,
          description: resource.description,
          sourceType: resource.sourceType,
          sourceUrl: resource.sourceUrl,
          category: resource.category,
          tagsJson: resource.tagsJson,
          attribution: resource.attribution,
          copyrightNote: resource.copyrightNote,
          approvedForTraining: true,
        },
      });
      console.log(`  Created: ${resource.title}`);
    }
  }

  const total = await prisma.trainingAsset.count();
  console.log(`\n[seed-youtube] COMPLETE. Total training assets: ${total}`);
}

main()
  .catch((e) => { console.error('[seed-youtube] ERROR:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
