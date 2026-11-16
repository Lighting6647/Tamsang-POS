import fs from 'node:fs/promises';
import path from 'node:path';

const OUTPUT_DIR = path.resolve(process.cwd(), 'public', 'images', 'menu');

const DISH_IMAGE_SPECS = [
  {
    id: 'kaprao',
    queries: ['Pad krapow moo', 'Phat kaphrao', 'Thai basil pork'],
    fallbackUrls: [
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Phat_kaphrao_mu_sap_01.jpg/800px-Phat_kaphrao_mu_sap_01.jpg',
    ],
  },
  {
    id: 'prik_kaeng',
    queries: ['Phat phrik khing', 'Thai red curry pork stir fry', 'Pad prik gaeng'],
    fallbackUrls: [],
  },
  {
    id: 'garlic',
    queries: ['Mu thot krathiam', 'Thai garlic pork rice', 'Fried pork garlic pepper rice'],
    fallbackUrls: [],
  },
  {
    id: 'kana',
    queries: ['Khana mu krop', 'Phat khana mu krop', 'Crispy pork kale'],
    fallbackUrls: [],
  },
  {
    id: 'curry_powder',
    queries: ['Pu phat phong kari', 'Thai curry powder seafood', 'Curry crab stir fry'],
    fallbackUrls: [],
  },
  {
    id: 'fried_rice',
    queries: ['Khao phat', 'Thai fried rice pork', 'Khao phat mu'],
    fallbackUrls: [],
  },
  {
    id: 'prik_pao',
    queries: ['Thai chili paste stir fry', 'Nam phrik phao', 'Thai basil clams chili paste'],
    fallbackUrls: [],
  },
  {
    id: 'kee_mao',
    queries: ['Pad kee mao', 'Drunken noodles Thai', 'Phat khi mao'],
    fallbackUrls: [],
  },
  {
    id: 'pad_see_ew',
    queries: ['Pad see ew', 'Phat si-io', 'Thai stir fried wide noodles'],
    fallbackUrls: [],
  },
  {
    id: 'rad_na',
    queries: ['Rat na', 'Rad na Thai noodles', 'Rat na mu'],
    fallbackUrls: [],
  },
  {
    id: 'suki',
    queries: ['Thai suki', 'Suki haeng', 'Thai sukiyaki dry'],
    fallbackUrls: [],
  },
  {
    id: 'tom_yum',
    queries: ['Tom yam kung', 'Tom yum fried rice', 'Tom yum'],
    fallbackUrls: [],
  },
];

async function searchWikimediaImage(query) {
  const apiUrl = new URL('https://commons.wikimedia.org/w/api.php');
  apiUrl.searchParams.set('action', 'query');
  apiUrl.searchParams.set('generator', 'search');
  apiUrl.searchParams.set('gsrnamespace', '6');
  apiUrl.searchParams.set('gsrsearch', `${query} filetype:bitmap`);
  apiUrl.searchParams.set('gsrlimit', '6');
  apiUrl.searchParams.set('prop', 'imageinfo');
  apiUrl.searchParams.set('iiprop', 'url|size|mime');
  apiUrl.searchParams.set('iiurlwidth', '800');
  apiUrl.searchParams.set('format', 'json');

  const res = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'TamsangPOS/1.0 (https://localhost:5173; dev-menu-setup)',
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const pages = Object.values(data?.query?.pages ?? {});
  const candidates = [];

  for (const page of pages) {
    const info = page?.imageinfo?.[0];
    if (!info) continue;
    const mime = info.mime || '';
    if (!mime.includes('jpeg') && !mime.includes('png') && !mime.includes('webp')) {
      continue;
    }
    const url = info.thumburl || info.url;
    if (url && (info.width ?? 0) >= 600) {
      candidates.push({
        title: page.title,
        url,
      });
    }
  }
  return candidates;
}

async function downloadBinary(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'TamsangPOS/1.0 (https://localhost:5173; dev-menu-setup)',
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error(`Unexpected content-type ${contentType}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength < 10_000) {
    throw new Error(`Image too small (${buf.byteLength} bytes)`);
  }
  return buf;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const results = [];

  for (const spec of DISH_IMAGE_SPECS) {
    const targetPath = path.join(OUTPUT_DIR, `${spec.id}.jpg`);
    let saved = false;

    const candidateUrls = [...spec.fallbackUrls];
    for (const q of spec.queries) {
      try {
        const found = await searchWikimediaImage(q);
        for (const f of found) {
          candidateUrls.push(f.url);
        }
        if (found.length > 0) break;
      } catch {
        // try next query
      }
    }

    for (const url of candidateUrls) {
      try {
        const buf = await downloadBinary(url);
        await fs.writeFile(targetPath, buf);
        results.push({ id: spec.id, bytes: buf.byteLength, source: url });
        console.log(`✔ ${spec.id}.jpg (${Math.round(buf.byteLength / 1024)} KB) <- ${url}`);
        saved = true;
        break;
      } catch (err) {
        // try next candidate
      }
    }

    if (!saved) {
      throw new Error(`Failed to fetch valid image for ${spec.id}`);
    }
  }

  console.log(`\nDone! Downloaded ${results.length} menu photographs to ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
