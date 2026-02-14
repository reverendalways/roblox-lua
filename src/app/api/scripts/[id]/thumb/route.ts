import { NextRequest, NextResponse } from 'next/server';
import { getScriptsDatabase } from '@/lib/mongodb-optimized';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const scriptsDb = await getScriptsDatabase();
    
    let script: any = await scriptsDb.collection('scripts').findOne({ id });
    if (!script) script = await scriptsDb.collection('scripts').findOne({ _id: new ObjectId(id) });
    if (!script) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    const thumbnail = script.customThumbnail || script.dbThumbnail || script.databaseThumbnail || script.thumbnailUrl || (script.isUniversal ? '/universal.png' : '/no-thumbnail.png');
    
    const result = { thumbnail };
    
    const response = NextResponse.json(result);
    response.headers.set('Cache-Control', 'public, max-age=1800');
    
    return response;
    
  } catch (e) {
    console.error('Thumbnail fetch error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';