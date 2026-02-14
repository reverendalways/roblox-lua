import { MongoClient } from 'mongodb';

const USERS_URI = process.env.USERS_MONGODB_URI || process.env.MONGODB_URI;
const SCRIPTS_URI = process.env.SCRIPTS_MONGODB_URI || process.env.MONGODB_URI;

export async function createDatabaseIndexes() {
  try {
    console.log('🚀 Starting database index creation...');
    
    if (USERS_URI) {
      console.log('📊 Creating indexes for users collection...');
      const usersClient = new MongoClient(USERS_URI);
      await usersClient.connect();
      
      const usersCol = usersClient.db('users').collection('ScriptVoid');
      
      await usersCol.createIndex({ username: 1 }, { 
        unique: true, 
        background: true,
        name: 'username_index'
      });
      
      await usersCol.createIndex({ email: 1 }, { 
        unique: true,
        background: true,
        name: 'email_index'
      });
      
      await usersCol.createIndex({ userId: 1 }, { 
        background: true,
        name: 'userId_index'
      });
      
      await usersCol.createIndex({ verified: 1 }, { 
        background: true,
        name: 'verified_index'
      });
      
      await usersCol.createIndex({ staffRank: 1 }, { 
        background: true,
        name: 'staffRank_index'
      });
      
      await usersCol.createIndex({ isTimeouted: 1, timeoutEnd: 1 }, { 
        background: true,
        name: 'timeout_status_index'
      });
      
      await usersCol.createIndex({ timeoutEnd: 1 }, { 
        background: true,
        name: 'timeout_end_index'
      });
      
      await usersCol.createIndex({ lastOnline: 1 }, { 
        background: true,
        name: 'lastOnline_index'
      });
      
      await usersCol.createIndex({ lastLogin: 1 }, { 
        background: true,
        name: 'lastLogin_index'
      });
      
      await usersCol.createIndex({ accountthumbnail: 1 }, { 
        background: true,
        name: 'accountthumbnail_index'
      });
      
      await usersCol.createIndex({ createdAt: -1 }, { 
        background: true,
        name: 'createdAt_desc_index'
      });
      
      await usersCol.createIndex({ verified: 1, staffRank: 1 }, { 
        background: true,
        name: 'verified_staff_compound_index'
      });
      
      await usersCol.createIndex({ 
        username: 'text', 
        bio: 'text' 
      }, { 
        background: true,
        name: 'user_text_search_index',
        weights: { username: 10, bio: 1 }
      });
      
      console.log('✅ Users collection indexes created successfully');
      await usersClient.close();
    }
    
    if (SCRIPTS_URI) {
      console.log('📊 Creating indexes for scripts collection...');
      const scriptsClient = new MongoClient(SCRIPTS_URI);
      await scriptsClient.connect();
      
      const scriptsCol = scriptsClient.db(process.env.SCRIPTS_DB || 'mydatabase').collection(process.env.SCRIPTS_COLLECTION || 'scripts');
      
      await scriptsCol.createIndex({ id: 1 }, { 
        unique: true,
        background: true,
        name: 'script_id_index'
      });
      
      await scriptsCol.createIndex({ _id: 1 }, { 
        background: true,
        name: 'script_objectid_index'
      });
      
      await scriptsCol.createIndex({ views: -1 }, { 
        background: true,
        name: 'views_desc_index'
      });
      
      await scriptsCol.createIndex({ createdAt: -1 }, { 
        background: true,
        name: 'createdAt_desc_index'
      });
      
      await scriptsCol.createIndex({ lastActivity: -1 }, { 
        background: true,
        name: 'lastActivity_desc_index'
      });
      
      await scriptsCol.createIndex({ points: -1 }, { 
        background: true,
        name: 'points_desc_index'
      });
      
      await scriptsCol.createIndex({ likes: -1 }, { 
        background: true,
        name: 'likes_desc_index'
      });
      
      await scriptsCol.createIndex({ points: -1, views: -1, likes: -1 }, { 
        background: true,
        name: 'popular_compound_index'
      });
      
      await scriptsCol.createIndex({ lastActivity: -1, points: -1 }, { 
        background: true,
        name: 'activity_points_compound_index'
      });
      
      await scriptsCol.createIndex({ ownerId: 1 }, { 
        background: true,
        name: 'ownerId_index'
      });
      
      await scriptsCol.createIndex({ ownerUsername: 1 }, { 
        background: true,
        name: 'ownerUsername_index'
      });
      
      await scriptsCol.createIndex({ ownerUserId: 1 }, { 
        background: true,
        name: 'ownerUserId_index'
      });
      
      await scriptsCol.createIndex({ ownerId: 1, ownerUsername: 1 }, { 
        background: true,
        name: 'owner_compound_index'
      });
      
      await scriptsCol.createIndex({ gameId: 1 }, { 
        background: true,
        name: 'gameId_index'
      });
      
      await scriptsCol.createIndex({ gameName: 1 }, { 
        background: true,
        name: 'gameName_index'
      });
      
      await scriptsCol.createIndex({ gameId: 1, gameName: 1 }, { 
        background: true,
        name: 'game_compound_index'
      });
      
      await scriptsCol.createIndex({ status: 1 }, { 
        background: true,
        name: 'status_index'
      });
      
      await scriptsCol.createIndex({ visibility: 1 }, { 
        background: true,
        name: 'visibility_index'
      });
      
      await scriptsCol.createIndex({ status: 1, visibility: 1 }, { 
        background: true,
        name: 'status_visibility_compound_index'
      });
      
      await scriptsCol.createIndex({ isUniversal: 1 }, { 
        background: true,
        name: 'isUniversal_index'
      });
      
      await scriptsCol.createIndex({ isVerified: 1 }, { 
        background: true,
        name: 'isVerified_index'
      });
      
      await scriptsCol.createIndex({ verified: 1 }, { 
        background: true,
        name: 'verified_index'
      });
      
      await scriptsCol.createIndex({ promoted: 1 }, { 
        background: true,
        name: 'promoted_index'
      });
      
      await scriptsCol.createIndex({ price: 1 }, { 
        background: true,
        name: 'price_index'
      });
      
      await scriptsCol.createIndex({ priceAmount: 1 }, { 
        background: true,
        name: 'priceAmount_index'
      });
      
      await scriptsCol.createIndex({ price: 1, priceAmount: 1 }, { 
        background: true,
        name: 'price_compound_index'
      });
      
      await scriptsCol.createIndex({ tags: 1 }, { 
        background: true,
        name: 'tags_index'
      });
      
      await scriptsCol.createIndex({ 
        title: 'text', 
        description: 'text', 
        tags: 'text',
        gameName: 'text'
      }, { 
        background: true,
        name: 'script_text_search_index',
        weights: { title: 10, description: 5, tags: 3, gameName: 2 }
      });
      
      await scriptsCol.createIndex({ 'comments.userObjectId': 1 }, { 
        background: true,
        name: 'comments_user_index'
      });
      
      await scriptsCol.createIndex({ 'comments.createdAt': -1 }, { 
        background: true,
        name: 'comments_created_index'
      });
      
      await scriptsCol.createIndex({ promotionExpiresAt: 1 }, { 
        background: true,
        name: 'promotion_expires_index'
      });
      
      await scriptsCol.createIndex({ promotionTier: 1 }, { 
        background: true,
        name: 'promotion_tier_index'
      });
      
      await scriptsCol.createIndex({ multiplier: 1 }, { 
        background: true,
        name: 'multiplier_index'
      });
      
      await scriptsCol.createIndex({ updatedAt: -1 }, { 
        background: true,
        name: 'updatedAt_desc_index'
      });
      
      await scriptsCol.createIndex({ status: 1, isUniversal: 1, points: -1 }, { 
        background: true,
        name: 'status_universal_points_index'
      });
      
      await scriptsCol.createIndex({ ownerUsername: 1, status: 1, createdAt: -1 }, { 
        background: true,
        name: 'owner_status_created_index'
      });
      
      await scriptsCol.createIndex({ gameId: 1, status: 1, points: -1 }, { 
        background: true,
        name: 'game_status_points_index'
      });
      
      console.log('✅ Scripts collection indexes created successfully');
      await scriptsClient.close();
    }
    
    if (USERS_URI) {
      console.log('📊 Creating indexes for additional collections...');
      const usersClient = new MongoClient(USERS_URI);
      await usersClient.connect();
      
      const emailCodesCol = usersClient.db('users').collection('email_verification_codes');
      await emailCodesCol.createIndex({ userId: 1 }, { 
        background: true,
        name: 'email_codes_userId_index'
      });
      
      await emailCodesCol.createIndex({ email: 1 }, { 
        background: true,
        name: 'email_codes_email_index'
      });
      
      await emailCodesCol.createIndex({ code: 1 }, { 
        background: true,
        name: 'email_codes_code_index'
      });
      
      await emailCodesCol.createIndex({ expiresAt: 1 }, { 
        background: true,
        name: 'email_codes_expires_index'
      });
      
      await emailCodesCol.createIndex({ used: 1, expiresAt: 1 }, { 
        background: true,
        name: 'email_codes_used_expires_index'
      });
      
      const onlineCol = usersClient.db('users').collection('online');
      await onlineCol.createIndex({ username: 1 }, { 
        background: true,
        name: 'online_username_index'
      });
      
      await onlineCol.createIndex({ userId: 1 }, { 
        background: true,
        name: 'online_userId_index'
      });
      
      await onlineCol.createIndex({ type: 1 }, { 
        background: true,
        name: 'online_type_index'
      });
      
      await onlineCol.createIndex({ lastPing: 1 }, { 
        background: true,
        name: 'online_lastPing_index'
      });
      
      await onlineCol.createIndex({ type: 1, lastPing: 1 }, { 
        background: true,
        name: 'online_type_ping_index'
      });
      
      const notificationsCol = usersClient.db('users').collection('UserNotifications');
      await notificationsCol.createIndex({ userId: 1 }, { 
        background: true,
        name: 'notifications_userId_index'
      });
      
      await notificationsCol.createIndex({ createdAt: -1 }, { 
        background: true,
        name: 'notifications_created_index'
      });
      
      await notificationsCol.createIndex({ userId: 1, createdAt: -1 }, { 
        background: true,
        name: 'notifications_user_created_index'
      });
      
      await notificationsCol.createIndex({ read: 1 }, { 
        background: true,
        name: 'notifications_read_index'
      });
      
      const leaderboardCol = usersClient.db('users').collection('leadboard');
      await leaderboardCol.createIndex({ username: 1 }, { 
        background: true,
        name: 'leaderboard_username_index'
      });
      
      await leaderboardCol.createIndex({ points: -1 }, { 
        background: true,
        name: 'leaderboard_points_index'
      });
      
      await leaderboardCol.createIndex({ rank: 1 }, { 
        background: true,
        name: 'leaderboard_rank_index'
      });
      
      const dashCol = usersClient.db('users').collection('dash');
      await dashCol.createIndex({ status: 1 }, { 
        background: true,
        name: 'dash_status_index'
      });
      
      await dashCol.createIndex({ createdAt: -1 }, { 
        background: true,
        name: 'dash_created_index'
      });
      
      const pendingCol = usersClient.db('users').collection('pending');
      await pendingCol.createIndex({ userId: 1 }, { 
        background: true,
        name: 'pending_userId_index'
      });
      
      await pendingCol.createIndex({ expiresAt: 1 }, { 
        background: true,
        name: 'pending_expires_index'
      });
      
      await pendingCol.createIndex({ type: 1 }, { 
        background: true,
        name: 'pending_type_index'
      });
      
      console.log('✅ Additional collections indexes created successfully');
      await usersClient.close();
    }
    
    if (SCRIPTS_URI) {
      console.log('📊 Creating indexes for scripts database collections...');
      const scriptsClient = new MongoClient(SCRIPTS_URI);
      await scriptsClient.connect();
      
      const codesCol = scriptsClient.db(process.env.SCRIPTS_DB || 'mydatabase').collection('codes');
      await codesCol.createIndex({ code: 1 }, { 
        unique: true,
        background: true,
        name: 'codes_code_index'
      });
      
      await codesCol.createIndex({ active: 1 }, { 
        background: true,
        name: 'codes_active_index'
      });
      
      await codesCol.createIndex({ expiresAt: 1 }, { 
        background: true,
        name: 'codes_expires_index'
      });
      
      await codesCol.createIndex({ createdBy: 1 }, { 
        background: true,
        name: 'codes_createdBy_index'
      });
      
      await codesCol.createIndex({ active: 1, expiresAt: 1 }, { 
        background: true,
        name: 'codes_active_expires_index'
      });
      
      const userPromoCol = scriptsClient.db(process.env.SCRIPTS_DB || 'mydatabase').collection('user_promo_usage');
      await userPromoCol.createIndex({ userId: 1 }, { 
        background: true,
        name: 'user_promo_userId_index'
      });
      
      await userPromoCol.createIndex({ promoCode: 1 }, { 
        background: true,
        name: 'user_promo_code_index'
      });
      
      await userPromoCol.createIndex({ userId: 1, promoCode: 1 }, { 
        unique: true,
        background: true,
        name: 'user_promo_compound_index'
      });
      
      await userPromoCol.createIndex({ usedAt: -1 }, { 
        background: true,
        name: 'user_promo_usedAt_index'
      });
      
      const likesCol = scriptsClient.db(process.env.SCRIPTS_DB || 'mydatabase').collection('likes');
      await likesCol.createIndex({ scriptId: 1 }, { 
        background: true,
        name: 'likes_scriptId_index'
      });
      
      await likesCol.createIndex({ userId: 1 }, { 
        background: true,
        name: 'likes_userId_index'
      });
      
      await likesCol.createIndex({ scriptId: 1, userId: 1 }, { 
        unique: true,
        background: true,
        name: 'likes_compound_index'
      });
      
      await likesCol.createIndex({ createdAt: -1 }, { 
        background: true,
        name: 'likes_created_index'
      });
      
      console.log('✅ Scripts database collections indexes created successfully');
      await scriptsClient.close();
    }
    
    console.log('🎉 All database indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
}

if (require.main === module) {
  createDatabaseIndexes().then(() => process.exit(0));
}
