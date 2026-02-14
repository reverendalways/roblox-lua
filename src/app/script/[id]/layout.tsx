import { Metadata } from 'next';
import { getScriptsDatabase } from '@/lib/mongodb-optimized';
import { ObjectId } from 'mongodb';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    console.log('Fetching script metadata for ID:', id, 'from:', `${baseUrl}/api/scripts/${id}`);

    const scriptRes = await fetch(`${baseUrl}/api/scripts/${id}`, {
      headers: {
        'User-Agent': 'ScriptVoid-MetaBot/1.0',
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }
    });

    let script: any = null;
    if (scriptRes.ok) {
      script = await scriptRes.json();
      console.log('Script found via API:', script?.title || 'No title');
    } else {
      console.log('API failed, trying direct database access');

      const scriptsDb = await getScriptsDatabase();

      const query = {
        $or: [
          ...(/^[0-9a-fA-F]{24}$/.test(id) ? [{ _id: new ObjectId(id) }] : []),
          ...(Number.isFinite(Number(id)) ? [{ id: Number(id) }] : []),
          { id: id },
          { id: id.toString() }
        ]
      };

      script = await scriptsDb.collection("scripts").findOne(
        query,
        {
          projection: {
            _id: 1, id: 1, title: 1, description: 1, views: 1, likes: 1,
            ownerId: 1, ownerUsername: 1, price: 1, priceAmount: 1,
            thumbnail: 1, customThumbnail: 1, dbThumbnail: 1,
            gameName: 1, isUniversal: 1, gameId: 1, tags: 1, createdAt: 1
          }
        }
      );

      console.log('Script found via DB:', script ? 'YES' : 'NO', script?.title || 'No title');
    }

    if (!script || !script.title) {
      console.log('No script found, returning default metadata for ID:', id);
      return {
        title: `Script ${id} — ScriptVoid`,
        description: `Roblox script ${id} on ScriptVoid. Find and share the best scripts for your favorite Roblox games.`,
        openGraph: {
          title: `Script ${id} — ScriptVoid`,
          description: `Roblox script ${id} on ScriptVoid. Find and share the best scripts for your favorite Roblox games.`,
          images: ['/og-image.webp'],
        },
        twitter: {
          card: 'summary_large_image',
          title: `Script ${id} — ScriptVoid`,
          description: `Roblox script ${id} on ScriptVoid. Find and share the best scripts for your favorite Roblox games.`,
          images: ['/og-image.webp'],
        },
      };
    }

    const ownerName = script.ownerId || script.ownerUsername || 'Unknown';
    const gameDisplay = script.isUniversal ? 'Universal' : (script.gameName || script.gameTitle || 'Unknown Game');
    const title = script.isUniversal
      ? `${script.title} - Universal - ${ownerName}`
      : `${gameDisplay} - ${script.title} - ${ownerName}`;

    const baseDesc = (script.description || '').replace(/\s+/g, ' ').trim();
    const description = baseDesc.length > 200 ? `${baseDesc.slice(0, 200)}...` : baseDesc;

    const image = '/og-image.webp';
    const url = `${baseUrl}/script/${id}`;

    console.log('Generated metadata:', { title, description, image, ownerName, gameDisplay });

    const keywords = [
      gameDisplay,
    ];

    if (script.tags && Array.isArray(script.tags)) {
      keywords.push(...script.tags);
    }

    keywords.push(script.title);

    if (baseDesc) {
      const descWords = baseDesc.split(' ').slice(0, 10).filter(word => word.length > 2);
      keywords.push(...descWords);
    }

    keywords.push(ownerName);

    const uniqueKeywords = [...new Set(keywords)].slice(0, 15);

    return {
      title,
      description,
      keywords: uniqueKeywords.join(', '),
      authors: [{ name: ownerName }],
      openGraph: {
        title,
        description,
        url,
        images: [
          {
            url: image,
            width: 1200,
            height: 630,
            alt: `${script.title} - ${gameDisplay} script thumbnail`,
          }
        ],
        type: 'article',
        siteName: 'ScriptVoid',
        publishedTime: script.createdAt || new Date().toISOString(),
        authors: [ownerName],
        section: gameDisplay,
        tags: script.tags || [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
        creator: `@${ownerName}`,
        site: '@ScriptVoid',
      },
      alternates: {
        canonical: url,
      },
      other: {
        'script:author': ownerName,
        'script:game': gameDisplay,
        'script:views': (script.views || 0).toString(),
        'script:likes': (script.likes || 0).toString(),
      },
    };
  } catch (error) {
    console.error('Error generating metadata for script:', id, error);
    console.error('Error details:', error.message, error.stack);
    return {
      title: `Script ${id} — ScriptVoid`,
      description: `Roblox script ${id} on ScriptVoid. Find and share the best scripts for your favorite Roblox games.`,
      openGraph: {
        title: `Script ${id} — ScriptVoid`,
        description: `Roblox script ${id} on ScriptVoid. Find and share the best scripts for your favorite Roblox games.`,
        images: ['/og-image.webp'],
      },
      twitter: {
        card: 'summary_large_image',
        title: `Script ${id} — ScriptVoid`,
        description: `Roblox script ${id} on ScriptVoid. Find and share the best scripts for your favorite Roblox games.`,
        images: ['/og-image.webp'],
      },
    };
  }
}

export default function ScriptLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
