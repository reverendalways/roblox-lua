import { NextRequest, NextResponse } from 'next/server';
import { getUsersDatabase } from '@/lib/mongodb-optimized';
import { sendEmail } from '@/lib/email';
import bcrypt from 'bcryptjs';
import { validateTurnstileFromBody } from '@/lib/turnstile-verification';

const uri = process.env.USERS_MONGODB_URI;
const dbName = 'users';
const collectionName = 'ScriptVoid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    const db = await getUsersDatabase();
    const turnstileAttempts = await db.collection('turnstile_attempts').findOne({ 
      ipAddress: clientIP,
      email: email.toLowerCase().trim()
    });

    const maxAttempts = 8;
    const currentAttempts = turnstileAttempts?.attempts || 0;

    const turnstileResult = await validateTurnstileFromBody(body, request);
    if (!turnstileResult.success) {
      const newAttemptCount = currentAttempts + 1;
      
      if (newAttemptCount >= maxAttempts) {
        await db.collection('turnstile_attempts').updateOne(
          { ipAddress: clientIP, email: email.toLowerCase().trim() },
          { 
            $set: { 
              attempts: newAttemptCount, 
              lastAttempt: new Date(),
              requiresReload: true
            } 
          },
          { upsert: true }
        );
        
        return NextResponse.json({ 
          error: "Too many failed security verifications. Please reload the page and try again.",
          requiresReload: true,
          attemptsRemaining: 0
        }, { status: 400 });
      } else {
        await db.collection('turnstile_attempts').updateOne(
          { ipAddress: clientIP, email: email.toLowerCase().trim() },
          { 
            $set: { 
              attempts: newAttemptCount, 
              lastAttempt: new Date(),
              requiresReload: false
            } 
          },
          { upsert: true }
        );
        
        return NextResponse.json({ 
          error: turnstileResult.error || "Security verification failed. Please try again.",
          requiresReload: false,
          attemptsRemaining: maxAttempts - newAttemptCount
        }, { status: 400 });
      }
    }

    await db.collection('turnstile_attempts').deleteOne({ 
      ipAddress: clientIP, 
      email: email.toLowerCase().trim() 
    });

    await db.collection('turnstile_attempts').deleteMany({
      lastAttempt: { $lt: new Date(Date.now() - 60 * 60 * 1000) }
    });

    const allowedFields = ['email', 'password', 'turnstileToken'];
    const bodyKeys = Object.keys(body);
    const extraFields = bodyKeys.filter(key => !allowedFields.includes(key));
    
    if (extraFields.length > 0) {
      console.warn(`Security: Extra fields detected in email-verification: ${extraFields.join(', ')}`);
      return NextResponse.json({ 
        error: "Invalid payload structure. Extra fields not allowed." 
      }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const users = db.collection(collectionName);

    try {
      const user = await users.findOne({ email: normalizedEmail });

      
      if (!user) {

        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      
      if (!isPasswordValid) {

        return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
      }

      const lastCodeSent = await db.collection('email_verification_codes').findOne(
        { 
          userId: user._id,
          email: normalizedEmail
        },
        { sort: { createdAt: -1 } }
      );

      if (lastCodeSent) {
        const timeSinceLastCode = Date.now() - lastCodeSent.createdAt.getTime();
        const cooldownPeriod = 60 * 1000;
        
        if (timeSinceLastCode < cooldownPeriod) {
          const remainingTime = Math.ceil((cooldownPeriod - timeSinceLastCode) / 1000);
          return NextResponse.json({ 
            error: `Please wait ${remainingTime} seconds before requesting another code`,
            cooldownRemaining: remainingTime
          }, { status: 429 });
        }
      }

      const code = Math.floor(10000000 + Math.random() * 90000000).toString();
      
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      
      const ipAddress = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown';

      const verificationData = {
        userId: user._id,
        email: normalizedEmail,
        code,
        expiresAt,
        used: false,
        createdAt: new Date(),
        ipAddress,
        attempts: 0
      };

      await db.collection('email_verification_codes').deleteMany({ 
        userId: user._id,
        email: normalizedEmail
      });

      await db.collection('email_verification_codes').insertOne(verificationData);

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">ScriptVoid Login Verification</h2>
          <p>Hello ${user.username},</p>
          <p>You've requested to log in to your ScriptVoid account. Please use the following verification code:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${code}</h1>
          </div>
          <p><strong>This code will expire in 15 minutes.</strong></p>
          <p><strong>You have 8 attempts to enter the correct code.</strong></p>
          <p>If you didn't request this login, please ignore this email and consider changing your password.</p>
          <p>Best regards,<br>The ScriptVoid Team</p>
        </div>
      `;

      try {
        await sendEmail({
          to: normalizedEmail,
          subject: 'ScriptVoid Login Verification Code',
          html: emailContent
        });
      } catch (emailError) {

        await db.collection('email_verification_codes').deleteOne({ 
          userId: user._id,
          code 
        });
        return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: "Verification code sent to your email",
        userId: user._id.toString()
      });

    } finally {
          }

  } catch (error) {

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
