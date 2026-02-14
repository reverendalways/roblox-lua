import { Metadata } from 'next';
import { getUsersDatabase } from '@/lib/mongodb-optimized';

type Props = {
  params: Promise<{ username: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;

  try {
    const usersDb = await getUsersDatabase();
    const user = await usersDb.collection("ScriptVoid").findOne(
      { username: username },
      {
        projection: {
          _id: 1, username: 1, bio: 1, accountthumbnail: 1,
          totalScripts: 1, totalViews: 1, totalPoints: 1,
          verified: 1, createdAt: 1, lastOnline: 1, isOnline: 1
        }
      }
    );

    if (!user || !user.username) {
      return {
        title: 'Profile — ScriptVoid',
        description: 'User profile on ScriptVoid',
        openGraph: {
          title: 'Profile — ScriptVoid',
          description: 'User profile on ScriptVoid',
          images: ['/og-image.webp'],
        },
        twitter: {
          card: 'summary_large_image',
          title: 'Profile — ScriptVoid',
          description: 'User profile on ScriptVoid',
          images: ['/og-image.webp'],
        },
      };
    }

    const title = `${user.username} - ScriptVoid Profile`;

    const bioText = user.bio && user.bio.trim() ? user.bio : `${user.username}'s profile on ScriptVoid`;
    const description = bioText;

    const image = user.accountthumbnail || '/default.png';
    const url = `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/profile/${username}`;

    const keywords = [
      'ScriptVoid profile',
      user.username,
      'Roblox script creator',
      'script developer',
      user.verified ? 'verified user' : '',
      `${user.totalScripts || 0} scripts`,
      `${user.totalViews || 0} views`
    ].filter(Boolean).join(', ');

    return {
      title,
      description,
      keywords,
      authors: [{ name: user.username }],
      openGraph: {
        title,
        description,
        url,
        images: [
          {
            url: image,
            width: 400,
            height: 400,
            alt: `${user.username}'s ScriptVoid profile picture`,
          }
        ],
        type: 'profile',
        siteName: 'ScriptVoid',
        firstName: user.username,
        username: user.username,
      },
      twitter: {
        card: 'summary',
        title,
        description,
        images: [image],
        creator: `@${user.username}`,
        site: '@ScriptVoid',
      },
      alternates: {
        canonical: url,
      },
      other: {
        'profile:username': user.username,
        'profile:scripts': (user.totalScripts || 0).toString(),
        'profile:views': (user.totalViews || 0).toString(),
        'profile:points': (user.totalPoints || 0).toString(),
        'profile:verified': user.verified ? 'true' : 'false',
      },
    };
  } catch (error) {
    console.error('Error generating metadata for profile:', error);
    return {
      title: 'Profile — ScriptVoid',
      description: 'User profile on ScriptVoid',
      openGraph: {
        title: 'Profile — ScriptVoid',
        description: 'User profile on ScriptVoid',
        images: ['/000F9HNB6KAS5A3K-C322-F4.webp'],
      },
      twitter: {
        card: 'summary',
        title: 'Profile — ScriptVoid',
        description: 'User profile on ScriptVoid',
        images: ['/000F9HNB6KAS5A3K-C322-F4.webp'],
      },
    };
  }
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
