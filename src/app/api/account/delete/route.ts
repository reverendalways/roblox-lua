import { NextRequest, NextResponse } from 'next/server';
import { mongoPool } from '@/lib/mongodb-pool';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { sendEmail } from '@/lib/email';
import { getUsersDatabase, getScriptsDatabase } from '@/lib/mongodb-optimized';
import { generateCode } from '@/lib/codeFlow';
import crypto from 'crypto';
import { validateCSRFToken } from '@/lib/csrf-protection';
import { rateLimitByIP } from '@/middleware/rate-limit';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;
if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required');
}

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const MONGODB_URI = process.env.MONGODB_URI!;
const USERS_DB = 'users';
const USERS_COL = 'ScriptVoid';
const DELETE_COLLECTION = 'deleteaccount';

export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimitByIP(req, 'accountDelete');
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    const tokenCookie = req.cookies.get('token');
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let payload: any = null;
    try {
      payload = jwt.verify(tokenCookie.value, JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (!payload.userId) {
      return NextResponse.json({ error: 'User ID not found in token' }, { status: 401 });
    }

    const body = await req.json();
    {
      const csrfToken = req.headers.get('x-csrf-token');
      if (!csrfToken || !validateCSRFToken(csrfToken, payload.userId)) {
        return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 });
      }
    }
    const { confirmationCode } = body;

    if (!confirmationCode) {
      return NextResponse.json({ error: 'Confirmation code is required' }, { status: 400 });
    }

    const usersDb = await getUsersDatabase();
    const usersCollection = usersDb.collection(USERS_COL);
    const deleteCollection = usersDb.collection(DELETE_COLLECTION);

    const user = await usersCollection.findOne({ _id: new ObjectId(payload.userId) });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const deleteCode = await deleteCollection.findOne({ userId: new ObjectId(payload.userId) });
    if (!deleteCode) {
      return NextResponse.json({ error: 'No delete confirmation code found. Please request a new one.' }, { status: 400 });
    }

    if (new Date() > new Date(deleteCode.expiresAt)) {
      await deleteCollection.deleteOne({ _id: deleteCode._id });
      return NextResponse.json({ error: 'Confirmation code has expired' }, { status: 400 });
    }

    const codeHash = crypto.createHash('sha256').update(confirmationCode).digest('hex');
    if (deleteCode.codeHash !== codeHash) {
      const failedAttempts = (deleteCode.attempts || 0) + 1;
      const maxAttempts = 5;
      
      if (failedAttempts >= maxAttempts) {
        await deleteCollection.deleteOne({ _id: deleteCode._id });
        return NextResponse.json({ 
          error: `Too many failed attempts. Please request a new confirmation code.`,
          maxAttemptsReached: true
        }, { status: 400 });
      }
      
      await deleteCollection.updateOne(
        { _id: deleteCode._id },
        { $set: { attempts: failedAttempts } }
      );
      
      return NextResponse.json({ 
        error: `Invalid confirmation code. ${maxAttempts - failedAttempts} attempts remaining.`,
        attemptsRemaining: maxAttempts - failedAttempts
      }, { status: 400 });
    }

    const userId = user._id;
    const username = user.username;

    await deleteCollection.deleteOne({ _id: deleteCode._id });

    await usersCollection.deleteOne({ _id: userId });

    const scriptsDb = await getScriptsDatabase();
    const scriptsCollection = scriptsDb.collection('scripts');
    

    await scriptsCollection.updateMany(
      { 'comments.userObjectId': userId.toString() },
      { $pull: { comments: { userObjectId: userId.toString() } } } as any
    );

    await scriptsCollection.deleteMany({ $or: [
      { ownerUserId: userId.toString() },
      { ownerId: username },
      { ownerUsername: username }
    ] });

    const response = NextResponse.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    }, { status: 200 });

    response.cookies.delete('token');

    try {
      const webhookUrl = process.env.deleteaccwebhook;
      if (webhookUrl) {
        const content = `Username: ${username}\nUserid: ${userId.toString()}`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }).catch(() => {});
      }
    } catch {}

    return response;

  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const tokenCookie = req.cookies.get('token');
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let payload: any = null;
    try {
      payload = jwt.verify(tokenCookie.value, JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (!payload.userId) {
      return NextResponse.json({ error: 'User ID not found in token' }, { status: 401 });
    }

    const usersDb = await getUsersDatabase();
    const usersCollection = usersDb.collection(USERS_COL);
    const deleteCollection = usersDb.collection(DELETE_COLLECTION);

    const user = await usersCollection.findOne({ _id: new ObjectId(payload.userId) });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.email || typeof user.email !== 'string' || !user.email.includes('@')) {
      return NextResponse.json({ 
        error: 'Invalid email address. Cannot send confirmation code.',
        details: 'User email is missing or invalid'
      }, { status: 400 });
    }

    const confirmationCode = generateCode(16);
    const codeHash = crypto.createHash('sha256').update(confirmationCode).digest('hex');
    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await deleteCollection.deleteMany({ userId: new ObjectId(payload.userId) });

    const insertResult = await deleteCollection.insertOne({
      userId: new ObjectId(payload.userId),
      codeHash,
      expiresAt: expiryTime,
      createdAt: new Date(),
      attempts: 0
    });

    if (!insertResult.insertedId) {
      return NextResponse.json({ error: 'Failed to save delete confirmation code' }, { status: 500 });
    }

    try {
      console.log('Sending delete confirmation email to:', user.email);
      
      const emailSubject = 'Account Deletion Confirmation Code - ScriptVoid';
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Account Deletion Confirmation</h2>
          <p>Hello ${user.username || 'User'},</p>
          <p>You requested to delete your ScriptVoid account. To confirm this action, please use the following code:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color:rgb(0, 17, 255); font-size: 32px; letter-spacing: 4px; margin: 0;">${confirmationCode}</h1>
          </div>
          <p><strong>Important:</strong></p>
          <ul>
            <li>This code will expire in 24 hours</li>
            <li>This action cannot be undone</li>
            <li>All your scripts and data will be permanently deleted</li>
          </ul>
          <p>If you did not request this, please contact support immediately.</p>
          <p>Best regards,<br>ScriptVoid Team</p>
        </div>
      `;
      
      await sendEmail({
        to: user.email,
        subject: emailSubject,
        html: emailHtml
      });
      console.log('Delete confirmation email sent successfully to:', user.email);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      return NextResponse.json({ 
        error: 'Failed to send confirmation email. Please try again.',
        details: emailError.message
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Confirmation code sent to your email',
      expiresAt: expiryTime
    });

  } catch (error) {
    console.error('Confirmation code generation error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
