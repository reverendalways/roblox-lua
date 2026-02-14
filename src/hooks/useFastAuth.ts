import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const useFastAuth = () => {
  const { isLoggedIn, userInfo } = useAuth();
  const [isReady, setIsReady] = useState(false);

  const isAuthenticatedFast = isLoggedIn === true;
  const isNotAuthenticatedFast = isLoggedIn === false;
  const needsAuthCheck = isLoggedIn === null;

  const fastRedirect = useCallback((redirectTo: string) => {
    if (isNotAuthenticatedFast) {
      window.location.href = redirectTo;
      return true;
    }
    return false;
  }, [isNotAuthenticatedFast]);

  const requireAuth = useCallback(() => {
    if (isNotAuthenticatedFast) {
      return false;
    }
    return isAuthenticatedFast;
  }, [isAuthenticatedFast, isNotAuthenticatedFast]);

  const hasUser = useCallback(() => {
    return isAuthenticatedFast && !!userInfo;
  }, [isAuthenticatedFast, userInfo]);

  const getUsername = useCallback(() => {
    return isAuthenticatedFast ? userInfo?.username : null;
  }, [isAuthenticatedFast, userInfo]);

  useEffect(() => {
    if (isLoggedIn !== null) {
      setIsReady(true);
    }
  }, [isLoggedIn]);

  return {
    isAuthenticatedFast,
    isNotAuthenticatedFast,
    needsAuthCheck,
    isReady,
    
    isLoggedIn,
    userInfo,
    
    fastRedirect,
    requireAuth,
    hasUser,
    getUsername
  };
};

export const useProtectedRoute = (redirectTo: string = '/login') => {
  const { isLoggedIn } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (isLoggedIn === false) {
      setShouldRedirect(true);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (shouldRedirect) {
      window.location.href = redirectTo;
    }
  }, [shouldRedirect, redirectTo]);

  return {
    isProtected: isLoggedIn === true,
    shouldRedirect,
    isAuthenticated: isLoggedIn,
    isLoggedIn
  };
};

export const useAuthCondition = (condition: 'authenticated' | 'unauthenticated' | 'loading') => {
  const { isLoggedIn, isAuthLoading } = useAuth();

  switch (condition) {
    case 'authenticated':
      return isLoggedIn === true;
    case 'unauthenticated':
      return isLoggedIn === false;
    case 'loading':
      return isAuthLoading || isLoggedIn === null;
    default:
      return false;
  }
};





