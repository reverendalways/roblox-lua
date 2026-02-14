import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { checkAdminAccess, checkAdminWithTokens } from '@/lib/admin-utils';
import { getScriptsDatabase, getUsersDatabase } from '@/lib/mongodb-optimized';

const MONGODB_URI = process.env.MONGODB_URI!;
const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const USERS_DB = process.env.USERS_DB || 'users';
const USERS_COL = process.env.USERS_COL || 'ScriptVoid';
const ADMIN_FIELD = process.env.ADMIN_FIELD;
const ADMIN_FIELD_VALUE = process.env.ADMIN_VALUE;
const ADMIN_TOKEN_1 = process.env.ADMIN_TOKEN_1;
const ADMIN_TOKEN_2 = process.env.ADMIN_TOKEN_2;
const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    
    const token1 = req.headers.get('x-admin-token1');
    const token2 = req.headers.get('x-admin-token2');
    
    if (!id) return NextResponse.json({ error: 'Missing script ID' }, { status: 400 });
    if (!token1 || !token2) return NextResponse.json({ error: 'Missing admin tokens' }, { status: 401 });
    
    const adminCheck = await checkAdminAccess(req, token1, token2);
    if (!adminCheck.success) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }
    
    const scriptsDb = await getScriptsDatabase();
    const scriptsCol = scriptsDb.collection('scripts');
    
    const script = await scriptsCol.findOne({ id: String(id) });
    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }
    
    if (!USERS_URI) {
      return NextResponse.json({ error: 'Database configuration error' }, { status: 500 });
    }
    const usersDb = await getUsersDatabase();
    const userCol = usersDb.collection('ScriptVoid');
    
    const currentUser = await userCol.findOne({ _id: new ObjectId((adminCheck as any).user?._id || (adminCheck as any).user?.id || '') });
    
    if (!currentUser || !currentUser.staffRank) {
      return NextResponse.json({ error: 'User not found or no staff rank' }, { status: 403 });
    }
    
    const userRank = currentUser.staffRank;
    
    const scriptOwner = script.ownerUsername || script.ownerId || script.ownerUserId;
    if (scriptOwner) {
      const ownerDoc = await userCol.findOne({ username: scriptOwner });
      
      if (ownerDoc && ownerDoc.staffRank && ownerDoc.staffRank !== 'none') {
        if (userRank !== 'owner') {
          return NextResponse.json({ 
            error: 'Cannot delete script from staff account', 
            details: 'Only the owner can delete scripts from staff accounts' 
          }, { status: 403 });
        }
      }
    }
    
    const scriptAge = Date.now() - new Date(script.createdAt || script.uploadedAt || Date.now()).getTime();
    const scriptAgeDays = scriptAge / (1000 * 60 * 60 * 24);
    
    const isVerified = script.isVerified || script.ownerVerified || false;
    
    const isPromoted = script.promotionActive || script.promotionTier || false;
    
    let canDelete = false;
    let reason = '';
    
    if (userRank === 'owner') {
      canDelete = true;
      reason = 'Owner can delete any script';
    } else if (userRank === 'senior_moderator') {
      if (isPromoted) {
        canDelete = true;
        reason = 'Senior moderator can delete promoted scripts';
      } else if (scriptAgeDays >= 30) {
        canDelete = true;
        reason = 'Senior moderator can delete scripts 30+ days old';
      } else if (isVerified) {
        canDelete = true;
        reason = 'Senior moderator can delete verified scripts';
      } else {
        canDelete = true;
        reason = 'Senior moderator can delete any non-promoted script';
      }
    } else if (userRank === 'moderator') {
      if (isPromoted) {
        canDelete = false;
        reason = 'Moderator cannot delete promoted scripts (requires senior moderator+)';
      } else if (scriptAgeDays >= 30) {
        canDelete = true;
        reason = 'Moderator can delete scripts 30+ days old';
      } else if (isVerified) {
        canDelete = true;
        reason = 'Moderator can delete verified scripts';
      } else {
        canDelete = true;
        reason = 'Moderator can delete any non-promoted script under 30 days';
      }
    } else if (userRank === 'junior_moderator') {
      if (isPromoted) {
        canDelete = false;
        reason = 'Junior moderator cannot delete promoted scripts (requires senior moderator+)';
      } else if (scriptAgeDays >= 30) {
        canDelete = false;
        reason = 'Junior moderator cannot delete scripts 30+ days old (requires moderator+)';
      } else if (isVerified) {
        canDelete = false;
        reason = 'Junior moderator cannot delete verified scripts (requires moderator+)';
      } else {
        canDelete = true;
        reason = 'Junior moderator can delete non-verified scripts under 30 days';
      }
    }
    
    if (!canDelete) {
      
      return NextResponse.json({ 
        error: 'Insufficient permissions to delete this script', 
        details: reason,
        scriptInfo: {
          age: `${Math.round(scriptAgeDays)} days`,
          verified: isVerified,
          promoted: isPromoted,
          requiredRank: isPromoted ? 'senior_moderator' : 
                       scriptAgeDays >= 30 ? 'moderator' : 
                       isVerified ? 'moderator' : 'junior_moderator'
        }
      }, { status: 403 });
    }
    
    const res = await scriptsCol.deleteOne({ id: String(id) });
    
    if (res.deletedCount === 1) {
      try {
        const webhookUrl = process.env.deletescriptlogs;
        if (webhookUrl) {
          const adminUsername = currentUser?.username || '';
          const adminUserId = currentUser?._id?.toString?.() || '';
          const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
          const scriptLink = `${base}/script/${script.id || id}`;
          const content = `scriptlink: ${scriptLink}\nscriptid: ${script.id || id}\ncreatorusername: ${script.ownerUsername || script.ownerId || ''}\nadminusername: ${adminUsername}\nadminuserid: ${adminUserId}`;
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
          }).catch(() => {});
        }
      } catch {}
      if (scriptOwner) {
        try {
          const userDoc = await userCol.findOne({ username: scriptOwner });
          
          if (userDoc && userDoc._id) {
            const base2 = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
            await fetch(`${base2}/api/notifications`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userDoc._id.toString(),
                type: 'Script Deleted',
                message: `Your script "${script.title || 'Untitled'}" has been deleted by ScriptVoid Moderation.`
              })
            });
          }
        } catch (notificationError) {
  
        }
      }
      
      
      return NextResponse.json({ 
        success: true, 
        reason: reason,
        scriptInfo: {
          age: `${Math.round(scriptAgeDays)} days`,
          verified: isVerified,
          promoted: isPromoted
        }
      });
    } else {
      
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }
  } catch (err) {

    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
