"use client";
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';

interface LeaderUser {
  username: string;
  accountthumbnail?: string;
  verified?: boolean;
  totalViews: number;
  totalScripts: number;
  totalPoints: number;
  leaderboardPosition: number;
}

const DEMO_LEADERS: LeaderUser[] = [
  { username: "demo_creator", accountthumbnail: "", verified: true, totalViews: 15000, totalScripts: 12, totalPoints: 2400, leaderboardPosition: 1 },
  { username: "script_master", accountthumbnail: "", verified: true, totalViews: 9200, totalScripts: 8, totalPoints: 1800, leaderboardPosition: 2 },
  { username: "roblox_dev", accountthumbnail: "", verified: false, totalViews: 5400, totalScripts: 5, totalPoints: 900, leaderboardPosition: 3 },
];

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);
  const [leaders, setLeaders] = useState<LeaderUser[]>([]);
  const { userInfo } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const isValidImageUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    if (url.startsWith('/')) return true;
    if (url.startsWith('data:image')) return true;
    if (url.startsWith('http://') || url.startsWith('https://')) return true;
    return false;
  };

  useEffect(() => {
    let hasCached = false;
    try {
      const cached = sessionStorage.getItem('leaderboard_top100');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.leaders) && parsed.leaders.length > 0) {
          setLeaders(parsed.leaders);
          setLoading(false);
          hasCached = true;
        }
      }
    } catch {}
    if (hasCached) {
      fetchLeaderboard(true);
    } else {
      fetchLeaderboard(false);
    }
  }, []);

  async function fetchLeaderboard(force = false) {
    if (!force && leaders.length > 0) return;

    try {
      if (force) setRefreshing(true); else setLoading(true);

      const res = await fetch(`/api/leaderboard?limit=100&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!res.ok) throw new Error('Failed to fetch leaderboard');

      const data = await res.json();
      const arr: LeaderUser[] = Array.isArray(data.users) ? data.users : [];

      setLeaders(arr.length > 0 ? arr : DEMO_LEADERS);

      try {
        sessionStorage.setItem('leaderboard_top100', JSON.stringify({
          leaders: arr.length > 0 ? arr : DEMO_LEADERS,
          timestamp: Date.now()
        }));
      } catch {}

    } catch (error) {
      console.error('Leaderboard fetch error:', error);
      if (!force) {
        setLeaders(DEMO_LEADERS);
      }
    } finally {
      if (force) setRefreshing(false); else setLoading(false);
    }
  }

  const handleManualRefresh = () => { fetchLeaderboard(true); };

  return (
    <div suppressHydrationWarning className="min-h-screen bg-gray-900 text-white">
      <main className="w-full mx-auto py-8 sm:py-12 lg:py-16 px-3 sm:px-4 lg:px-8">
        <div className="max-w-7xl mx-auto w-full mb-8">
          <div className="grid grid-cols-2 w-full rounded-xl overflow-hidden shadow-lg mb-6">
            <Link href="/browse" className="w-full px-6 py-3 text-sm sm:text-base font-semibold bg-white/10 backdrop-blur text-white border-r border-white/20 hover:bg-white/20 transition-colors text-center">Trending Scripts</Link>
            <div className="w-full px-6 py-3 text-sm sm:text-base font-semibold bg-white text-gray-900 cursor-default text-center">User Leaderboard</div>
          </div>
          <h1 className="text-center text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">User Leaderboard</h1>
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>Ranking by total views</span>
            </div>
            <button onClick={handleManualRefresh} disabled={refreshing} className={`px-4 py-2 rounded-md text-xs font-medium border transition-colors ${refreshing? 'bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed':'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700 hover:text-white'}`}>{refreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/60 rounded-xl overflow-hidden max-w-5xl mx-auto">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 text-[10px] sm:text-xs font-semibold text-gray-300 bg-gray-800/70">
            <div className="col-span-2 sm:col-span-1">Rank</div>
            <div className="col-span-6 sm:col-span-7">User</div>
            <div className="col-span-2 sm:col-span-2 text-right">Scripts</div>
            <div className="col-span-2 sm:col-span-2 text-right">Views</div>
          </div>
          <div>
            {loading && (
              <div className="p-6 text-center text-gray-400">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                  Loading leaderboard...
                </div>
              </div>
            )}
            {!loading && leaders.length === 0 && (<div className="p-6 text-center text-gray-400">No data available.</div>)}
            {!loading && leaders.map((u, idx) => {
              const rank = idx + 1;
              const avatar = (u.accountthumbnail && u.accountthumbnail.trim().length>0) ? u.accountthumbnail : '/default.png';
              return (
                <a key={u.username} href={`/profile/${u.username}`} className="grid grid-cols-12 gap-2 px-4 py-3 items-center text-[10px] sm:text-sm hover:bg-gray-700/40 transition-colors border-t border-gray-800/60 first:border-t-0">
                  <div className="col-span-2 sm:col-span-1 font-bold text-gray-200 flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 text-xs sm:text-sm font-bold rounded ${rank===1?'bg-yellow-500/20 text-yellow-300 border border-yellow-400/40':rank===2?'bg-gray-500/20 text-gray-200 border border-gray-400/30':rank===3?'bg-orange-500/20 text-orange-300 border border-orange-400/40':'bg-gray-700/40 text-gray-300 border border-gray-600/40'}`}>{u.leaderboardPosition || rank}</span>
                  </div>
                  <div className="col-span-6 sm:col-span-7 flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 overflow-hidden bg-gray-700 border border-gray-600 flex-shrink-0 rounded">
                      {isValidImageUrl(avatar) ? (
                        <Image src={avatar} alt={u.username} width={40} height={40} className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                          <span className="text-gray-400 text-xs font-bold">{(u.username || 'U').charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <span className="font-semibold text-white truncate flex items-center gap-1">
                      {u.username}
                      {u.verified && (<svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>)}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-2 text-right font-mono text-gray-200">{(u.totalScripts||0).toLocaleString()}</div>
                  <div className="col-span-2 sm:col-span-2 text-right font-mono text-gray-200">{(u.totalViews||0).toLocaleString()}</div>
                </a>
              );
            })}
          </div>
        </div>
        <div className="mt-8 flex items-center justify-center text-xs text-gray-500">
          Showing top {leaders.length} users by total views
        </div>
      </main>
    </div>
  );
}
