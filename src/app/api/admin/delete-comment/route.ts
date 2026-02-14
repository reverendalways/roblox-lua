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

export async function POST(req: NextRequest) {
  try {
    const { commentId } = await req.json();
    
    const token1 = req.headers.get('x-admin-token1');
    const token2 = req.headers.get('x-admin-token2');
    
    if (!commentId) return NextResponse.json({ error: 'Missing comment ID' }, { status: 400 });
    if (!token1 || !token2) return NextResponse.json({ error: 'Missing admin tokens' }, { status: 401 });
    
    const adminCheck = await checkAdminAccess(req, token1, token2);
    if (!adminCheck.success) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const currentUser = adminCheck.user;
    if (!currentUser || !currentUser.staffRank) {
      return NextResponse.json({ error: 'User not found or no staff rank' }, { status: 403 });
    }

    const canDeleteComments = currentUser.staffRank === 'junior_moderator' || 
                              currentUser.staffRank === 'moderator' || 
                              currentUser.staffRank === 'senior_moderator' || 
                              currentUser.staffRank === 'owner';
    if (!canDeleteComments) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to delete comments', 
        details: 'Only Junior Moderators and above can delete comments',
        requiredRank: 'junior_moderator',
        currentRank: currentUser.staffRank
      }, { status: 403 });
    }

    const scriptsDb = await getScriptsDatabase();
    const scriptsCol = scriptsDb.collection('scripts');
    
    const scriptWithComment = await scriptsCol.findOne({ 'comments.id': commentId });
    if (!scriptWithComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    const comment = scriptWithComment.comments?.find((c: any) => c.id === commentId);
    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    
    const commentAuthor = comment.username || comment.userId;
    if (commentAuthor) {
      const usersDb = await getUsersDatabase();
      const userCol = usersDb.collection('ScriptVoid');
      
      const authorDoc = await userCol.findOne({ username: commentAuthor });
      
      if (authorDoc && authorDoc.staffRank && authorDoc.staffRank !== 'none') {
        if (currentUser.staffRank !== 'owner') {
          return NextResponse.json({ 
            error: 'Cannot delete comment from staff account', 
            details: 'Only the owner can delete comments from staff accounts' 
          }, { status: 403 });
        }
      }
    }
    
    const result = await scriptsCol.updateMany(
      { 'comments.id': commentId },
      { $pull: { comments: { id: commentId } } } as any
    );
    
    if (result.modifiedCount > 0) {
      try {
        const webhookUrl = process.env.commentwebhookdeleteadmin;
        if (webhookUrl) {
          const adminUsername = currentUser?.username || '';
          const adminUserid = currentUser?._id?.toString?.() || '';
          const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
          const scriptLink = `${base}/script/${scriptWithComment.id || ''}`;
          const content = `username: ${comment.username || comment.userId || ''}\nuserid: ${comment.userObjectId || ''}\ncommentid: ${commentId}\ncommentcontent: ${comment.content || ''}\nscriptlink: ${scriptLink}\nadminusername: ${adminUsername}\nadminuserid: ${adminUserid}`;
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
          }).catch(() => {});
        }
      } catch {}
      if (comment.userId || comment.username) {
        try {
          const usersDb = await getUsersDatabase();
          const userCol = usersDb.collection(USERS_COL);
          
          let userDoc: any = null;
          if (comment.userId && typeof comment.userId === 'string' && ObjectId.isValid(comment.userId)) {
            try { userDoc = await userCol.findOne({ _id: new ObjectId(comment.userId) }); } catch {}
          }
          if (!userDoc) {
            const username = comment.username || comment.userId;
            if (username) {
              userDoc = await userCol.findOne({ username });
            }
          }
          
          
          
          if (userDoc && userDoc._id) {
            const base2 = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
            await fetch(`${base2}/api/notifications`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: userDoc._id.toString(),
                type: 'Comment Deleted',
                message: `Your comment on "${scriptWithComment.title || 'Untitled'}" has been deleted by ScriptVoid Moderation.`
              })
            });
          }
        } catch (notificationError) {
  
        }
      }
      

      
      
      return NextResponse.json({ success: true });
    } else {
      
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
  } catch (err) {

    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
