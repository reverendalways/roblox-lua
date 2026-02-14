import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { checkAdminAccess } from '@/lib/admin-utils';
import { createSafeMongoRegexQuery } from '@/lib/security';
import { getUsersDatabase } from '@/lib/mongodb-optimized';

export async function POST(request: NextRequest) {
	try {
		const { username, action } = await request.json();
		
		const token1 = request.headers.get('x-admin-token1');
		const token2 = request.headers.get('x-admin-token2');

		if (!username || !action) {
			return NextResponse.json({ 
				success: false, 
				error: 'Missing required fields: username, action' 
			}, { status: 400 });
		}

		if (!token1 || !token2) {
			return NextResponse.json({ 
				success: false, 
				error: 'Missing admin authentication tokens' 
			}, { status: 401 });
		}

		const adminCheck = await checkAdminAccess(request, token1, token2);
		if (!adminCheck.success) {
			return NextResponse.json({ success: false, error: adminCheck.error }, { status: 403 });
		}

		if (!adminCheck.user) {
			return NextResponse.json({ 
				success: false, 
				error: 'Admin user data not found' 
			}, { status: 403 });
		}
		
		const userRank = adminCheck.user.staffRank;
		if (userRank !== 'owner' && userRank !== 'senior_moderator') {
			return NextResponse.json({ 
				success: false, 
				error: 'Insufficient permissions. Only Owner and Senior Moderator ranks can verify accounts.' 
			}, { status: 403 });
		}

		if (action !== 'verify' && action !== 'unverify') {
			return NextResponse.json({ 
				success: false, 
				error: 'Invalid action. Must be "verify" or "unverify"' 
			}, { status: 400 });
		}

		const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
		if (!USERS_URI) {
			return NextResponse.json({ 
				success: false, 
				error: 'Database connection not configured' 
			}, { status: 500 });
		}
		
		const db = await getUsersDatabase();
		const usersCollection = db.collection('ScriptVoid');

		const user = await usersCollection.findOne({ 
			username: createSafeMongoRegexQuery(username) 
		});

		if (!user) {
						return NextResponse.json({ 
				success: false, 
				error: 'User not found' 
			}, { status: 404 });
		}

		if (user.staffRank && user.staffRank !== 'none' && userRank !== 'owner') {
						return NextResponse.json({ 
				success: false, 
				error: 'Cannot modify verification status of staff accounts' 
			}, { status: 400 });
		}

		const updateResult = await usersCollection.updateOne(
			{ _id: user._id },
			{ 
				$set: { 
					verified: action === 'verify' ? true : false
				}
			}
		);

				if (updateResult.modifiedCount === 0) {
			return NextResponse.json({ 
				success: false, 
				error: 'Failed to update user verification status' 
			}, { status: 500 });
		}

		try {
			const webhookUrl = process.env.verificationadd;
			if (webhookUrl) {
				const adminUsername = adminCheck.user?.username || '';
				const adminUserid = adminCheck.user?._id?.toString?.() || '';
				const content = `action: ${action === 'verify' ? 'verified' : 'verification removal'}\nusername: ${user.username}\nuserid: ${user._id?.toString?.() || ''}\nadminusername: ${adminUsername}\nadminuserid: ${adminUserid}`;
				await fetch(webhookUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ content })
				}).catch(() => {});
			}
		} catch {}

		return NextResponse.json({
			success: true,
			message: `Successfully ${action === 'verify' ? 'verified' : 'removed verification from'} account: ${username}`,
			user: {
				username: user.username,
				verified: action === 'verify' ? true : false
			}
		});

	} catch (error) {
		return NextResponse.json({ 
			success: false, 
			error: 'Internal server error' 
		}, { status: 500 });
	}
}
