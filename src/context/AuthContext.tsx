"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface UserInfo {
  id: string;
  username: string;
  nickname?: string;
  accountthumbnail?: string;
  bio?: string;
  email?: string;
  isTimeouted?: boolean;
  timeoutEnd?: string | null;
  timeoutReason?: string | null;
  timeoutAt?: string | null;
  timeoutDuration?: number | null;
  timeoutDurationUnit?: string | null;
  verified?: boolean;
  accountStatus?: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  userInfo: UserInfo | null;
  isAuthLoading: boolean;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setAvatar: (data: string) => void;
  setBio: (bio: string) => void;
}

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  userInfo: null,
  isAuthLoading: true,
  logout: () => {},
  refreshUser: async () => {},
  setAvatar: () => {},
  setBio: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const clearTokenFromStorage = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('authSession');
    }
  };

  const saveTokenToStorage = (token: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('token', token);
    }
  };

  const refreshUserWithToken = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/userinfo', {
        method: 'GET',
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.username) {
          const user = {
            id: data.id || '',
            username: data.username,
            nickname: data.nickname || '',
            accountthumbnail: data.accountthumbnail || '',
            bio: data.bio || '',
            email: data.email || '',
            isTimeouted: data.isTimeouted || false,
            timeoutEnd: data.timeoutEnd || null,
            timeoutReason: data.timeoutReason || null,
            timeoutAt: data.timeoutAt || null,
            timeoutDuration: data.timeoutDuration || null,
            timeoutDurationUnit: data.timeoutDurationUnit || null,
            verified: data.verified || false,
            accountStatus: data.accountStatus || 'all_good'
          };
          setIsLoggedIn(true);
          setUserInfo(user);

          if (typeof window !== 'undefined') {
            sessionStorage.setItem("authSession", JSON.stringify({
              isLoggedIn: true,
              userInfo: user
            }));
          }
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error refreshing user:', error);
      return false;
    }
  };

  const refreshUser = async () => {
    setIsAuthLoading(true);
    try {
      const session = sessionStorage.getItem("authSession");

      if (session) {
        try {
          const parsed = JSON.parse(session);
          if (parsed.isLoggedIn && parsed.userInfo) {
            setIsLoggedIn(true);
            setUserInfo(parsed.userInfo);
            setIsAuthLoading(false);
            return;
          }
        } catch (error) {
        }
      }

      const validated = await refreshUserWithToken();

      if (validated) {
        setIsAuthLoading(false);
        return;
      }

      setIsLoggedIn(false);
      setUserInfo(null);
      clearTokenFromStorage();
      if (typeof window !== 'undefined') {
        sessionStorage.setItem("authSession", JSON.stringify({
          isLoggedIn: false,
          userInfo: null
        }));
      }
    } catch (error) {
      setIsLoggedIn(false);
      setUserInfo(null);
      clearTokenFromStorage();
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    setIsLoggedIn(false);
    setUserInfo(null);
    clearTokenFromStorage();
    window.location.href = '/home';
  };

  const setAvatar = (data: string) => {
    setUserInfo(prev => {
      if (!prev) return prev;
      const updated = { ...prev, accountthumbnail: data };
      if (typeof window !== 'undefined') {
        sessionStorage.setItem("authSession", JSON.stringify({ isLoggedIn: true, userInfo: updated }));
      }
      return updated;
    });
  };

  const setBio = (bio: string) => {
    setUserInfo(prev => {
      if (!prev) return prev;
      const updated = { ...prev, bio };
      if (typeof window !== 'undefined') {
        sessionStorage.setItem("authSession", JSON.stringify({ isLoggedIn: true, userInfo: updated }));
      }
      return updated;
    });
  };

  useEffect(() => {
    const session = sessionStorage.getItem("authSession");

    if (session) {
      try {
        const parsed = JSON.parse(session);
        if (parsed.isLoggedIn && parsed.userInfo) {
          setIsLoggedIn(true);
          setUserInfo(parsed.userInfo);
          setIsAuthLoading(false);

          refreshUserWithToken().then(valid => {
            if (!valid) {
              setIsLoggedIn(false);
              setUserInfo(null);
              clearTokenFromStorage();
            }
          });
          return;
        }
      } catch (error) {
      }
    }

    refreshUser();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/auth/userinfo', {
          method: 'GET',
          credentials: 'include',
        });

        if (!res.ok) {
          clearTokenFromStorage();
          setIsLoggedIn(false);
          setUserInfo(null);
        }
      } catch (error) {
        clearTokenFromStorage();
        setIsLoggedIn(false);
        setUserInfo(null);
      }
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  return (
    <AuthContext.Provider value={{ isLoggedIn, userInfo, isAuthLoading, logout, refreshUser, setAvatar, setBio }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
