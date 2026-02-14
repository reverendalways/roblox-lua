"use client";
import { useState, useEffect, use } from "react";
import Image from "next/image";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "next/navigation";

const DEFAULT_AVATAR = '/default.png';

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

const WhiteScriptIcon = () => (
  <svg className="w-6 h-6 text-purple-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="2" stroke="currentColor" fill="none" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8h8M8 12h6M8 16h4" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-4 h-4 opacity-50" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
  </svg>
);

const HeartIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

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

const DiscordIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.0777.0777 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
  </svg>
);

const PanelEyeIcon = () => (
  <svg className="w-4 h-4 opacity-50" fill="white" viewBox="0 0 20 20">
    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
  </svg>
);

const VerifiedIcon = () => (
  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
  </svg>
);

const KeyIcon = () => (
  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 0 1121 9z" />
  </svg>
);

const UnlockedIcon = () => (
  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="5" y="11" width="14" height="8" rx="2" strokeWidth="2" />
    <path d="M7 11V7a5 5 0 0110 0" strokeWidth="2" />
  </svg>
);

const LockedIcon = () => (
  <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="5" y="11" width="14" height="8" rx="2" strokeWidth="2" />
    <path d="M12 17v-2" strokeWidth="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" strokeWidth="2" />
  </svg>
);

const CommentsIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const FeatherIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z"/>
    <path d="M16 8 2 22"/>
    <path d="M17.5 15H9"/>
  </svg>
);

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
}

function formatLastOnline(lastOnline: string | null): string {
  if (!lastOnline) return 'Offline';

  const date = new Date(lastOnline);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `Online ${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `Online ${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `Online ${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `Online ${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 604800) return `Online ${Math.floor(diffInSeconds / 2592000)}w ago`;
  if (diffInSeconds < 31536000) return `Online ${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `Online ${Math.floor(diffInSeconds / 31536000)}y ago`;
}

function formatJoinedDate(createdAt: string): string {
  if (!createdAt) return '';

  const date = new Date(createdAt);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
}

function formatJoinedDateDesktop(createdAt: string): string {
  if (!createdAt) return '';

  const date = new Date(createdAt);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function getScriptThumbnail(script: any) {
  if (script.customThumbnail) return script.customThumbnail;
  if (script.dbThumbnail) return script.dbThumbnail;
  if (script.databaseThumbnail) return script.databaseThumbnail;
  if (script.thumbnailUrl) return script.thumbnailUrl;
  if (script.isUniversal) return "/universal.png";
  return "/no-thumbnail.png";
}

const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('/')) return true;
  if (url.startsWith('data:image')) return true;
  if (url.startsWith('http://') || url.startsWith('https://')) return true;
  return false;
};

function ScriptCard({ script, onClick }: { script: any; onClick?: () => void }) {
  const thumbnail = getScriptThumbnail(script);

  const titleOwnerLen = (script.title + script.ownerId).length;
  let titleClass = "text-lg sm:text-xl";
  let showUsernameInTitleRow = true;

  if (titleOwnerLen > 48) {
    titleClass = "text-base sm:text-lg";
    showUsernameInTitleRow = false;
  }

  if (!showUsernameInTitleRow && script.title.length > 32) {
    titleClass = "text-sm sm:text-base";
  }
  if (!showUsernameInTitleRow && script.title.length > 48) {
    titleClass = "text-xs sm:text-sm";
  }

  const [createdAgo, setCreatedAgo] = useState('');
  useEffect(() => {
    setCreatedAgo(timeAgo(script.createdAt));
  }, [script.createdAt]);

  return (
    <div
      className="group bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50 shadow-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:border-white hover:bg-gray-800/80 flex flex-col h-full focus:outline-none focus:ring-2 focus:ring-blue-400"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`View script: ${script.title}`}
      onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); onClick?.(); } }}
    >

      <div className="relative w-full aspect-square">
        {isValidImageUrl(thumbnail) ? (
          <Image src={thumbnail} alt={script.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover w-full h-full" priority />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <div className="text-gray-400 text-center">
              <svg className="mx-auto h-12 w-12 mb-2" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="text-xs">No Image</div>
            </div>
          </div>
        )}

        {(script.status === 'Patched' || script.status === 'patched') && (
          <div className="absolute bottom-2 left-2 bg-gray-700/80 text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 01-1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 01-1.52 0C14.51 3.81 17 5 19 5a1 1 0 01-1 1z"/>
              <path d="M12 8v4"/>
              <path d="M12 16h.01"/>
            </svg>
            PATCHED
          </div>
        )}
      </div>

      <div className="w-full bg-gray-900/95 border-t border-gray-700 px-1 sm:px-2 py-3 flex flex-col gap-1 relative flex-1">

        <div className="flex flex-row items-center justify-between gap-2 mb-0.5 w-full min-h-[1.5em]">
          <span className={`text-white font-semibold break-words leading-tight whitespace-nowrap ${titleClass} mx-1`} style={{wordBreak: 'break-word', maxWidth: 'calc(100% - 2rem)'}} title={script.title}>{script.title}</span>
          {showUsernameInTitleRow && (
            <span className="text-xs text-gray-400 font-semibold whitespace-nowrap max-w-[38%] text-right">by <span className="text-blue-400 font-bold">{script.ownerId}</span></span>
          )}
        </div>

        <div className="flex flex-row items-center justify-between gap-2 mb-0.5 w-full min-h-[1.5em]">
          <span className="text-blue-400 text-sm font-bold whitespace-nowrap max-w-[60%] mx-1">{script.gameName || (script.isUniversal ? 'Universal Script' : 'Unknown Game')}</span>
          {!showUsernameInTitleRow && (
            <span className="text-xs text-gray-400 font-semibold whitespace-nowrap max-w-[38%] text-right">by <span className="text-blue-400 font-bold">{script.ownerId}</span></span>
          )}
        </div>

        <div className="flex flex-row items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-200">

          {typeof script.points === 'number' && (
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-yellow-400" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" className="opacity-30" /><circle cx="12" cy="12" r="9" fill="currentColor" className="opacity-60" /><path d="M12 7a1 1 0 011 1v3h2.25a1 1 0 010 2H13v3a1 1 0 11-2 0v-3H8.75a1 1 0 010-2H11V8a1 1 0 011-1z" fill="#FFF6D5" /></svg>
              {Math.floor(script.points).toLocaleString('en')}
            </span>
          )}

          <span className="flex items-center gap-1">
            <EyeIcon />
            {script.views > 1000 ? `${((script.views || 0)/1000).toFixed(1)}k` : (script.views || 0)}
          </span>

          <span className="flex items-center gap-1">
            <HeartIcon />
            {script.likes > 1000 ? `${((script.likes || 0)/1000).toFixed(1)}k` : (script.likes || 0)}
          </span>

          <span className="flex items-center gap-1">
            <CommentsIcon />
            <span title={`Comments: ${script.commentCount || 0}`}>
              {script.commentCount || 0}
            </span>
          </span>

          <span className="flex items-center gap-1">
            <ClockIcon />
            {createdAgo}
          </span>
        </div>

        <div className="flex flex-row items-center gap-4 mt-2 min-h-[24px] justify-between w-full">
          <div className="flex flex-row items-center gap-4">
            {typeof script.keySystemLink === 'string' && script.keySystemLink.trim().length > 0 && (
              <a href={script.keySystemLink} target="_blank" rel="noopener noreferrer" className="flex items-center text-yellow-400 text-xs" title="Key System">
                <KeyIcon /> <span className="ml-1">Key System</span>
              </a>
            )}
            {typeof script.discordServer === 'string' && script.discordServer.trim().length > 0 && (
              <a href={script.discordServer} target="_blank" rel="noopener noreferrer" className="flex items-center text-indigo-400 text-xs" title="Discord Server">
                <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.0777.0777 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/></svg> <span>Discord</span>
              </a>
            )}
            {(!script.keySystemLink || script.keySystemLink.trim().length === 0) && (!script.discordServer || script.discordServer.trim().length === 0) && (
              <span className="flex items-center gap-2 text-white text-xs">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-link2-off-icon lucide-link-2-off w-5 h-5 text-white"><path d="M9 17H7A5 5 0 0 1 7 7"/><path d="M15 7h2a5 5 0 0 1 4 8"/><line x1="8" x2="12" y1="12" y2="12"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                No links attached
              </span>
            )}
            {script.isVerified && (
              <span className="flex items-center gap-1 text-green-400 text-xs font-bold ml-2">
                Verified <VerifiedIcon />
              </span>
            )}
          </div>
          <div className="flex flex-row items-center gap-1 text-xs font-bold">
            {script.price === 'Free' ? (
              <>
                <UnlockedIcon />
                <span className="text-green-400">Free</span>
              </>
            ) : (
              <>
                <LockedIcon />
                <span className="text-yellow-400">Paid{typeof script.priceAmount === 'number' && script.priceAmount > 0 ? ` ($${script.priceAmount})` : ''}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { isLoggedIn, userInfo, logout } = useAuth();
  const router = useRouter();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [userScripts, setUserScripts] = useState<any[]>([]);
  const [displayedScripts, setDisplayedScripts] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [userExists, setUserExists] = useState(true);
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalComments, setTotalComments] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [onlineStatus, setOnlineStatus] = useState<{ isOnline: boolean; lastOnline: string | null } | null>(null);

  useEffect(() => {
    if (!username) return;

    const fetchUserDataAndScripts = async () => {
      setIsFetching(true);
      (window as any).showLoadingBar?.();
      try {
        const [dashboardRes, scriptsRes] = await Promise.all([
          fetch(`/api/profile/dashboard?username=${encodeURIComponent(username)}&_t=${Date.now()}&_cb=${Math.random()}`, {
            credentials: 'include',
            cache: 'no-store',
          }),
          fetch(`/api/profile/user-scripts/${encodeURIComponent(username)}?_t=${Date.now()}&_cb=${Math.random()}`, {
            credentials: 'include',
            cache: 'no-store',
          })
        ]);

        if (dashboardRes.ok) {
          const data = await dashboardRes.json();
          setUserData({
            userId: data.userId,
            username: data.username,
            accountthumbnail: data.accountthumbnail,
            verified: data.verified,
            bio: data.bio,
            staffRank: data.staffRank,
            lastOnline: data.lastOnline || null,
            isOnline: data.isOnline || false,
            totalScripts: data.totalScripts || 0,
            totalViews: data.totalViews || 0,
            totalPoints: data.totalPoints || 0,
            createdAt: data.createdAt
          });
          setUserExists(true);

          if (data.isOnline !== undefined) {
            setOnlineStatus({ isOnline: data.isOnline, lastOnline: data.lastOnline || null });
          }

        } else if (dashboardRes.status === 404) {
          setUserExists(false);
        } else {
          console.error('Failed to fetch user data:', dashboardRes.status);
        }

        if (scriptsRes.ok) {
          const scriptsData = await scriptsRes.json();

          const userScripts = scriptsData.scripts || [];

          const enrichedScripts = userScripts.map((script: any) => ({
            ...script,
            id: script.id || script._id
          }));

          setUserScripts(enrichedScripts);
          setDisplayedScripts(enrichedScripts.slice(0, 20));
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsFetching(false);
        (window as any).hideLoadingBar?.();
      }
    };

    fetchUserDataAndScripts();
  }, [username]);

  const handleLogout = () => { logout(); };

  const copyUserId = async () => {
    if (userData?.userId) {
      try {
        await navigator.clipboard.writeText(userData.userId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);

      } catch (err) {
        console.error('Failed to copy User ID:', err);
      }
    }
  };

  const loadingUserData = userData === null && isFetching;
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

  const avatarUrl = getSafeAvatarUrl(userData?.accountthumbnail);

  const isValidImageUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    if (url.startsWith('/')) return true;
    if (url.startsWith('data:image')) return true;
    if (url.startsWith('http://') || url.startsWith('https://')) return true;
    return false;
  };

  const verified = userData?.verified === true;
  const own = userInfo?.username && userInfo.username.toLowerCase() === username.toLowerCase();
  const bioSource = own ? userInfo?.bio : userData?.bio;
  const bio = (bioSource && bioSource.trim().length > 0) ? bioSource : '';

  const isOnline = own ? true : (userData?.isOnline === true);
  const lastOnline = userData?.lastOnline || null;

  return (
    <div className="bg-gray-900 text-white relative z-0">
      <main className="w-full mx-auto py-6 px-3 sm:px-4 lg:px-8">

        {!isFetching && !userExists && (
          <div className="min-h-[40vh] flex items-center justify-center">
            <div className="text-2xl font-bold text-gray-400">User not found</div>
          </div>
        )}

        {userExists && (
          <>
            <div className="max-w-6xl mx-auto">

              <div className="bg-gray-800/50 rounded-xl border border-white/30 p-4 sm:p-6 mb-6 sm:mb-8">

                <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">

                  <div className="flex items-start gap-3 lg:hidden relative">

                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white/50 bg-gradient-to-br from-gray-700 to-gray-800">
                          {isValidImageUrl(avatarUrl) ? (
                            <Image
                              src={avatarUrl}
                              alt={`${username}'s avatar`}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-700">
                              <span className="text-gray-400 text-lg font-bold">
                                {(userData?.username || username)?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${
                          isOnline ? 'bg-green-500' : 'bg-gray-500'
                        }`}></div>

                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-xl font-bold text-white truncate flex-shrink-0">{userData?.username || username}</h1>

                        {verified && (
                          <div className="w-4 h-4 text-green-500 flex-shrink-0">
                            <VerifiedIcon />
                          </div>
                        )}

                        {userData?.staffRank && userData.staffRank !== 'none' && (
                          <div className="w-4 h-4 text-purple-400 flex-shrink-0">
                            <FeatherIcon />
                          </div>
                        )}
                      </div>

                      {userData?.createdAt && (
                        <div className="text-xs text-gray-400">
                          Joined ScriptVoid {formatJoinedDate(userData.createdAt)}
                        </div>
                      )}
                    </div>

                  </div>

                  <div className="hidden lg:flex lg:flex-row gap-6 items-start w-full relative">

                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/50 bg-gradient-to-br from-gray-700 to-gray-800">
                          {isValidImageUrl(avatarUrl) ? (
                            <Image
                              src={avatarUrl}
                              alt={`${username}'s avatar`}
                              fill
                              className="object-cover"
                              sizes="96px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-700">
                              <span className="text-gray-400 text-2xl font-bold">
                                {(userData?.username || username)?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex flex-row items-center gap-3 mb-3">
                        <h1 className="text-3xl font-bold text-white truncate">{userData?.username || username}</h1>

                        <div className="flex items-center gap-2 flex-wrap">
                          {verified && (
                            <div className="relative flex items-center gap-1.5 px-4 py-2 border-2 text-sm font-semibold shadow-xl bg-gradient-to-br from-green-900/60 to-green-800/60 border-white/50 text-green-200">
                              <VerifiedIcon />
                              <span>Verified</span>
                            </div>
                          )}

                          {userData?.staffRank && userData.staffRank !== 'none' && (
                            <div className="relative flex items-center gap-1.5 px-4 py-2 border-2 text-sm font-semibold shadow-xl bg-gradient-to-br from-purple-900/60 to-purple-800/60 border-white/50 text-purple-200 whitespace-nowrap">
                              <FeatherIcon />
                              <span>{getBadgeLabel(userData.staffRank)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {isOnline ? (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-green-400 font-medium">Online</span>

                          {userData?.createdAt && (
                            <span className="text-xs text-gray-400">
                              ScriptVoid Member Since {formatJoinedDateDesktop(userData.createdAt)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                          <span className="text-sm text-gray-400 font-medium">{formatLastOnline(lastOnline)}</span>

                          {userData?.createdAt && (
                            <span className="text-xs text-gray-400">
                              ScriptVoid Member Since {formatJoinedDateDesktop(userData.createdAt)}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mb-4 max-w-2xl">
                        {bio ? (
                          <p className="text-gray-300 text-base leading-relaxed">
                            {bio}
                          </p>
                        ) : (
                          <p className="text-gray-500 text-base italic">
                            No bio available.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 ml-auto">
                      <ProfileStats
                        stats={{
                          totalScripts: userData?.totalScripts || 0,
                          totalViews: userData?.totalViews || 0,
                          totalPoints: userData?.totalPoints || 0
                        }}
                        isLoading={loadingUserData}
                        userId={userData?.userId}
                        onCopyUserId={copyUserId}
                        copied={copied}
                      />

                    </div>

                  </div>

                  <div className="lg:hidden">

                    <div className="mb-4">
                      {bio ? (
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {bio}
                        </p>
                      ) : (
                        <p className="text-gray-500 text-sm italic">
                          No bio available.
                        </p>
                      )}
                    </div>

                    <div className="w-full">
                      {loadingUserData ? (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-gray-700/20 rounded border border-white/30">
                            <div className="h-4 w-6 bg-gray-700/60 animate-pulse rounded mx-auto mb-1"></div>
                            <div className="h-2 w-8 bg-gray-700/60 animate-pulse rounded mx-auto"></div>
                          </div>
                          <div className="text-center p-2 bg-gray-700/20 rounded border border-white/30">
                            <div className="h-4 w-6 bg-gray-700/60 animate-pulse rounded mx-auto mb-1"></div>
                            <div className="h-2 w-8 bg-gray-700/60 animate-pulse rounded mx-auto"></div>
                          </div>
                          <div className="text-center p-2 bg-gray-700/20 rounded border border-white/30">
                            <div className="h-4 w-6 bg-gray-700/60 animate-pulse rounded mx-auto mb-1"></div>
                            <div className="h-2 w-8 bg-gray-700/60 animate-pulse rounded mx-auto"></div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-gray-700/20 rounded border border-white/30">
                            <div className="text-sm font-bold text-white">{userData?.totalScripts || 0}</div>
                            <div className="text-xs text-gray-400">Scripts</div>
                          </div>
                          <div className="text-center p-2 bg-gray-700/20 rounded border border-white/30">
                            <div className="text-sm font-bold text-white">{(userData?.totalViews || 0).toLocaleString()}</div>
                            <div className="text-xs text-gray-400">Views</div>
                          </div>
                          <div className="text-center p-2 bg-gray-700/20 rounded border border-white/30">
                            <div className="text-sm font-bold text-white">{Math.floor(userData?.totalPoints || 0).toLocaleString()}</div>
                            <div className="text-xs text-gray-400">Points</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">Scripts</h2>

                  {userData?.userId && (
                    <div
                      className={`text-xs cursor-pointer transition-colors ${
                        copied ? 'text-green-400' : 'text-gray-500 hover:text-gray-400'
                      }`}
                      onClick={copyUserId}
                      title={copied ? "Copied!" : "Click to copy User ID"}
                    >
                      {copied ? "✓ Copied!" : "COPY USERID"}
                    </div>
                  )}
                </div>

                {own && (
                  <div className="hidden lg:flex items-center gap-3">
                    <button
                      onClick={() => router.push('/account-settings')}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Account Settings
                    </button>
                    <button
                      onClick={() => router.push('/upload')}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <UploadIcon />
                      Upload Script
                    </button>
                  </div>
                )}
              </div>

              <div className="w-full mb-3">
                {loadingUserData ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center gap-3 text-gray-400">
                      <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                      <span className="text-lg">Loading scripts...</span>
                    </div>
                  </div>
                ) : isFetching && userData && userScripts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center gap-3 text-gray-400">
                      <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                      <span className="text-lg">Loading scripts...</span>
                    </div>
                  </div>
                ) : userScripts.length === 0 ? null : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 min-[900px]:grid-cols-3 xl:grid-cols-4 gap-4 justify-center items-stretch">
                      {displayedScripts.map((script: any, index: number) => {
                        const scriptId = script.id || script._id;
                        const key = scriptId || index;
                        return (
                          <div key={key} className="px-1 md:px-2 lg:px-3 py-2 h-full flex flex-col">
                            <ScriptCard
                              script={script}
                              onClick={() => {
                                if (scriptId) {
                                  router.push(`/script/${scriptId}`);
                                }
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    {userScripts.length > 20 && displayedScripts.length === 20 && (
                      <div className="flex justify-center mt-8">
                        <button
                          onClick={() => {
                            setDisplayedScripts([...userScripts]);
                          }}
                          className="px-8 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-semibold text-lg shadow transition-all duration-200"
                        >
                          Load All Scripts ({userScripts.length - 20} more)
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {!loadingUserData && !isFetching && userScripts.length === 0 && (
                <div className="hidden lg:block text-center py-8 text-gray-400">
                  <p className="text-lg">No scripts yet.</p>
                  {own && (
                    <button
                      onClick={() => router.push('/upload')}
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
                    >
                      <UploadIcon />
                      Upload Your First Script
                    </button>
                  )}
                </div>
              )}

              {!loadingUserData && !isFetching && userScripts.length === 0 && own && (
                <div className="lg:hidden text-center py-4">
                  <button
                    onClick={() => router.push('/upload')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
                  >
                    <UploadIcon />
                    Upload
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const ProfileStats = ({ stats, isLoading, userId, onCopyUserId, copied }: {
  stats: { totalScripts: number; totalViews: number; totalPoints: number } | null;
  isLoading: boolean;
  userId?: string;
  onCopyUserId?: () => void;
  copied?: boolean;
}) => {
  return (
    <div className="flex flex-col gap-2 min-w-[160px]">
      <div className="flex items-center justify-between p-2 bg-gray-700/30 rounded border border-white/30 h-8">
        <span className="text-gray-300 text-xs font-medium">Scripts</span>
        <span className="text-sm font-bold text-white min-w-[20px] text-right">
          {isLoading ? (
            <div className="h-3 w-4 bg-gray-700/60 animate-pulse rounded" />
          ) : (
            stats?.totalScripts || 0
          )}
        </span>
      </div>

      <div className="flex items-center justify-between p-2 bg-gray-700/30 rounded border border-white/30 h-8">
        <span className="text-gray-300 text-xs font-medium">Views</span>
        <span className="text-sm font-bold text-white min-w-[20px] text-right">
          {isLoading ? (
            <div className="h-3 w-6 bg-gray-700/60 animate-pulse rounded" />
          ) : (
            (stats?.totalViews || 0).toLocaleString()
          )}
        </span>
      </div>

      <div className="flex items-center justify-between p-2 bg-gray-700/30 rounded border border-white/30 h-8">
        <span className="text-gray-300 text-xs font-medium">Points</span>
        <span className="text-sm font-bold text-white min-w-[20px] text-right">
          {isLoading ? (
            <div className="h-3 w-6 bg-gray-700/60 animate-pulse rounded" />
          ) : (
            Math.floor(stats?.totalPoints || 0).toLocaleString()
          )}
        </span>
      </div>

    </div>
  );
};

function getBadgeLabel(staffRank: string) {
  const rankConfig = {
    'owner': 'Moderation Team',
    'senior_moderator': 'Moderation Team',
    'moderator': 'Moderation Team',
    'junior_moderator': 'Moderation Team'
  };

  return rankConfig[staffRank.toLowerCase() as keyof typeof rankConfig] || staffRank;
}
