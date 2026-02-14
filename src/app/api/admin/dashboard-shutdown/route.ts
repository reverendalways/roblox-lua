import { NextRequest, NextResponse } from 'next/server';
import { getUsersDatabase } from '@/lib/mongodb-optimized';
import { checkAdminAccess } from '@/lib/admin-utils';

const ADMIN_FIELD = process.env.ADMIN_FIELD;
const ADMIN_FIELD_VALUE = process.env.ADMIN_VALUE;

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await checkAdminAccess(request);
    if (!adminCheck.success) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const currentUser = adminCheck.user;
    if (!currentUser || !currentUser.staffRank) {
      return NextResponse.json({ error: 'User not found or no staff rank' }, { status: 403 });
    }

    const canShutdown = currentUser.staffRank === 'senior_moderator' || currentUser.staffRank === 'owner';
    if (!canShutdown) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to shutdown dashboard', 
        details: 'Only Senior Moderators and Owners can shutdown the dashboard',
        requiredRank: 'senior_moderator',
        currentRank: currentUser.staffRank
      }, { status: 403 });
    }

    const usersDb = await getUsersDatabase();
    const dashCollection = usersDb.collection('dash');

    const currentStatus = await dashCollection.findOne({});

    if (!currentStatus) {
      await dashCollection.insertOne({ dash: "true" });
            return NextResponse.json({ 
        message: 'Dashboard status initialized to enabled',
        currentStatus: 'enabled'
      });
    }

    const newStatus = currentStatus.dash === "true" ? "false" : "true";
    await dashCollection.updateOne(
      { _id: currentStatus._id },
      { $set: { dash: newStatus } }
    );

    try {
      const webhookUrl = process.env.dashboardshutdown;
      if (webhookUrl) {
        const content = `adminusername: ${currentUser.username}\nadminuserid: ${currentUser._id?.toString?.() || ''}`;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        }).catch(() => {});
      }
    } catch {}

    return NextResponse.json({ 
      message: `Dashboard ${newStatus === 'true' ? 'enabled' : 'disabled'} successfully`,
      currentStatus: newStatus === 'true' ? 'enabled' : 'disabled'
    });

  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await checkAdminAccess(request);
    if (!adminCheck.success) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const currentUser = adminCheck.user;
    if (!currentUser || !currentUser.staffRank) {
      return NextResponse.json({ error: 'User not found or no staff rank' }, { status: 403 });
    }

    const canView = currentUser.staffRank === 'senior_moderator' || currentUser.staffRank === 'owner';
    if (!canView) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to view dashboard status', 
        details: 'Only Senior Moderators and Owners can view dashboard status',
        requiredRank: 'senior_moderator',
        currentRank: currentUser.staffRank
      }, { status: 403 });
    }

    const usersDb = await getUsersDatabase();
    const dashCollection = usersDb.collection('dash');

    const currentStatus = await dashCollection.findOne({});

    if (!currentStatus) {
      return NextResponse.json({ dash: "true" });
    }

    return NextResponse.json({ dash: currentStatus.dash });

  } catch (error) {

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

