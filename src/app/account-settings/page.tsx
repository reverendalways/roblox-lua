"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAuth } from "../../context/AuthContext";

const DEFAULT_AVATAR = '/default.png';

export default function AccountSettingsPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [lastChangeOverride, setLastChangeOverride] = useState<Date | null>(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmationCode, setDeleteConfirmationCode] = useState("");
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");
  const [deleteAccountSuccess, setDeleteAccountSuccess] = useState("");

  const { isLoggedIn, userInfo, isAuthLoading, logout, refreshUser, setAvatar, setBio: setCtxBio } = useAuth();
  const isVerified = (userInfo as any)?.verified === true;

  useEffect(() => {
    if (userInfo) {

    }
  }, [userInfo, isVerified]);

  useEffect(() => { if ((userInfo as any)?.email) setEmail((userInfo as any).email); }, [userInfo]);

  const getSafeAvatarUrl = (thumbnail: string | undefined) => {
    if (!thumbnail || thumbnail.trim() === '') {
      return DEFAULT_AVATAR;
    }

    if (thumbnail.includes('<') || thumbnail.includes('>')) {
      console.warn('Blocked malicious thumbnail content:', thumbnail);
      return DEFAULT_AVATAR;
    }

    if (thumbnail.startsWith('data:image/') ||
        thumbnail.startsWith('http://') ||
        thumbnail.startsWith('https://')) {
      return thumbnail;
    }

    return DEFAULT_AVATAR;
  };

  const initialAvatar = getSafeAvatarUrl(userInfo?.accountthumbnail);
  const [avatarStable, setAvatarStable] = useState<string>(initialAvatar);
  useEffect(() => {
    if (userInfo?.accountthumbnail && userInfo.accountthumbnail.trim() !== '' && userInfo.accountthumbnail !== avatarStable) {
      setAvatarStable(userInfo.accountthumbnail);
    } else if (userInfo && (!userInfo.accountthumbnail || userInfo.accountthumbnail.trim() === '') && avatarStable !== DEFAULT_AVATAR) {
      setAvatarStable(DEFAULT_AVATAR);
    }
  }, [userInfo?.accountthumbnail]);
  const currentAvatar = imagePreview || avatarStable;

  const handleUploadAvatar = async () => {
    if (!imagePreview) return;
    try {
      const res = await fetch('/api/account/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ imageBase64: imagePreview })
      });
      if (!res.ok) {
        alert('Upload failed');
        return;
      }
      setAvatar(imagePreview);
      setAvatarStable(imagePreview);
      setImagePreview(null);
    } catch {
      alert('Upload error');
    }
  };

  const handleRemovePicture = async () => {
    try {
      const res = await fetch('/api/account/avatar', { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        alert('Failed to remove');
        return;
      }
      setImagePreview(null);
      setAvatar('');
      setAvatarStable(DEFAULT_AVATAR);
    } catch {
      alert('Remove error');
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!deleteConfirmationCode) {
      setDeleteAccountError("Please enter the confirmation code from your email");
      return;
    }

    setDeleteAccountLoading(true);
    setDeleteAccountError("");
    setDeleteAccountSuccess("");

    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ confirmationCode: deleteConfirmationCode })
      });

      if (res.ok) {
        setDeleteAccountSuccess("Account deleted successfully. You will be logged out.");
        setTimeout(() => {
          logout();
        }, 2000);
      } else {
        const data = await res.json();
        setDeleteAccountError(data.error || "Failed to delete account");
      }
    } catch (error) {
      setDeleteAccountError("Failed to delete account");
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  useEffect(() => {
    if (userInfo?.username && !username) setUsername(userInfo.username);
  }, [userInfo?.username]);

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const baseLastChangeRaw = (userInfo as any)?.lastUsernameChange || null;
  const baseLastChangeDate = baseLastChangeRaw ? new Date(baseLastChangeRaw) : null;
  const lastUsernameChangeDate = lastChangeOverride || baseLastChangeDate;
  const canChangeUsername = () => {
    if (!isLoggedIn) return false;
    if (!lastUsernameChangeDate) return true;
    return Date.now() - lastUsernameChangeDate.getTime() > SEVEN_DAYS_MS;
  };
  const nextAllowedDate = lastUsernameChangeDate ? new Date(lastUsernameChangeDate.getTime() + SEVEN_DAYS_MS) : null;

  const handleUsernameSave = async () => {
    if (!isLoggedIn) {
      alert("You must be logged in.");
      return;
    }
    if (!canChangeUsername()) {
      alert("You can only change your username once every 7 days.");
      return;
    }
    if (username.trim().length < 3) {
      alert("Username must be at least 3 characters long.");
      return;
    }
    if (username.includes(' ')) {
      alert("Username cannot contain spaces. Use only letters, numbers, and underscores.");
      return;
    }
    if (!/^[A-Za-z0-9_]+$/.test(username)) {
      alert("Username can only contain letters, numbers, and underscores.");
      return;
    }
    if (username === userInfo?.username) {
      alert("That is already your current username.");
      return;
    }
    try {
      const csrfRes = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include'
      });
      if (!csrfRes.ok) {
        alert('Failed to get security token');
        return;
      }
      const { csrfToken } = await csrfRes.json();

      const res = await fetch('/api/account/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newUsername: username.trim(), csrfToken })
      });
      if (!res.ok) {
        let errTxt: string | undefined;
        try {
          const data = await res.json();
          errTxt = data.error;
          if (data.nextAllowedAt) {
            const nextAt = new Date(data.nextAllowedAt);
            if (!isNaN(nextAt.getTime())) {
              setLastChangeOverride(new Date(nextAt.getTime() - SEVEN_DAYS_MS));
            }
          }
        } catch {
          errTxt = await res.text().catch(() => 'Failed to update username');
        }
        alert(errTxt || 'Failed to update username');
        return;
      }
      await refreshUser();
      setLastChangeOverride(null);
      alert('Username updated successfully');
    } catch (e) {
      alert('Error updating username');
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const [passwordStep, setPasswordStep] = useState<'edit'|'input'>('edit');
  const [passwordCode, setPasswordCode] = useState('');
  const [passwordCodeSentTo, setPasswordCodeSentTo] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');

  const requestPasswordCode = async () => {
    setPasswordLoading(true); setPasswordMsg('');
    try {
      const res = await fetch('/api/account/password/request', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include' });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) { setPasswordMsg(data.error||'Request failed'); }
      else {
        setPasswordCodeSentTo(data.sentTo || '');
        setPasswordStep('input');
        setPasswordMsg('Code sent. Check your inbox.');
      }
    } catch { setPasswordMsg('Network error'); } finally { setPasswordLoading(false); }
  };

  const handlePasswordChange = async () => {
    if (passwordCode.trim().length < 4) { setPasswordMsg('Enter code'); return; }
    if (newPassword !== confirmPassword) {
      setPasswordMsg("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg("Password must be at least 6 characters long.");
      return;
    }
    setPasswordLoading(true); setPasswordMsg('');
    try {
      const res = await fetch('/api/account/password/verify', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'include',
        body: JSON.stringify({ code: passwordCode.trim(), newPassword })
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) { setPasswordMsg(data.error||'Change failed'); }
      else {
        setPasswordMsg('Password changed successfully!');
        setPasswordCode(""); setNewPassword(""); setConfirmPassword("");
        setPasswordStep('edit');
      }
    } catch { setPasswordMsg('Network error'); } finally { setPasswordLoading(false); }
  };

  const [emailStep, setEmailStep] = useState<'edit'|'code'>('edit');
  const [pendingEmail, setPendingEmail] = useState('');
  const [codeSentTo, setCodeSentTo] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');

  const startEmailChange = async () => {
    if (!email.includes('@')) { alert('Invalid email'); return; }
    setEmailLoading(true); setEmailMsg('');
    try {
      const res = await fetch('/api/account/email/request', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ newEmail: email }) });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) { setEmailMsg(data.error||'Request failed'); }
      else {
        setPendingEmail(email);
        setCodeSentTo(data.sentTo || '');
        setEmailStep('code');
        setEmailMsg('Code sent. Check your inbox.');
      }
    } catch { setEmailMsg('Network error'); } finally { setEmailLoading(false); }
  };

  const verifyEmailCode = async () => {
    if (emailCode.trim().length < 4) { setEmailMsg('Enter code'); return; }
    setEmailLoading(true); setEmailMsg('');
    try {
      const res = await fetch('/api/account/email/verify', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ code: emailCode.trim() }) });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) { setEmailMsg(data.error||'Verify failed'); }
      else { setEmailMsg('Email updated'); setEmailStep('edit'); setEmailCode(''); setPendingEmail(''); refreshUser(); }
    } catch { setEmailMsg('Network error'); } finally { setEmailLoading(false); }
  };

  const [bio, setBio] = useState<string>('');
  const MAX_BIO_CHARS = 145;
  function trimToLimit(str: string) { return str.slice(0, MAX_BIO_CHARS); }
  useEffect(() => { if ((userInfo as any)?.bio !== undefined) setBio(trimToLimit((userInfo as any).bio || '')); }, [userInfo]);
  const savingBioRef = useRef(false as any);
  const handleSaveBio = async () => {
    if (!isLoggedIn) { alert('Login required'); return; }
    if (savingBioRef.current) return;
    const trimmed = trimToLimit(bio);
    if (trimmed.trim().length === 0) { alert('Bio cannot be empty'); return; }
    setBio(trimmed);
    savingBioRef.current = true;
    try {
      const csrfRes = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include'
      });
      if (!csrfRes.ok) {
        alert('Failed to get security token');
        return;
      }
      const { csrfToken } = await csrfRes.json();

      const res = await fetch('/api/account/bio', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        credentials:'include',
        body: JSON.stringify({ bio: trimmed, csrfToken })
      });
      if (!res.ok) { alert('Failed to save bio'); }
      else {
        setCtxBio(trimmed);
        try {
          if (userInfo?.username) {
            sessionStorage.setItem(`profile_bio_${userInfo.username.toLowerCase()}`, trimmed);
          }
        } catch {}

        try {
          if (userInfo?.username) {
            const cacheKey = `profile-dashboard:${userInfo.username.toLowerCase()}`;
            if (typeof window !== 'undefined' && 'caches' in window) {
              caches.keys().then(cacheNames => {
                cacheNames.forEach(cacheName => {
                  if (cacheName.includes('profile') || cacheName.includes('dashboard')) {
                    caches.delete(cacheName);
                  }
                });
              }).catch(() => {});
            }
          }
        } catch {}

        alert('Bio updated');
      }
    } catch { alert('Error saving bio'); } finally { savingBioRef.current = false; }
  };

  const rawStatus = ((userInfo as any)?.accountStatus || 'all_good') as string;
  const isTimeouted = (userInfo as any)?.isTimeouted === true;
  const timeoutEnd = (userInfo as any)?.timeoutEnd ? new Date((userInfo as any).timeoutEnd) : null;
  const timeoutReason = (userInfo as any)?.timeoutReason || 'No reason specified';
  const timeoutDuration = (userInfo as any)?.timeoutDuration;
  const timeoutDurationUnit = (userInfo as any)?.timeoutDurationUnit;
  const isTimeoutExpired = timeoutEnd && timeoutEnd < new Date();

  const isSuspended = rawStatus.toLowerCase() === 'suspended' || isTimeouted;
  const statusLabel = isSuspended ? 'Suspended' : 'All good';

  const canEditProfile = !isTimeouted;

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">You must be logged in to access account settings.</p>
          <div className="space-x-4">
            <a href="/login" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
              Login
            </a>
            <a href="/signup" className="inline-block px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors">
              Sign Up
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">

      <main className="max-w-screen-md mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          <a
            href={`/profile/${userInfo?.username || ''}`}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Profile
          </a>
        </div>
        <div className="space-y-8">

          <div className="bg-gray-800 p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Profile Picture</h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-700 bg-gray-800 flex items-center justify-center">
                {currentAvatar ? (
                  <Image src={currentAvatar} alt="Profile Picture" width={96} height={96} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-xl">{(userInfo?.username || 'U').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <input id="avatar-file" type="file" accept="image/*" className="hidden" onChange={handleProfilePictureChange} disabled={!canEditProfile} />
                <div className="flex gap-2">
                  <button onClick={() => document.getElementById('avatar-file')?.click()} disabled={!canEditProfile} className={`px-4 py-2 text-sm font-medium transition-colors ${canEditProfile ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}>Select Image</button>
                  <button onClick={handleUploadAvatar} disabled={!imagePreview || !canEditProfile} className={`px-4 py-2 text-sm font-medium transition-colors ${imagePreview && canEditProfile ? 'bg-white hover:bg-gray-200 text-black' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}>Upload</button>
                </div>
                {imagePreview && <p className="text-xs text-gray-400">Preview selected – click Upload to save.</p>}
                {currentAvatar !== DEFAULT_AVATAR && !imagePreview && (
                  <button onClick={handleRemovePicture} disabled={!canEditProfile} className={`px-4 py-2 text-sm font-medium transition-colors ${canEditProfile ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}>Remove Picture</button>
                )}
                {currentAvatar === DEFAULT_AVATAR && !imagePreview && (
                  <p className="text-xs text-gray-500">Using default avatar.</p>
                )}
                {!canEditProfile && (
                  <p className="text-xs text-red-400 mt-2">⚠️ Profile editing is disabled while you are timeouted.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Username</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^A-Za-z0-9_]/g, '');
                  setUsername(value);
                }}
                disabled={!isLoggedIn || !canEditProfile}
                className={`w-full px-4 py-3 bg-gray-700 border text-white placeholder-gray-400 focus:outline-none disabled:opacity-50 ${
                  username && !/^[A-Za-z0-9_]+$/.test(username)
                    ? 'border-red-500 focus:border-red-400'
                    : 'border-gray-600 focus:border-gray-500'
                }`}
                placeholder={!isLoggedIn ? 'Login required' : !canEditProfile ? 'Editing disabled while timeouted' : 'Enter new username'}
              />
              <button
                onClick={handleUsernameSave}
                disabled={!canChangeUsername() || username.trim().length < 3 || username.includes(' ') || !/^[A-Za-z0-9_]+$/.test(username) || username === userInfo?.username || !canEditProfile}
                className="w-full sm:w-auto bg-white hover:bg-gray-200 disabled:bg-gray-700 text-black disabled:text-gray-400 px-5 py-2.5 font-semibold transition-colors disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              You can change your username every 7 days.
            </p>
            {!canEditProfile && (
              <p className="text-xs text-red-400 mt-2">⚠️ Username editing is disabled while you are timeouted.</p>
            )}
            <p className="text-xs text-gray-600 mt-1 hidden">

            </p>
          </div>

          <div className="bg-gray-800 p-6 border border-gray-700 md:flex md:flex-col md:items-center">
            <h2 className="text-xl font-semibold text-white mb-4 w-full md:text-center">Bio</h2>
            <textarea
              value={bio}
              onChange={e=>{ const nextRaw = e.target.value; setBio(trimToLimit(nextRaw)); }}
              placeholder={!isLoggedIn ? 'Login required' : !canEditProfile ? 'Editing disabled while timeouted' : 'Write something about yourself (max 145 characters)...'}
              disabled={!isLoggedIn || !canEditProfile}
              className="w-full md:max-w-2xl min-h-[160px] md:min-h-[240px] resize-y px-4 py-3 md:py-8 bg-gray-700 border border-gray-600 text-gray-300 placeholder-gray-400 focus:outline-none focus:border-gray-500 disabled:opacity-50 text-base leading-relaxed"
            />
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400 w-full md:max-w-2xl md:text-sm md:font-medium">
              <span>{bio.length}/{MAX_BIO_CHARS} chars</span>
              <button onClick={handleSaveBio} disabled={!isLoggedIn || bio.trim().length===0 || !canEditProfile} className="px-3 py-1.5 md:py-2 md:px-4 bg-white hover:bg-gray-200 disabled:bg-gray-700 text-black font-medium disabled:text-gray-400 disabled:cursor-not-allowed">Save Bio</button>
            </div>
            {!canEditProfile && (
              <p className="text-xs text-red-400 mt-2 text-center">⚠️ Bio editing is disabled while you are timeouted.</p>
            )}
          </div>

          <div className="bg-gray-800 p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Account Status</h2>
              <button
                onClick={refreshUser}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
              >
                Refresh Status
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              {isTimeouted
                ? 'Your account is suspended due to a timeout. You cannot post scripts, comments, or edit your profile until the timeout expires.'
                : 'Your moderation standing. If issues occur, status will change to Suspended.'
              }
            </p>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${!isSuspended ? 'bg-green-500 text-black border-green-400' : 'bg-gray-700 text-gray-500 border-gray-600'}`}>✓</div>
                <span className={`text-[11px] font-medium ${!isSuspended ? 'text-green-400' : 'text-gray-500'}`}>All good</span>
              </div>
              <div className="flex-1 h-px bg-gray-700" />
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${isSuspended ? 'bg-red-600 text-white border-red-400' : 'bg-gray-700 text-gray-500 border-gray-600'}`}>!</div>
                <span className={`text-[11px] font-medium ${isSuspended ? 'text-red-400' : 'text-gray-500'}`}>Suspended</span>
              </div>
            </div>

            {isTimeouted && timeoutEnd && (
              <div className="mt-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="text-sm text-gray-300 mb-2">
                  <strong>Timeout Details:</strong>
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <div><strong>Reason:</strong> {timeoutReason}</div>
                  <div><strong>Duration:</strong> {timeoutDuration} {timeoutDurationUnit}</div>
                  <div><strong>End Time:</strong> {timeoutEnd.toLocaleString()}</div>
                  <div><strong>Status:</strong> {isTimeoutExpired ? 'Expired (should be removed soon)' : 'Active'}</div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50">
            <h2 className="text-xl font-semibold text-white mb-4">Verification Status</h2>
            <div className="flex items-center gap-2 min-h-[28px]">
              {isAuthLoading ? (
                <span className="text-gray-400 text-sm">Loading...</span>
              ) : !isLoggedIn ? (
                <span className="text-gray-400 text-sm">Login to view status</span>
              ) : isVerified ? (
                <>
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-400 font-medium">Verified</span>
                </>
              ) : (
                <span className="text-gray-400">Not Verified</span>
              )}
            </div>
          </div>

          <div className="bg-gray-800 p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Change Email</h2>
            {emailStep === 'edit' && (
              <div className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="New Email Address"
                  autoComplete="off"
                  name="new-email"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
                />
                <div className="flex justify-between items-center text-xs text-gray-400"><span>{emailMsg}</span>
                  <button onClick={startEmailChange} disabled={emailLoading} className="bg-white hover:bg-gray-200 disabled:bg-gray-700 text-black px-5 py-2.5 font-semibold transition-colors disabled:text-gray-400">Request Code</button>
                </div>
              </div>
            )}
            {emailStep === 'code' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-400">Enter the code sent to {codeSentTo || 'your current email'}</p>
                <input
                  type="text"
                  value={emailCode}
                  onChange={(e)=>setEmailCode(e.target.value)}
                  placeholder="6-digit code"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
                />
                <div className="flex justify-between gap-2">
                  <button onClick={()=>{ setEmailStep('edit'); setEmailCode(''); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm">Back</button>
                  <button onClick={verifyEmailCode} disabled={emailLoading} className="bg-white hover:bg-gray-200 disabled:bg-gray-700 text-black px-5 py-2.5 font-semibold transition-colors disabled:text-gray-400">Verify</button>
                </div>
                {emailMsg && <p className="text-xs text-gray-400">{emailMsg}</p>}
              </div>
            )}
          </div>

          <div className="bg-gray-800 p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Change Password</h2>
            {passwordStep === 'edit' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-400">To change your password, request a verification code to your email.</p>
                <button onClick={requestPasswordCode} disabled={passwordLoading} className="bg-white hover:bg-gray-200 disabled:bg-gray-700 text-black px-5 py-2.5 rounded-lg font-semibold transition-colors disabled:text-gray-400">Request Code</button>
                {passwordMsg && <p className="text-xs text-gray-400 mt-2">{passwordMsg}</p>}
              </div>
            )}
            {passwordStep === 'input' && (
              <div className="space-y-4">
                <p className="text-xs text-gray-400">Enter the code sent to {passwordCodeSentTo || 'your current email'} and your new password.</p>
                <input
                  type="text"
                  value={passwordCode}
                  onChange={e=>setPasswordCode(e.target.value)}
                  placeholder="6-digit code"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="New Password"
                  autoComplete="new-password"
                  name="new-password"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  autoComplete="new-password"
                  name="confirm-password"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
                />
                <div className="flex justify-between gap-2">
                  <button onClick={()=>{ setPasswordStep('edit'); setPasswordCode(''); setNewPassword(''); setConfirmPassword(''); setPasswordMsg(''); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm">Back</button>
                  <button onClick={handlePasswordChange} disabled={passwordLoading} className="bg-white hover:bg-gray-200 text-black px-5 py-2.5 font-semibold transition-colors">Change Password</button>
                </div>
                {passwordMsg && <p className="text-xs text-gray-400 mt-2">{passwordMsg}</p>}
              </div>
            )}
          </div>

          <div className="bg-gray-800 p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Delete Account</h2>
            <p className="text-gray-300 text-sm mb-4">
              This action is irreversible. All your scripts, comments, and account data will be permanently deleted.
            </p>

            {!showDeleteAccount ? (
              <button
                onClick={async () => {
                  setShowDeleteAccount(true);
                  try {
                    const res = await fetch('/api/account/delete', {
                      method: 'GET',
                      credentials: 'include'
                    });

                    if (res.ok) {
                      setDeleteAccountError("");
                      setDeleteAccountSuccess(`Confirmation code sent to ${email}`);
                    } else {
                      const data = await res.json();
                      setDeleteAccountError(data.error || "Failed to send confirmation code");
                    }
                  } catch (error) {
                    setDeleteAccountError("Failed to send confirmation code");
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 font-semibold transition-colors"
              >
                Delete My Account
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-300 text-sm">
                  A confirmation code has been sent to <span className="font-semibold">{email}</span>. Please check your email and enter the code below.
                </p>

                <form onSubmit={handleDeleteAccount} className="space-y-4">
                  <input
                    type="text"
                    value={deleteConfirmationCode}
                    onChange={(e) => setDeleteConfirmationCode(e.target.value)}
                    placeholder="Enter 16-digit confirmation code from email"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
                  />
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={deleteAccountLoading || !deleteConfirmationCode}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-5 py-2.5 font-semibold transition-colors disabled:text-gray-400"
                    >
                      {deleteAccountLoading ? 'Deleting...' : 'Delete Account'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteAccount(false)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2.5 font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>

                {deleteAccountError && (
                  <div className="text-red-400 text-sm bg-gray-700 p-3 border border-gray-600">
                    {deleteAccountError}
                  </div>
                )}

                {deleteAccountSuccess && (
                  <div className="text-green-400 text-sm bg-gray-700 p-3 border border-gray-600">
                    {deleteAccountSuccess}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
