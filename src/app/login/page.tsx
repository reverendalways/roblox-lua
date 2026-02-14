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

export default function Login() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { isLoggedIn, userInfo, isAuthLoading, logout, refreshUser } = useAuth();

  useEffect(() => {
    if (isLoggedIn) {
      router.push("/home");
    }
  }, [isLoggedIn, router]);

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [loginStep, setLoginStep] = useState<'credentials' | 'verification'>('credentials');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [userId, setUserId] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(8);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [canResend, setCanResend] = useState(true);

  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [turnstileError, setTurnstileError] = useState<string>('');
  const [turnstileAttempts, setTurnstileAttempts] = useState<number>(8);
  const [turnstileKey, setTurnstileKey] = useState<number>(0);

  const [forgotStep, setForgotStep] = useState<'email'|'code'|'reset'|null>(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotVerified, setForgotVerified] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
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

    try {
      const response = await fetch('/api/auth/email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          turnstileToken: turnstileToken
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError(result.error || 'Please wait before requesting another code.');
          if (result.cooldownRemaining) {
            setResendCooldown(result.cooldownRemaining);
            setCanResend(false);
            const interval = setInterval(() => {
              setResendCooldown(prev => {
                if (prev <= 1) {
                  setCanResend(true);
                  clearInterval(interval);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }
        } else {
          if (result.requiresReload) {
            setError(result.error || 'Too many failed attempts. Please reload the page and try again.');
            setTurnstileAttempts(0);
            setTurnstileToken('');
            setTurnstileKey(prev => prev + 1);
          } else {
            setError(result.error || 'Security verification failed. Please try again.');
            if (result.attemptsRemaining !== undefined) {
              setTurnstileAttempts(result.attemptsRemaining);
            }
            setTurnstileToken('');
            setTurnstileKey(prev => prev + 1);
          }
        }
        setIsLoading(false);
        return;
      }

      setUserId(result.userId);

      setAttemptsRemaining(8);
      setResendCooldown(60);
      setCanResend(false);

      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setLoginStep('verification');
      setVerificationMessage('Verification code sent to your email. Please check your inbox.');

    } catch (err) {
      setError('Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationLoading(true);
    setError("");

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          code: verificationCode
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429 && result.attemptsExceeded) {
          setError(result.error);
          setLoginStep('credentials');
          setVerificationCode('');
          setVerificationMessage('');
          setAttemptsRemaining(8);
        } else {
          setError(result.error || 'Invalid verification code. Please try again.');
          if (result.attemptsRemaining !== undefined) {
            setAttemptsRemaining(result.attemptsRemaining);
          }
        }
        setVerificationLoading(false);
        return;
      }

      localStorage.setItem('token', result.token);
      sessionStorage.setItem('token', result.token);

      if (result.user) {
        const userInfo = {
          id: result.user.id,
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
      setError('Verification failed. Please try again.');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setLoginStep('credentials');
    setVerificationCode('');
    setVerificationMessage('');
    setError('');
    setTurnstileToken('');
    setTurnstileError('');
    setTurnstileAttempts(8);
    setTurnstileKey(prev => prev + 1);
  };

  const handleResendCode = async () => {
    if (!canResend) return;

    setVerificationLoading(true);
    try {
      const response = await fetch('/api/auth/email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      if (response.ok) {
        setVerificationMessage('New verification code sent to your email.');
        setAttemptsRemaining(8);
        setResendCooldown(60);
        setCanResend(false);

        const interval = setInterval(() => {
          setResendCooldown(prev => {
            if (prev <= 1) {
              setCanResend(true);
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        const result = await response.json();
        if (response.status === 429) {
          setError(result.error);
          if (result.cooldownRemaining) {
            setResendCooldown(result.cooldownRemaining);
            setCanResend(false);
            const interval = setInterval(() => {
              setResendCooldown(prev => {
                if (prev <= 1) {
                  setCanResend(true);
                  clearInterval(interval);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }
        } else {
          setError(result.error || 'Failed to resend code. Please try again.');
        }
      }
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleForgotRequest = async () => {
    setForgotLoading(true); setForgotMsg('');
    try {
      const res = await fetch('/api/auth/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      await res.json();
      setForgotStep('code');
      setForgotMsg('Code sent. Check your inbox.');
    } catch { setForgotMsg('Network error'); } finally { setForgotLoading(false); }
  };
  const handleForgotVerify = async () => {
    setForgotLoading(true); setForgotMsg('');
    try {
      setForgotVerified(true);
      setForgotStep('reset');
      setForgotMsg('Code verified. Enter new password.');
    } catch { setForgotMsg('Network error'); } finally { setForgotLoading(false); }
  };
  const handleForgotReset = async () => {
    setForgotLoading(true); setForgotMsg('');
    try {
      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, code: forgotCode, newPassword: forgotNewPassword })
      });
      const data = await res.json();
      if (!res.ok) { setForgotMsg(data.error||'Reset failed'); }
      else {
        setForgotStep(null);
        setForgotEmail(''); setForgotCode(''); setForgNewPassword(''); setForgotVerified(false);
        setTimeout(() => setForgotMsg(''), 6000);
        setForgotMsg('Password reset! You can now log in.');
      }
    } catch { setForgotMsg('Network error'); } finally { setForgotLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">

      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">

            <h1 className="text-4xl font-bold text-white mb-2">ScriptVoid</h1>
            <p className="text-gray-300">Welcome back. Sign in to continue.</p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-900/40 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {forgotStep && (
              <div className="space-y-6 bg-gray-800/80 p-6 rounded-xl border border-gray-700">
                {forgotStep === 'email' && (
                  <>
                    <h2 className="text-lg font-semibold mb-2">Forgot Password</h2>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e=>setForgotEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-3 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/40"
                      disabled={forgotLoading}
                    />
                    <button type="button" onClick={handleForgotRequest} disabled={forgotLoading || !forgotEmail.includes('@')} className="w-full bg-white hover:bg-gray-200 text-black px-5 py-2.5 rounded-lg font-semibold transition-colors disabled:bg-gray-700 disabled:text-gray-400">Request Code</button>
                  </>
                )}
                {forgotStep === 'code' && (
                  <>
                    <h2 className="text-lg font-semibold mb-2">Enter Code</h2>
                    <input
                      type="text"
                      value={forgotCode}
                      onChange={e=>setForgotCode(e.target.value)}
                      placeholder="16-digit code"
                      className="w-full px-3 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/40"
                      disabled={forgotLoading}
                    />
                    <button type="button" onClick={handleForgotVerify} disabled={forgotLoading || forgotCode.length < 8} className="w-full bg-white hover:bg-gray-200 text-black px-5 py-2.5 rounded-lg font-semibold transition-colors disabled:bg-gray-700 disabled:text-gray-400">Verify Code</button>
                  </>
                )}
                {forgotStep === 'reset' && (
                  <>
                    <h2 className="text-lg font-semibold mb-2">Set New Password</h2>
                    <input
                      type="password"
                      value={forgotNewPassword}
                      onChange={e=>setForgNewPassword(e.target.value)}
                      placeholder="New password (min 6 chars)"
                      className="w-full px-3 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/40"
                      disabled={forgotLoading}
                    />
                    <button type="button" onClick={handleForgotReset} disabled={forgotLoading || !forgotVerified || forgotNewPassword.length < 6} className="w-full bg-white hover:bg-gray-200 text-black px-5 py-2.5 rounded-lg font-semibold transition-colors disabled:bg-gray-700 disabled:text-gray-400">Reset Password</button>
                  </>
                )}
                <button type="button" onClick={()=>{ setForgotStep(null); setForgotMsg(''); }} className="w-full mt-2 text-xs text-gray-400 hover:text-white">Back to login</button>
                {forgotMsg && <div className="text-xs text-gray-300 text-center mt-2">{forgotMsg}</div>}
              </div>
            )}

            {!forgotStep && forgotMsg && (
              <div className="bg-green-900/40 border border-green-500 text-green-200 px-4 py-3 rounded-lg text-sm text-center">{forgotMsg}</div>
            )}

            {!forgotStep && (
              <>
                {loginStep === 'credentials' ? (
                  <>
                    <div className="space-y-4">
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
                            autoComplete="current-password"
                            required
                            maxLength={80}
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full px-3 py-3 pr-10 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/40 transition-all duration-200"
                            placeholder="Enter your password"
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
                    </div>

                    <div>
                      <Turnstile
                        key={turnstileKey}
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
                      {turnstileAttempts < 8 && turnstileAttempts > 0 && (
                        <div className="mt-2 text-sm text-yellow-400 text-center">
                          Security verification attempts remaining: {turnstileAttempts}
                        </div>
                      )}
                      {turnstileAttempts === 0 && (
                        <div className="mt-2 text-sm text-red-400 text-center">
                          Too many failed attempts. Please reload the page to try again.
                        </div>
                      )}
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={isLoading || !turnstileToken || turnstileAttempts === 0}
                        className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-900 bg-white hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          'Login'
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div className="text-center">
                        <h2 className="text-lg font-semibold text-white mb-2">Enter Verification Code</h2>
                        <p className="text-gray-300 text-sm mb-4">
                          We've sent an 8-digit verification code to <span className="text-white font-medium">{formData.email}</span>
                        </p>
                        {verificationMessage && (
                          <div className="bg-blue-900/40 border border-blue-500 text-blue-200 px-4 py-3 rounded-lg text-sm mb-4">
                            {verificationMessage}
                          </div>
                        )}
                        <div className="bg-yellow-900/40 border border-yellow-500 text-yellow-200 px-4 py-3 rounded-lg text-sm mb-4">
                          <strong>Attempts remaining: {attemptsRemaining}/8</strong>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-200 mb-2">
                          Verification Code
                        </label>
                        <input
                          id="verificationCode"
                          name="verificationCode"
                          type="text"
                          autoComplete="one-time-code"
                          required
                          maxLength={8}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && verificationCode.length === 8 && !verificationLoading) {
                              e.preventDefault();
                              handleVerificationSubmit(e);
                            }
                          }}
                          autoFocus
                          className={`w-full px-3 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-white/40 transition-all duration-200 text-center text-lg tracking-widest ${
                            verificationCode.length === 8
                              ? 'border-green-500 focus:border-green-400 focus:ring-green-400/40'
                              : 'border-gray-600 focus:border-white'
                          }`}
                          placeholder="00000000"
                        />
                        {verificationCode.length === 8 && !verificationLoading && (
                          <div className="text-xs text-gray-400 text-center mt-1 flex items-center justify-center gap-1">
                            <span>✓</span> Press Enter to submit
                          </div>
                        )}
                        {verificationCode.length > 0 && verificationCode.length < 8 && (
                          <div className="text-xs text-gray-500 text-center mt-1">
                            {8 - verificationCode.length} digits remaining
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={handleVerificationSubmit}
                        disabled={verificationLoading || verificationCode.length !== 8}
                        className={`group relative w-full flex justify-center py-3 px-4 border text-sm font-medium rounded-lg transition-all duration-200 ${
                          verificationCode.length === 8 && !verificationLoading
                            ? 'border-green-500 bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900'
                            : 'border-gray-300 text-gray-900 bg-white hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                      >
                        {verificationLoading ? (
                          <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          verificationCode.length === 8 ? '✓ Verify & Sign In' : 'Verify & Sign In'
                        )}
                      </button>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleBackToCredentials}
                          className="flex-1 py-2 px-4 border border-gray-600 text-sm font-medium rounded-lg text-gray-300 hover:text-white hover:border-gray-500 transition-all duration-200"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handleResendCode}
                          disabled={verificationLoading || !canResend}
                          className="flex-1 py-2 px-4 border border-gray-600 text-sm font-medium rounded-lg text-gray-300 hover:text-white hover:border-gray-500 transition-all duration-200 disabled:opacity-50"
                        >
                          {canResend ? 'Resend Code' : `Resend in ${resendCooldown}s`}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div className="text-center space-y-3">
                  <p className="text-gray-300 text-sm">
                    Don't have an account?{' '}
                    <a href="/signup" className="text-white hover:text-gray-200 font-medium transition-colors">
                      Sign up
                    </a>
                  </p>
                  <button type="button" className="text-xs text-gray-400 hover:text-white transition-colors" onClick={()=>{ setForgotStep('email'); setForgotMsg(''); }}>
                    Forgot password?
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}