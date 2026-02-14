"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Turnstile from "../../components/Turnstile";

const HamburgerIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
    <path d="m2 2 20 20" />
  </svg>
);

export default function SignUp() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { isLoggedIn, userInfo, isAuthLoading, logout, refreshUser } = useAuth();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/userinfo", { method: "GET", credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data && data.username) {
            router.push("/home");
            return;
          }
        }
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
      } catch {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
      }
    };
    checkAuth();
  }, [router]);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [turnstileError, setTurnstileError] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (e.target.name === 'username') {
      value = value.replace(/[^A-Za-z0-9_]/g, '');
    }

    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setTurnstileError("");

    if (!turnstileToken) {
      setTurnstileError("Please complete the security verification");
      setIsLoading(false);
      return;
    }

    if (!termsAccepted) {
      setError("You must accept the Site Rules to create an account");
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    if (formData.username.includes(' ')) {
      setError("Username cannot contain spaces. Use only letters, numbers, and underscores.");
      setIsLoading(false);
      return;
    }

    if (!/^[A-Za-z0-9_]+$/.test(formData.username)) {
      setError("Username can only contain letters, numbers, and underscores.");
      setIsLoading(false);
      return;
    }

    if (formData.username.length < 3) {
      setError("Username must be at least 3 characters long.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          turnstileToken: turnstileToken
        })
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Registration failed. Please try again.');
        setIsLoading(false);
        return;
      }

      if (result.user) {
        const userInfo = {
          id: result.user.id || '',
          username: result.user.username,
          nickname: result.user.username,
          accountthumbnail: result.user.accountthumbnail || '',
          bio: result.user.bio || '',
          email: result.user.email,
          verified: result.user.verified || false,
          accountStatus: 'all_good'
        };

        sessionStorage.setItem("authSession", JSON.stringify({
          isLoggedIn: true,
          userInfo: userInfo
        }));
      }

      window.location.href = '/home';
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">

      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">ScriptVoid</h1>
          <p className="text-gray-300">Create your account</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-900/40 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-200 mb-2">
                Username
              </label>
                              <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  maxLength={16}
                  value={formData.username}
                  onChange={handleChange}
                  className={`w-full px-3 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-white/40 transition-all duration-200 ${
                    formData.username && !/^[A-Za-z0-9_]+$/.test(formData.username)
                      ? 'border-red-500 focus:border-red-400 focus:ring-red-400'
                      : 'border-gray-600 focus:border-white'
                  }`}
                  placeholder="Enter your username"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Only letters, numbers, and underscores allowed. No spaces.
                </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/40 transition-all duration-200"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  maxLength={80}
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 py-3 pr-10 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/40 transition-all duration-200"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 mb-2">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  maxLength={80}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-3 py-3 pr-10 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/40 transition-all duration-200"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-200"
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
              className="h-4 w-4 text-white bg-gray-800 border-gray-600 rounded focus:ring-white focus:ring-1"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-300">
              I confirm that I have read and accept the{' '}
              <a href="/rules" className="text-white hover:text-gray-200 transition-colors underline">
                Site Rules
              </a>
              , and I agree to follow them.
            </label>
          </div>

          <div>
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
              onVerify={(token) => {
                setTurnstileToken(token);
                setTurnstileError('');
              }}
              onError={() => {
                setTurnstileError('Security verification failed. Please try again.');
                setTurnstileToken('');
              }}
              onExpire={() => {
                setTurnstileError('Security verification expired. Please verify again.');
                setTurnstileToken('');
              }}
              theme="dark"
              size="normal"
            />
            {turnstileError && (
              <div className="mt-2 text-sm text-red-400 text-center">
                {turnstileError}
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !turnstileToken}
              className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-900 bg-white hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Create account'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-gray-300 text-sm">
              Already have an account?{' '}
              <a href="/login" className="text-white hover:text-gray-200 font-medium transition-colors">
                Sign in
              </a>
            </p>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}