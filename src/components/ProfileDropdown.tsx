"use client";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from 'next/link';
import { useAuth } from "../context/AuthContext";

const DEFAULT_AVATAR = '/default.png';

interface ProfileDropdownProps {
  mobileMenuOpen?: boolean;
  onProfileOpen?: (open: boolean) => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ mobileMenuOpen, onProfileOpen }) => {
  const { isLoggedIn, userInfo, isAuthLoading, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const WRAP_CLASS = "flex items-center justify-end";

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isLoggedIn || !userInfo) {
      setIsAdmin(false);
      return;
    }

    const hasAdminStatus = false;

    if (hasAdminStatus) {
      setIsAdmin(true);
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('isAdmin', 'true');
      }
    } else {
      if (typeof sessionStorage !== 'undefined') {
        const sessionAdmin = sessionStorage.getItem('isAdmin');
        if (sessionAdmin === 'true') {
          setIsAdmin(true);
          return;
        }
      }

      checkAdminStatusWithAPI();
    }
  }, [isLoggedIn, userInfo]);

  const checkAdminStatusWithAPI = async () => {
    try {

      let jwtToken: string | null = null;

      const tokenCookie = document.cookie.split(';').find(row => row.trim().startsWith('token='));
              if (tokenCookie) {
          jwtToken = tokenCookie.split('=')[1];

          try {
            const base64Url = jwtToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const payload = JSON.parse(jsonPayload);
            const now = Math.floor(Date.now() / 1000);

            if (payload.exp < now) {
              document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
              jwtToken = null;

              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }
          } catch (error) {
            document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            jwtToken = null;
          }
        }

      if (!jwtToken && typeof sessionStorage !== 'undefined') {
        jwtToken = sessionStorage.getItem('token') || sessionStorage.getItem('authToken') || sessionStorage.getItem('jwt');
      }

      if (!jwtToken && typeof localStorage !== 'undefined') {
        jwtToken = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('jwt');
      }

      const response = await fetch(`/api/admin/check-status`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        },
      });

      if (response.ok) {
        const data = await response.json();
        const adminStatus = !!data.isAdmin;
        setIsAdmin(adminStatus);

        if (adminStatus && typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('isAdmin', 'true');
        }
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    if (mobileMenuOpen && isOpen) setIsOpen(false);
  }, [mobileMenuOpen, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => { logout(); setIsOpen(false); };
  const rawAvatar = userInfo?.accountthumbnail?.trim() ? userInfo.accountthumbnail!.trim() : '';
  const hasAvatar = !!rawAvatar;

  if (!mounted) {
    return (
      <div className={WRAP_CLASS}>
        <div className="flex items-center space-x-2 ml-3">
          <div className="text-gray-300 px-3 py-2 rounded-md text-sm font-medium opacity-0">Login</div>
          <div className="text-gray-300 px-3 py-2 rounded-md text-sm font-medium opacity-0">Sign Up</div>
        </div>
      </div>
    );
  }

  return (
    <div className={WRAP_CLASS} suppressHydrationWarning>
      {isLoggedIn && (
        <div className="relative isolate z-50" ref={dropdownRef}>
          <button
            onClick={() => {
              if (!isLoggedIn) return;
              const next = !isOpen;
              setIsOpen(next);
              onProfileOpen?.(next);
            }}
            aria-label="Open profile menu"
            className="flex items-center justify-center w-10 h-10 aspect-square overflow-hidden focus:outline-none rounded-md border border-gray-600 hover:border-white transition-colors"
          >
            {hasAvatar ? (
              <img src={rawAvatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <img src={DEFAULT_AVATAR} alt="Default avatar" className="w-full h-full object-cover" />
            )}
          </button>
                               {isOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 z-[999999] isolate profile-dropdown" style={{ position: 'absolute', zIndex: 999999 }}>
              <div className="px-4 py-2 border-b border-gray-700">
                <p className="text-sm font-semibold text-white">{userInfo?.nickname || userInfo?.username}</p>
              </div>
              <a href={`/profile/${userInfo?.username}`} className="block px-4 py-3 text-sm text-gray-300 hover:bg-gray-700/50 transition-colors flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user-icon lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Profile
              </a>
              <a href="/account-settings" className="block px-4 py-3 text-sm text-gray-300 hover:bg-gray-700/50 transition-colors flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings-icon lucide-settings"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>
                Account Settings
              </a>

              {isAdmin && (
                <a href="/admin" className="block px-4 py-3 text-sm text-purple-300 hover:bg-gray-700/50 transition-colors flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-gavel-icon lucide-gavel"><path d="m14 13-8.381 8.38a1 1 0 0 1-3.001-3l8.384-8.381"/><path d="m16 16 6-6"/><path d="m21.5 10.5-8-8"/><path d="m8 8 6-6"/><path d="m8.5 7.5 8 8"/></svg>
                  Admin Dashboard
                </a>
              )}
              <button onClick={handleLogout} className="block w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-700/50 transition-colors flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out-icon lucide-log-out"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}

      {!isLoggedIn && (
        <div className="flex items-center space-x-2 ml-3">
          <a href="/login" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Login</a>
          <a href="/signup" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">Sign Up</a>
        </div>
      )}
    </div>
  );
};

const HomeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const BrowseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const RulesIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const PickaxeIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m14 13-8.381 8.38a1 1 0 0 1-3.001-3L11 9.999"/>
    <path d="M15.973 4.027A13 13 0 0 0 5.902 2.373c-1.398.342-1.092 2.158.277 2.601a19.9 19.9 0 0 1 5.822 3.024"/>
    <path d="M16.001 11.999a19.9 19.9 0 0 1 3.024 5.824c.444 1.369 2.26 1.676 2.603.278A13 13 0 0 0 20 8.069"/>
    <path d="M18.352 3.352a1.205 1.205 0 0 0-1.704 0l-5.296 5.296a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l5.296-5.296a1.205 1.205 0 0 0 0-1.704z"/>
  </svg>
);

const DiscordIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
  </svg>
);

const UploadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const DollarIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const NotificationBell = ({ onClick, hasUnread }: { onClick: () => void; hasUnread: boolean }) => (
  <button onClick={onClick} aria-label="Notifications" className="relative w-10 h-10 flex items-center justify-center rounded-md border border-gray-600 hover:border-white text-gray-300 hover:text-white transition-colors">
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
    {hasUnread && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
  </button>
);

export const Navbar = () => {
  const { isLoggedIn, userInfo } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; type: string; message: string; read?: boolean; date?: string }>>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const INITIAL_PAGE_SIZE = 4;
  const LOAD_MORE_PAGE_SIZE = 12;
  const [notifOffset, setNotifOffset] = useState(0);
  const [hasMoreNotifs, setHasMoreNotifs] = useState(true);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const notifRef = useRef<HTMLDivElement | null>(null);
  const mobileScrollRef = useRef<HTMLDivElement | null>(null);
  const desktopScrollRef = useRef<HTMLDivElement | null>(null);

  const hasUnread = notifications.some(n => !n.read);

  useEffect(() => {
    if (isLoggedIn && userInfo?.id && !notificationsLoaded) {
      loadNotifications(true);
    } else if (!isLoggedIn) {
      setNotifications([]);
      setNotificationsLoaded(false);
      setNotifOffset(0);
      setHasMoreNotifs(true);
    }
  }, [isLoggedIn, userInfo?.id, notificationsLoaded]);

  const loadNotifications = async (reset = false) => {
    if (loadingNotifs || !userInfo?.id) return;

    if (!reset) {
      setLoadingNotifs(true);
    }

    try {
      const nextOffset = reset ? 0 : notifOffset;
      const pageSize = reset ? INITIAL_PAGE_SIZE : LOAD_MORE_PAGE_SIZE;

      const res = await fetch(`/api/notifications?userId=${encodeURIComponent(userInfo.id)}&limit=${pageSize}&offset=${nextOffset}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];

        if (reset) {
          setNotifications(list);
          setNotificationsLoaded(true);
        } else {
          setNotifications(prev => {
            const seen = new Set(prev.map(n => String(n.id)));
            const merged: typeof prev = [...prev];
            for (const n of list) {
              if (!seen.has(String(n.id))) {
                merged.push(n);
              }
            }
            return merged;
          });
        }
        setNotifOffset(nextOffset + list.length);
        setHasMoreNotifs(list.length === pageSize);
      } else {
        if (reset) setNotifications([]);
        setHasMoreNotifs(false);
      }
    } catch (error) {
      if (reset) setNotifications([]);
      setHasMoreNotifs(false);
    } finally {
      if (!reset) {
        setLoadingNotifs(false);
      }
    }
  };

  const handleLoadMore = async (container?: HTMLDivElement | null) => {
    const el = container || mobileScrollRef.current || desktopScrollRef.current || null;
    if (!el) return;

    const prevScrollTop = el.scrollTop;
    const prevScrollHeight = el.scrollHeight;

    await loadNotifications(false);

    setTimeout(() => {
      if (el && el.scrollHeight !== prevScrollHeight) {
        const newScrollHeight = el.scrollHeight;
        const heightDifference = newScrollHeight - prevScrollHeight;
        el.scrollTop = prevScrollTop + heightDifference;
      }
    }, 50);
  };

  const toggleNotifications = () => {
    setNotifOpen(o => {
      const next = !o;
      if (!o && next) {
        if (!notificationsLoaded) {
          setNotifOffset(0);
          setHasMoreNotifs(true);
          loadNotifications(true);
        }
        markAllNotificationsAsRead();
      }
      return next;
    });
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(list => list.map(n => ({ ...n, read: true })));

    if (userInfo?.id) {
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: userInfo.id, markAllRead: true })
      }).catch(error => {
      });
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (notification.type === 'Comment' && notification.message.includes('|')) {
      const parts = notification.message.split('|');
      if (parts.length === 2) {
        const scriptId = parts[1];
        window.location.href = `/script/${scriptId}`;
        return;
      }
    }

    setNotifOpen(false);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInDays < 7) return `${diffInDays}d ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isActive = (href: string) => pathname === href;

  const handleShareScriptsClick = () => {
    if (isLoggedIn) router.push('/upload'); else router.push('/login');
  };

  const getUploadClasses = (active: boolean, block?: boolean) => {
    const parts = [block ? 'block' : '', active ? 'bg-white text-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white', 'px-3', 'py-2', 'rounded-md', 'text-sm', 'font-medium', 'whitespace-nowrap', 'flex', 'items-center', 'space-x-2'];
    return parts.filter(Boolean).join(' ');
  };

  const handleUploadClick: React.MouseEventHandler<HTMLAnchorElement | HTMLDivElement> = (e) => {
    if (!isActive('/upload')) {
      e.preventDefault();
      handleShareScriptsClick();
    } else {
      e.preventDefault();
    }
  };

  const getDisplayMessage = (notification: any) => {
    if (notification.type === 'Comment' && notification.message.includes('|')) {
      const parts = notification.message.split('|');
      return parts[0];
    }
    return notification.message;
  };

  return (
    <nav className="bg-gray-800 border-b border-gray-700 w-full sticky top-0 z-50 transform-gpu will-change-transform">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div className="flex items-center flex-shrink-0">
            <span className="text-xl lg:text-2xl font-bold text-white whitespace-nowrap">ScriptVoid</span>
          </div>

          <div className="flex xl:hidden items-center gap-2 ml-auto">
            <ProfileDropdown mobileMenuOpen={isMobileMenuOpen} onProfileOpen={(open)=>{ if(open) setIsMobileMenuOpen(false); }} />
            {isLoggedIn && (
              <div className="relative isolate z-50" ref={notifRef}>
                <NotificationBell onClick={toggleNotifications} hasUnread={hasUnread} />
                                 {notifOpen && (
                   <div className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-xl border border-gray-700 shadow-2xl z-[999999] overflow-hidden isolate notification-dropdown">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
                      <span className="text-sm font-semibold text-white">Notifications</span>
                      <button onClick={()=>setNotifOpen(false)} className="text-xs text-gray-400 hover:text-gray-200">Close</button>
                    </div>
                    <div ref={mobileScrollRef} className="max-h-48 overflow-y-auto custom-scroll scroll-smooth relative">
                      {loadingNotifs && notifOffset > 0 && (
                        <div className="loading-bar" />
                      )}
                      {!loadingNotifs && notifications.length === 0 && <div className="p-6 text-xs text-gray-400 text-center">No messages</div>}
                      {!loadingNotifs && notifications.length > 0 && (
                        <ul className="divide-y divide-gray-700 text-sm">
                          {notifications.map(n => (
                            <li key={n.id} className="p-3 hover:bg-gray-700/40 transition-colors cursor-pointer" onClick={() => handleNotificationClick(n)}>
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 uppercase tracking-wide">{n.type || 'Info'}</span>
                                  </div>
                                  <p className="text-gray-200 text-xs leading-snug whitespace-pre-wrap break-words">{getDisplayMessage(n)}</p>
                                  {n.date && <p className="text-[10px] text-gray-500 mt-1">{formatDate(n.date)}</p>}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                      {hasMoreNotifs && notifications.length > 0 && (
                        <div className="p-2 text-center">
                          <button onClick={()=>handleLoadMore(mobileScrollRef.current)} disabled={loadingNotifs} className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-xs text-gray-200">{loadingNotifs ? 'Loading…' : 'Load more'}</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(o=>!o)}
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
              className="p-2 rounded-md text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40 border border-gray-600 hover:border-white"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          <div className="hidden xl:flex items-center justify-center flex-1 mx-8">
            <div className="flex items-center space-x-8">
              <div className="flex items-baseline space-x-4">
                <Link href="/home" className={`${isActive('/home') ? 'bg-white text-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap flex items-center space-x-2`} onClick={e => {if(isActive('/home')) e.preventDefault();}}>
                  <HomeIcon />
                  <span>Home</span>
                </Link>
                <Link href="/browse" className={`${isActive('/browse') ? 'bg-white text-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap flex items-center space-x-2`} onClick={e => {if(isActive('/browse')) e.preventDefault();}}>
                  <BrowseIcon />
                  <span>Trending</span>
                </Link>
                <Link href="/rules" className={`${isActive('/rules') ? 'bg-white text-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap flex items-center space-x-2`} onClick={e => {if(isActive('/rules')) e.preventDefault();}}>
                  <RulesIcon />
                  <span>Rules</span>
                </Link>
                <Link href="/creator" className={`${isActive('/creator') ? 'bg-white text-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap flex items-center space-x-2`} onClick={e => {if(isActive('/creator')) e.preventDefault();}}>
                  <PickaxeIcon />
                  <span>Creator</span>
                </Link>
                <Link href="/promote" className={`${isActive('/promote') ? 'bg-white text-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap flex items-center space-x-2`} onClick={e => {if(isActive('/promote')) e.preventDefault();}}>
                  <DollarIcon />
                  <span>Promote</span>
                </Link>
                <Link href="/upload" className={`${isActive('/upload') ? 'bg-white text-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap flex items-center space-x-2`} onClick={e => {if(isActive('/upload')) e.preventDefault();}}>
                  <UploadIcon />
                  <span>Upload</span>
                </Link>
                <a href="https://discord.gg/3WwQsq78mE" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap flex items-center space-x-2">
                  <DiscordIcon />
                  <span>Discord</span>
                </a>
              </div>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-2 ml-auto">
                         {isLoggedIn && (
               <div className="relative isolate z-50" ref={notifRef}>
                <NotificationBell onClick={toggleNotifications} hasUnread={hasUnread} />
                                 {notifOpen && (
                   <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-xl border border-gray-700 shadow-2xl z-[999999] overflow-hidden isolate notification-dropdown">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
                      <span className="text-sm font-semibold text-white">Notifications</span>
                      <div className="flex items-center gap-2">
                        <button onClick={()=>setNotifOpen(false)} className="text-xs text-gray-400 hover:text-gray-200">Close</button>
                      </div>
                    </div>
                    <div ref={desktopScrollRef} className="max-h-48 overflow-y-auto custom-scroll scroll-smooth relative">
                      {loadingNotifs && notifOffset > 0 && (
                        <div className="loading-bar" />
                      )}
                      {!loadingNotifs && notifications.length === 0 && <div className="p-6 text-xs text-gray-400 text-center">No messages</div>}
                      {!loadingNotifs && notifications.length > 0 && (
                        <ul className="divide-y divide-gray-700 text-sm">
                          {notifications.map(n => (
                            <li key={n.id} className="p-3 hover:bg-gray-700/40 transition-colors cursor-pointer" onClick={() => handleNotificationClick(n)}>
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 uppercase tracking-wide">{n.type || 'Info'}</span>
                                  </div>
                                  <p className="text-gray-200 text-xs leading-snug whitespace-pre-wrap break-words">{getDisplayMessage(n)}</p>
                                  {n.date && <p className="text-[10px] text-gray-500 mt-1">{formatDate(n.date)}</p>}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                      {hasMoreNotifs && notifications.length > 0 && (
                        <div className="p-2 text-center">
                          <button onClick={()=>handleLoadMore(desktopScrollRef.current)} disabled={loadingNotifs} className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-xs text-gray-200">{loadingNotifs ? 'Loading…' : 'Load more'}</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <ProfileDropdown />
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="xl:hidden border-t border-gray-700 pb-2">
            <div className="px-4 pt-3 space-y-2">
              <Link href="/home" className={`block ${isActive('/home') ? 'bg-white text-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2`} onClick={e=>{if(isActive('/home')) e.preventDefault(); else setIsMobileMenuOpen(false);}}>
                <HomeIcon /> Home
              </Link>
              <Link href="/browse" className={`block ${isActive('/browse') ? 'bg-white text-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2`} onClick={e=>{if(isActive('/browse')) e.preventDefault(); else setIsMobileMenuOpen(false);}}>
                <BrowseIcon /> Trending
              </Link>
              <Link href="/rules" className={`block ${isActive('/rules') ? 'bg-white text-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2`} onClick={e=>{if(isActive('/rules')) e.preventDefault(); else setIsMobileMenuOpen(false);}}>
                <RulesIcon /> Rules
              </Link>
              <Link href="/creator" className={`block ${isActive('/creator') ? 'bg-white text-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2`} onClick={e=>{if(isActive('/creator')) e.preventDefault(); else setIsMobileMenuOpen(false);}}>
                <PickaxeIcon /> Creator
              </Link>
              <Link href="/promote" className={`block ${isActive('/promote') ? 'bg-white text-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2`} onClick={e=>{if(isActive('/promote')) e.preventDefault(); else setIsMobileMenuOpen(false);}}>
                <DollarIcon /> Promote
              </Link>
              <a href="https://discord.gg/3WwQsq78mE" target="_blank" rel="noopener noreferrer" className="block text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                <DiscordIcon /> Discord
              </a>
              <Link href="/upload" className={`block ${isActive('/upload') ? 'bg-white text-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2`} onClick={e=>{if(!isActive('/upload')) { e.preventDefault(); handleUploadClick(e as any); setIsMobileMenuOpen(false);} else e.preventDefault();}}>
                <UploadIcon /> Upload
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default ProfileDropdown;