"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

const DEMO_SCRIPTS = [
  { id: "demo1", title: "Demo ESP Script", ownerId: "demo_user", gameName: "Arsenal", isUniversal: false, price: "Free", thumbnailUrl: "", customThumbnail: "", views: 1200, likes: 45, comments: [], commentCount: 3, createdAt: new Date().toISOString(), keySystemLink: "", discordServer: "", isVerified: true, points: 100, tags: ["esp", "arsenal"], description: "Sample script for portfolio demo.", status: "Functional" },
  { id: "demo2", title: "Universal Aimbot", ownerId: "demo_user", gameName: "Multiple", isUniversal: true, price: "Free", thumbnailUrl: "", customThumbnail: "", views: 890, likes: 32, comments: [], commentCount: 1, createdAt: new Date().toISOString(), keySystemLink: "", discordServer: "", isVerified: false, points: 80, tags: ["aimbot", "universal"], description: "Demo universal script.", status: "Functional" },
  { id: "demo3", title: "Speed Hack", ownerId: "creator", gameName: "Brookhaven", isUniversal: false, price: "Paid", priceAmount: 100, thumbnailUrl: "", customThumbnail: "", views: 2100, likes: 120, comments: [], commentCount: 8, createdAt: new Date().toISOString(), keySystemLink: "", discordServer: "", isVerified: true, points: 200, tags: ["speed"], description: "Paid script example.", status: "Functional" },
];

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

const EyeIcon = () => (
  <svg className="w-4 h-4 opacity-50" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
  </svg>
);

const LockIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
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
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
  </svg>
);

const UploadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const VerifiedIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
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

const HeartIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
  </svg>
);

const CommentsIcon = () => (
  <svg className="w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432">
    <path fill="currentColor" d="M405 88q9 0 15.5 6.5T427 109v320l-86-85H107q-9 0-15.5-6.5T85 323v-43h278V88h42zm-85 128q0 9-6.5 15t-14.5 6H85L0 323V24q0-9 6.5-15T21 3h278q8 0 14.5 6t6.5 15v192z"/>
  </svg>
);

function timeAgo(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 2629746) return `${Math.floor(diff / 604800)} weeks ago`;
  if (diff < 31556952) return `${Math.floor(diff / 2629746)} months ago`;
  return `${Math.floor(diff / 31556952)} years ago`;
}

const getScriptThumbnail = (script: any) => {
  if (script.customThumbnail) return script.customThumbnail;
  if (script.dbThumbnail) return script.dbThumbnail;
  if (script.databaseThumbnail) return script.databaseThumbnail;
  if (script.thumbnailUrl) return script.thumbnailUrl;
  if (script.isUniversal) return "/universal.png";
  return "/no-thumbnail.png";
};

const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('/')) return true;
  if (url.startsWith('data:image')) return true;
  if (url.startsWith('http://') || url.startsWith('https://')) return true;
  return false;
};

const getGameLabel = (script: any) => {
  if (script.isUniversal) {
    return <span className="text-green-400 font-semibold">Universal Script</span>;
  }
  if (script.gameName) {
    return <span className="text-blue-400 font-semibold">{script.gameName}</span>;
  }
  return <span className="text-blue-400 font-semibold">Unknown Game</span>;
};

const CoinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#FFD700" className="w-5 h-5 mr-1">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6l3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

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
  const VerifiedIcon = () => (
    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
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
            {script.commentCount || 0}
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
                <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/></svg> <span>Discord</span>
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

export default function HomePage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [popularScripts, setPopularScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const SCRIPTS_PER_PAGE = 16;
  const router = useRouter();

  const { isLoggedIn, userInfo, isAuthLoading, logout } = useAuth();

  useEffect(() => {
  }, []);

  useEffect(() => {
    async function fetchScriptsPage() {
      setLoading(true);
      try {
        const res = await fetch(`/api/scripts/fast?page=0&limit=${SCRIPTS_PER_PAGE}&includePopular=1`);
        const data = await res.json();
        const scripts = Array.isArray(data.newest) ? data.newest : [];
        const useDemo = scripts.length === 0;
        setPopularScripts(useDemo ? DEMO_SCRIPTS : scripts);
        setHasMore(!useDemo && scripts.length === SCRIPTS_PER_PAGE);

        if (data.performance) {

        }
      } catch (e) {
        setPopularScripts(DEMO_SCRIPTS);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    }
    fetchScriptsPage();
  }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/scripts/fast?page=${nextPage}&limit=${SCRIPTS_PER_PAGE}`);
      const data = await res.json();
      const newScripts = Array.isArray(data.newest) ? data.newest : [];
      setPopularScripts(prev => [...prev, ...newScripts]);
      setPage(nextPage);
      setHasMore(newScripts.length === SCRIPTS_PER_PAGE);

      if (data.performance) {

      }
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/scripts/fast-search?q=${encodeURIComponent(searchQuery)}&limit=20`, { signal: controller.signal })
        .then(res => res.json())
        .then((data) => {
          const scripts = Array.isArray(data.scripts) ? data.scripts : [];
          setSearchResults(scripts);

          if (data.performance) {

          }
        })
        .catch(() => setSearchResults([]))
        .finally(() => {
          setSearchLoading(false);
        });
    }, 100);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [searchQuery]);

  const [filterOptions, setFilterOptions] = useState({
    price: '',
    universal: false,
    verified: false,
    creator: '',
    keySystem: false,
  });
  const [sortOption, setSortOption] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilter, setShowFilter] = useState(false);

  const filteredPopularScripts = popularScripts.filter(script => {
    const q = searchQuery.toLowerCase();
    let matches = (
      script.title.toLowerCase().includes(q) ||
      (script.description && script.description.toLowerCase().includes(q)) ||
      (script.gameId && script.gameId.includes(q)) ||
      (Array.isArray(script.tags) && script.tags.some((tag: string) => tag.toLowerCase().includes(q)))
    );
    if (filterOptions.price) matches = matches && script.price === filterOptions.price;
    if (filterOptions.universal) matches = matches && script.isUniversal;
    if (filterOptions.verified) matches = matches && script.isVerified;
    if (filterOptions.creator) matches = matches && script.ownerId === filterOptions.creator;
    if (filterOptions.keySystem) matches = matches && script.keySystemLink && script.keySystemLink.length > 0;
    return matches;
  });

  const sortedScripts = [...filteredPopularScripts].sort((a, b) => {
    let valA = a[sortOption] ?? 0;
    let valB = b[sortOption] ?? 0;
    if (sortOption === 'createdAt') {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    }
    if (sortOrder === 'asc') return valA - valB;
    return valB - valA;
  });

  function normalizeScript(s: any) {
    return {
      id: s.id || s._id || '',
      title: s.title || '',
      ownerId: s.ownerId || s.ownerUsername || '',
      gameName: s.gameName || '',
      isUniversal: !!s.isUniversal,
      price: s.price || '',
      priceAmount: s.priceAmount,
      thumbnailUrl: s.thumbnailUrl || '',
      customThumbnail: s.customThumbnail || '',
      views: s.views || 0,
      likes: s.likes || 0,
      comments: s.comments || [],
      commentCount: s.commentCount || 0,
      createdAt: s.createdAt || '',
      keySystemLink: s.keySystemLink || '',
      discordServer: s.discordServer || '',
      isVerified: s.isVerified || s.ownerVerified || false,
      points: s.points || 0,
      tags: s.tags || [],
      description: s.description || '',
      status: s.status || 'Functional',
    };
  }

  const visibleScripts = searchQuery.trim()
    ? (searchResults ? searchResults.map(normalizeScript) : [])
    : sortedScripts.map(normalizeScript);
  const isLoadingToShow = searchQuery.trim() ? searchLoading : loading;

  const handleLogout = () => {
    logout();
  };

  const handleShareScriptsClick = () => {
    if (isLoggedIn) {
      window.location.href = '/upload';
    } else {
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">

        <main className="w-full mx-auto py-8 sm:py-10 lg:py-12 px-1 sm:px-2 lg:px-4">

        <div className="text-center max-w-7xl mx-auto mb-5">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 sm:mb-8">
            ScriptVoid
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 mb-6 max-w-3xl mx-auto">
          Search for the best scripts for your favorite roblox experiences.
          </p>

          <div className="flex flex-col sm:flex-row w-full mb-5 gap-3 sm:gap-1 max-w-4xl mx-auto">
            <input
              type="text"
              placeholder="Search by Name, Place id, or Tag"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-3 sm:py-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none text-sm sm:text-base"
            />
            <button
              type="button"
              className={`px-4 py-3 sm:py-4 bg-gray-800 border border-gray-600 rounded-lg text-white font-semibold transition-colors flex items-center gap-2 ${showFilter ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
              onClick={() => setShowFilter(v => !v)}
              aria-label="Filter & Sort"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-5.414 5.414a1 1 0 00-.293.707V19a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6.172a1 1 0 00-.293-.707L4.293 6.707A1 1 0 014 6V4z" /></svg>
              <span>Filter & Sort</span>
            </button>
          </div>
          {showFilter && (
            <div className="max-w-4xl mx-auto mb-6 bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col gap-4">
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="text-sm text-gray-300">Price:</label>
                  <select value={filterOptions.price} onChange={e => setFilterOptions(o => ({ ...o, price: e.target.value }))} className="ml-2 px-2 py-1 rounded bg-gray-900 text-white">
                    <option value="">Any</option>
                    <option value="Free">Free</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-300">Universal:</label>
                  <input type="checkbox" checked={filterOptions.universal} onChange={e => setFilterOptions(o => ({ ...o, universal: e.target.checked }))} className="ml-2" />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Verified:</label>
                  <input type="checkbox" checked={filterOptions.verified} onChange={e => setFilterOptions(o => ({ ...o, verified: e.target.checked }))} className="ml-2" />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Creator:</label>
                  <input type="text" value={filterOptions.creator} onChange={e => setFilterOptions(o => ({ ...o, creator: e.target.value }))} className="ml-2 px-2 py-1 rounded bg-gray-900 text-white" placeholder="Username" />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Key System:</label>
                  <input type="checkbox" checked={filterOptions.keySystem} onChange={e => setFilterOptions(o => ({ ...o, keySystem: e.target.checked }))} className="ml-2" />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-2">
                <div>
                  <label className="text-sm text-gray-300">Sort by:</label>
                  <select value={sortOption} onChange={e => setSortOption(e.target.value)} className="ml-2 px-2 py-1 rounded bg-gray-900 text-white">
                    <option value="likes">Likes</option>
                    <option value="views">Views</option>
                    <option value="createdAt">Creation Date</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-300">Order:</label>
                  <select value={sortOrder} onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')} className="ml-2 px-2 py-1 rounded bg-gray-900 text-white">
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-full mb-3">
          {isLoadingToShow ? (
            null
          ) : visibleScripts.length === 0 ? null : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 min-[900px]:grid-cols-3 xl:grid-cols-4 gap-4 justify-center items-stretch">
                {visibleScripts.map((script: any, index: number) => {
                  const publicId = script.id || null;
                  const fallback = script._id || index;
                  const key = publicId || fallback;
                  return (
                    <div key={key} className="px-1 md:px-2 lg:px-3 py-2 h-full flex flex-col">
                      <ScriptCard
                        script={script}
                        onClick={() => {
                          if (publicId) router.push(`/script/${publicId}`); else if (fallback) router.push(`/script/${fallback}`);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              {!searchQuery.trim() && hasMore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={handleLoadMore}
                    className="px-8 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-semibold text-lg shadow transition-all duration-200 disabled:opacity-60"
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading...' : 'Load'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      </div>
  );
}