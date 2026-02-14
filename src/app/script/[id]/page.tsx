"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "../../../context/AuthContext";
import { ImageOptimizer, ImagePresets } from "../../../lib/imageOptimizer";
import {
  getUserRateLimitStatus,
  canEditSpecificScript,
  updateScriptEditHistory,
  canPostComment,
  incrementCommentPostCount,
  canDeleteComment,
  incrementCommentDeleteCount
} from "../../../lib/security";

const Avatar = ({ src, alt, size = 80, className = "" }: { src?: string; alt: string; size?: number; className?: string }) => {
  const [errored, setErrored] = useState(false);
  const finalSrc = !src || errored ? "/default.png" : src;
  return (
    <Image
      src={finalSrc}
      alt={alt || 'avatar'}
      width={size}
      height={size}
      onError={() => setErrored(true)}
      className={`object-cover select-none ${className}`}
    />
  );
};

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const DeleteIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CommentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
  </svg>
);

const HeartIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const DiscordIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
  </svg>
);

const VerifiedIcon = () => (
  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const KeyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
  </svg>
);
const BumpIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
  </svg>
);
const PromoteIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 16v5" />
    <path d="M16 14v7" />
    <path d="M20 10v11" />
    <path d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15" />
    <path d="M4 18v3" />
    <path d="M8 14v7" />
  </svg>
);
const UnlockedIcon = () => (
  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="5" y="11" width="14" height="8" rx="2" strokeWidth="2" />
    <path d="M7 11V7a5 5 0 0110 0" strokeWidth="2" />
  </svg>
);
const LockedIcon = () => (
  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="5" y="11" width="14" height="8" rx="2" strokeWidth="2" />
    <path d="M12 17v-2" strokeWidth="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" strokeWidth="2" />
  </svg>
);
const CoinIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-yellow-400" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="currentColor" className="opacity-30" />
    <circle cx="12" cy="12" r="9" fill="currentColor" className="opacity-60" />
    <path d="M12 7a1 1 0 011 1v3h2.25a1 1 0 010 2H13v3a1 1 0 11-2 0v-3H8.75a1 1 0 010-2H11V8a1 1 0 011-1z" fill="#FFF6D5" />
  </svg>
);
const ClockIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
  </svg>
);

const FlagIcon = () => (
  <svg className="w-5 h-5 lucide lucide-flag-icon lucide-flag" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"/></svg>
);

type Comment = {
  id: string;
  userId: string;
  username?: string;
  avatar?: string;
  content: string;
  timestamp: string | Date;
  likes: number;
  isOptimistic?: boolean;
};

const BTN_BASE = 'inline-flex items-center gap-2 rounded-xl font-medium tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-black/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.97] px-3 py-2 text-sm sm:px-4 sm:py-2.5';
const BTN_NEUTRAL = 'bg-gray-900/80 hover:bg-gray-800/80 active:bg-gray-800 text-white border border-gray-800 ring-1 ring-gray-800 hover:ring-gray-700 focus-visible:ring-gray-600 shadow-sm hover:shadow-md shadow-black/40 backdrop-blur transition-colors';
const BTN_PRIMARY = 'bg-gray-900/85 hover:bg-gray-800 active:bg-gray-800 text-white border border-gray-800 ring-1 ring-gray-800 hover:ring-gray-700 focus-visible:ring-gray-600 shadow-sm hover:shadow-md shadow-black/40 backdrop-blur transition-colors';
const BTN_DANGER = 'bg-gray-900/85 hover:bg-gray-800 active:bg-gray-800 text-white border border-gray-800 ring-1 ring-gray-800 hover:ring-gray-700 focus-visible:ring-gray-600 shadow-sm hover:shadow-md shadow-black/40 backdrop-blur transition-colors';
const BTN_SUBTLE = 'bg-gray-850/70 hover:bg-gray-800 active:bg-gray-800 text-white border border-gray-800 ring-1 ring-gray-800 hover:ring-gray-700 focus-visible:ring-gray-600 shadow-sm transition-colors';
const BTN_PROMOTE = 'bg-gray-900/85 hover:bg-gray-800 active:bg-gray-800 text-white border border-gray-800 ring-1 ring-gray-800 hover:ring-gray-700 focus-visible:ring-gray-600 shadow-sm hover:shadow-md shadow-black/40 backdrop-blur transition-colors';

const displayStatus = (s?: string) => {
  if (!s) return '';
  if (s === 'Functional' || s === 'functional') return 'Functional';
  if (s === 'Patched' || s === 'patched') return 'Patched';
  return s;
};

const escapeHTMLCode = (text: string) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

const highlightLuau = (code: string) => {
  if (!code) return '';

  const validatedCode = code.length > 10000 ? code.substring(0, 10000) : code;

      const dangerousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /on\w+\s*=/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
        /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
      ];

      const hasDangerousContent = dangerousPatterns.some(pattern => pattern.test(validatedCode));
      if (hasDangerousContent) {
        return escapeHTMLCode(validatedCode);
      }

  const escape = (s: string) => s
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#x27;');

  const keywords = new Set(['and','break','do','else','elseif','end','false','for','function','if','in','local','nil','not','or','repeat','return','then','true','until','while']);
  const builtins = new Set(['math','table','string','coroutine','task','workspace','game','script','wait','ipairs','pairs','next','print','warn','require']);

  const src = validatedCode; let i=0; const out: string[]=[]; const push=(cls:string,txt:string)=>{out.push(`<span class="token-${cls}">${escape(txt)}</span>`)};
  while(i < src.length){
    const ch = src[i];
    if(ch==='-' && src[i+1]==='-'){
      if(src[i+2]==='['){
        let eqs = 0; let j=i+3; while(src[j]==='='){eqs++;j++;}
        if(src[j]=='['){
          j++; const endSeq=']'+'='.repeat(eqs)+']'; const end = src.indexOf(endSeq,j); const block = end!==-1? src.slice(i,end+endSeq.length):src.slice(i); i += block.length; push('comment',block); continue;
        }
      }
      let j=i+2; while(j<src.length && src[j] !== '\n'){j++;}
      const com = src.slice(i,j); i=j; push('comment',com); continue;
    }
    if(ch==='"' || ch==='\''){
      const quote = ch; let j=i+1; let escaped=false; while(j<src.length){ const c=src[j]; if(!escaped && c==='\\'){escaped=true; j++; continue;} if(!escaped && c===quote){j++; break;} escaped=false; j++; }
      const str = src.slice(i,j); i=j; push('string',str); continue;
    }
    if(/[0-9]/.test(ch)){ let j=i+1; while(j<src.length && /[0-9._xXa-fA-F]/.test(src[j])) j++; const num=src.slice(i,j); i=j; push('number',num); continue; }
    if(/[A-Za-z_]/.test(ch)){
      let j=i+1; while(j<src.length && /[A-Za-z0-9_]/.test(src[j])) j++; const word=src.slice(i,j); i=j; if(keywords.has(word)) push('kw',word); else if(builtins.has(word)) push('builtin',word); else out.push(escape(word)); continue;
    }
    out.push(escape(ch)); i++;
  }
  return out.join('');
};

const truncate = (text: string, limit: number) => {
  if (!text) return '';
  if (text.length <= limit) return text;
  return text.slice(0, limit) + '...';
};

export default function ScriptPage() {
  const params = useParams();
  const router = useRouter();
  const scriptId = params?.id as string;

  const { isLoggedIn, userInfo, isAuthLoading, logout } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [script, setScript] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitStatus, setRateLimitStatus] = useState<any>(null);
  const [securityError, setSecurityError] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string>("");
  const [thumbnail, setThumbnail] = useState<string | undefined>(undefined);
  const [thumbnailLoading, setThumbnailLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeError, setLikeError] = useState<string>("");
  const [likeLoaded, setLikeLoaded] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [commentDeleteError, setCommentDeleteError] = useState<string>("");
  const [activeTab, setActiveTab] = useState('script');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string>("");
  const [isOwner, setIsOwner] = useState(false);
  const [ownerLoaded, setOwnerLoaded] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoStatus, setPromoStatus] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoOptions, setPromoOptions] = useState<any[]>([]);
  const [selectedPromo, setSelectedPromo] = useState<number>(0);
  const [userMap, setUserMap] = useState<Record<string, any>>({});
  const titleContainerRef = useRef<HTMLDivElement>(null);

  const [showDeleteScript, setShowDeleteScript] = useState(false);
  const [deleteScriptLoading, setDeleteScriptLoading] = useState(false);
  const [deleteScriptError, setDeleteScriptError] = useState("");
  const [deleteScriptSuccess, setDeleteScriptSuccess] = useState("");

  const currentUserAvatar = (userInfo as any)?.avatar || (userInfo as any)?.accountthumbnail || (userInfo as any)?.profileImage || '/default.png';

  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showFullCode, setShowFullCode] = useState(false);
  const DESC_CHAR_LIMIT = 600;
  const CODE_LINE_LIMIT = 20;

  const [commentsPage, setCommentsPage] = useState(1);
  const COMMENTS_PER_PAGE = 10;
  const totalCommentPages = Math.max(1, Math.ceil(comments.length / COMMENTS_PER_PAGE));
  const paginatedComments = comments.slice((commentsPage - 1) * COMMENTS_PER_PAGE, commentsPage * COMMENTS_PER_PAGE);

             useEffect(() => {
               if (!scriptId) return;
               let aborted = false;
               const controller = new AbortController();

               (async () => {
                 setLoadError("");
                 setScriptLoaded(false);
                 (window as any).showLoadingBar?.();

                 try {
                   const timestamp = Date.now();
                   const cacheBuster = `?t=${timestamp}&cb=${Math.random()}`;

                   const scriptRes = await fetch(`/api/scripts/${scriptId}${cacheBuster}`, {
                     signal: controller.signal,
                     credentials: 'include',
                     headers: {
                       'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
                       'X-Requested-With': 'XMLHttpRequest'
                     }
                   });

                   fetch(`/api/scripts/${scriptId}/view`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ userId: isLoggedIn ? currentUserId : null }),
                     credentials: 'include',
                   }).catch(() => {});

        if (aborted) return;

        if (!scriptRes.ok) {
          const text = await scriptRes.text().catch(()=>"");
          if (aborted) return;
          console.error('Script API error:', scriptRes.status, text);
          setLoadError(`Error loading script: ${scriptRes.status} ${text || scriptRes.statusText}`);
          return;
        }

        const contentType = scriptRes.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          const text = await scriptRes.text().catch(()=>"" );
          if (aborted) return;
          console.error('Non-JSON response:', contentType, text);
          setLoadError(`Non-JSON response: ${text || 'Unsupported content type'}`);
          return;
        }

        const data = await scriptRes.json();
        if (aborted) return;

        console.log('Script data received:', { likes: data.likes, isLiked: data.isLiked });

        setScript(data);
        setEditFormData(data);
        setComments(data.comments || []);
        setLikeCount(data.likes || 0);
        setIsLiked(data.isLiked === true);
        setScriptLoaded(true);
        setLikeLoaded(true);

      } catch (err:any) {
        if (aborted || err?.name === 'AbortError') return;
        console.error('Network error loading script:', err);
        setLoadError('Network error loading script.');
      } finally {
        (window as any).hideLoadingBar?.();
      }
    })();

    return () => { aborted = true; controller.abort(); };
  }, [scriptId, isLoggedIn, currentUserId]);

  useEffect(() => {
    if (isLoggedIn && currentUserId) {
      const status = getUserRateLimitStatus(currentUserId);
      setRateLimitStatus(status);
    }
  }, [isLoggedIn, currentUserId]);

  useEffect(() => {
    if (!scriptId) return;
    setOwnerLoaded(false);

    const checkOwnership = () => {
      if (!script || !userInfo || !isLoggedIn) {
        setIsOwner(false);
        setOwnerLoaded(true);
        return;
      }

      let isOwnerResult = false;

      if (script.ownerUserId && userInfo.id) {
        isOwnerResult = script.ownerUserId.toString() === userInfo.id.toString();

      }

      if (!isOwnerResult && script.ownerUsername && userInfo.username) {
        isOwnerResult = script.ownerUsername.toLowerCase() === userInfo.username.toLowerCase();
      }

      if (!isOwnerResult && script.ownerId && userInfo.username) {
        isOwnerResult = script.ownerId.toLowerCase() === userInfo.username.toLowerCase();
      }

      if (script.isOrphaned === true) {
        isOwnerResult = false;
      }

      setIsOwner(isOwnerResult);
      setOwnerLoaded(true);
    };

    if (script) {
      checkOwnership();
    } else {
      const timer = setTimeout(() => {
        if (script) {
          checkOwnership();
        } else {
          setIsOwner(false);
          setOwnerLoaded(true);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [scriptId, script, isLoggedIn, userInfo]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refreshParam = urlParams.get('refresh');
    const timestampParam = urlParams.get('t');
    const versionParam = urlParams.get('v');
    const fastParam = urlParams.get('fast');

    if (refreshParam === 'true' && timestampParam && versionParam) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      if (scriptId) {
        setScriptLoaded(false);

        if (fastParam === 'true') {
          setScriptLoaded(false);
          setTimeout(() => {
            setScriptLoaded(false);
          }, 5);
        } else {
          setTimeout(() => {
            setScriptLoaded(false);
          }, 10);
        }
      }
    }
  }, [scriptId]);

  useEffect(() => {
    if (scriptId && !script) {
      const preloadData = async () => {
        try {
          const timestamp = Date.now();
          const cacheBuster = `?t=${timestamp}&cb=${Math.random()}`;

          const preloadRes = await fetch(`/api/scripts/${scriptId}${cacheBuster}`, {
            credentials: 'include',
            headers: {
              'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
              'X-Requested-With': 'XMLHttpRequest'
            }
          });

          if (preloadRes.ok) {
            const preloadData = await preloadRes.json();
            setScript(preloadData);
            setEditFormData(preloadData);
            setComments(preloadData.comments || []);
            setLikeCount(preloadData.likes || 0);
            setIsLiked(preloadData.isLiked === true);
            setScriptLoaded(true);
            setLikeLoaded(true);
          }
        } catch (error) {
        }
      };

      preloadData();
    }
  }, [scriptId, script]);

  const formatDescription = (text: string) => {
    if (!text) return '';

    const validatedText = text.length > 5000 ? text.substring(0, 5000) : text;

      const dangerousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /on\w+\s*=/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
        /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
        /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
      ];

      const hasDangerousContent = dangerousPatterns.some(pattern => pattern.test(validatedText));
      if (hasDangerousContent) {
        return escapeHTML(validatedText);
      }

    const lines = validatedText.split('\n');
    const formattedLines = lines.map((line) => {
      const escapedLine = escapeHTML(line);
      let formattedLine = escapedLine;

      formattedLine = formattedLine.replace(/\*\*\*(.*?)\*\*\*/g, (match, p1) => `<strong class="text-white font-bold"><em class="italic">${p1}</em></strong>`);

      formattedLine = formattedLine.replace(/\*\*(.*?)\*\*/g, (match, p1) => `<strong class="text-white font-bold">${p1}</strong>`);

      formattedLine = formattedLine.replace(/(?<!\*)\*(.*?)\*(?!\*)/g, (match, p1) => `<em class="italic text-gray-200">${p1}</em>`);

      formattedLine = formattedLine.replace(/(?<!https?:\/\/)(discord\.(?:gg|com)\/(?:invite\/)?[^\s<>"{}|\\^`[\]]+)/gi, (match, url) => {
        const fullUrl = `https://${url}`;
        return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline break-all">${url}</a>`;
      });

      formattedLine = formattedLine.replace(/(?<!<a[^>]*>)(https?:\/\/[^\s<>"{}|\\^`[\]]+)(?![^<]*<\/a>)/g, (match, url) => {
        if (url.includes('discord.gg/') || url.includes('discord.com/')) {
          return match;
        }
        try {
          new URL(url);
          return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline break-all">${url}</a>`;
        } catch {
          return match;
        }
      });

      if (escapedLine.trim().startsWith('•')) {
        formattedLine = `<div class="flex items-start gap-3 mb-2"><span class="text-blue-400 mt-1">•</span><span class="flex-1">${formattedLine.replace('•', '').trim()}</span></div>`;
      } else if (escapedLine.trim().startsWith('-')) {
        formattedLine = `<div class="flex items-start gap-3 mb-2"><span class="text-blue-400 mt-1">-</span><span class="flex-1">${formattedLine.replace('-', '').trim()}</span></div>`;
      } else if (escapedLine.match(/^\d+\./)) {
        const match = escapedLine.match(/^(\d+\.)\s*(.*)/);
        if (match) {
          formattedLine = `<div class="flex items-start gap-3 mb-2"><span class="text-blue-400 font-bold mt-1">${match[1]}</span><span class="flex-1">${match[2]}</span></div>`;
        }
      } else if (escapedLine.trim()) {
        formattedLine = `<div class="mb-3">${formattedLine}</div>`;
      } else {
        formattedLine = `<div class="mb-1">${escapedLine}</div>`;
      }

      return formattedLine;
    });

    const finalHTML = formattedLines.join('');
    return finalHTML;
  };

  const formatComment = (text: string) => {
    if (!text) return '';

    const validatedText = text.length > 2000 ? text.substring(0, 2000) : text;

    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
    ];

    const hasDangerousContent = dangerousPatterns.some(pattern => pattern.test(validatedText));
    if (hasDangerousContent) {
      return escapeHTML(validatedText);
    }

    const escapedText = escapeHTML(validatedText);
    let formattedText = escapedText;

    formattedText = formattedText.replace(/\*\*\*(.*?)\*\*\*/g, (match, p1) => `<strong class="text-white font-bold"><em class="italic">${p1}</em></strong>`);

    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, (match, p1) => `<strong class="text-white font-bold">${p1}</strong>`);

    formattedText = formattedText.replace(/(?<!\*)\*(.*?)\*(?!\*)/g, (match, p1) => `<em class="italic text-gray-200">${p1}</em>`);

    formattedText = formattedText.replace(/(?<!https?:\/\/)(discord\.(?:gg|com)\/(?:invite\/)?[^\s<>"{}|\\^`[\]]+)/gi, (match, url) => {
      const fullUrl = `https://${url}`;
      return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline break-all">${url}</a>`;
    });

    formattedText = formattedText.replace(/(?<!<a[^>]*>)(https?:\/\/[^\s<>"{}|\\^`[\]]+)(?![^<]*<\/a>)/g, (match, url) => {
      if (url.includes('discord.gg/') || url.includes('discord.com/')) {
        return match;
      }
      try {
        new URL(url);
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline break-all">${url}</a>`;
      } catch {
        return match;
      }
    });

    return formattedText;
  };

  const escapeHTML = (text: string) => {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  };

  const timeAgo = (input: any) => {
    if (!input) return '';
    const date = new Date(input);
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    if (days < 7) return days + 'd ago';
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return weeks + 'w ago';
    const months = Math.floor(days / 30);
    if (months < 12) return months + 'mo ago';
    const years = Math.floor(days / 365);
    return years + 'y ago';
  };

  const scriptCostDisplay = script?.price === 'Paid' ? (script?.priceAmount || script?.amount || script?.cost || '$?') : 'Free';
  const pointsDisplay = script?.points ?? 0;
  const postedAgo = script?.createdAt ? timeAgo(script.createdAt) : '';
  const uploadedAgo = script?.updatedAt || script?.createdAt ? timeAgo(script.updatedAt || script.createdAt) : '';

  const handleLogout = () => {
    logout();
  };

  const handleEditClick = () => {
    if (!isLoggedIn || !currentUserId) {
      alert('Please log in to edit scripts');
      return;
    }

    router.push(`/script/${scriptId}/edit`);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);

    if (script) {
      setEditFormData({
        ...script,
        tags: script.tags || [],
        customThumbnail: script.customThumbnail || script.dbThumbnail || script.databaseThumbnail || script.thumbnailUrl || null
      });
    }

    setImagePreview(null);
    setSaveSuccess("");
    setSecurityError("");
  };

  const handleSaveEdit = async () => {
    if (!currentUserId) return;
    setIsLoading(true);
    setSecurityError("");
    setSaveSuccess("");

    try {
      const editCheck = canEditSpecificScript(currentUserId, scriptId);
      if (!editCheck.allowed) {
        setSecurityError(editCheck.error || "Edit not allowed");
        return;
      }

      const allowedFields = [
        'title', 'features', 'scriptCode', 'gameId', 'isUniversal',
        'price', 'priceAmount', 'discordServer', 'keySystemLink',
        'customThumbnail', 'tags'
      ];

      const submitData: any = {};
      allowedFields.forEach(field => {
        if (editFormData[field] !== undefined) {
          submitData[field] = editFormData[field];
        }
      });

      if (submitData.customThumbnail && !submitData.customThumbnail.startsWith('data:image')) {
        delete submitData.customThumbnail;
      }

      const res = await fetch(`/api/scripts/${scriptId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json();

        if (errorData.error && (errorData.error.includes('timeouted') || errorData.error.includes('Timeout'))) {
          setSecurityError(`❌ ${errorData.error}\n\nPlease check your account settings for more details about your timeout status.`);
          return;
        }

        if (errorData.error) {
          setSecurityError(`❌ ${errorData.error}`);
          return;
        }

        throw new Error('Failed to save script');
      }

      updateScriptEditHistory(currentUserId, scriptId);
      const newStatus = getUserRateLimitStatus(currentUserId);
      setRateLimitStatus(newStatus);
      const updatedScript = {
        ...editFormData,
        updatedAt: new Date(),
      };
      setScript(updatedScript);
      setIsEditing(false);
      if (!updatedScript.features && activeTab === 'description') {
        setActiveTab('script');
      }

      setSaveSuccess('Script saved successfully! Refreshing to show new thumbnail...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setSecurityError('Error saving script. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEditFormData((prev: any) => ({ ...prev, [name]: checked }));
    } else {
      setEditFormData((prev: any) => ({ ...prev, [name]: value }));
    }

  };

  const handleCopyScript = async () => {
    if (!script) return;
    try {
      await navigator.clipboard.writeText(script.scriptCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      alert('Failed to copy script to clipboard');
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentUserId) return;
    const commentCheck = canPostComment(currentUserId);
    if (!commentCheck.allowed) {
      setCommentError(commentCheck.error || "Comment rate limit exceeded");
      return;
    }

    const commentText = newComment.trim();
    const tempComment = {
      id: `temp-${Date.now()}`,
      userId: currentUserId,
      username: userInfo?.username || 'You',
      content: commentText,
      timestamp: new Date().toISOString(),
      isOptimistic: true,
      likes: 0
    };

    setComments(prev => [tempComment, ...prev]);
    setNewComment("");
    setCommentsPage(1);
    setIsPostingComment(true);
    setCommentError("");

    try {
      const csrfRes = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include'
      });
      if (!csrfRes.ok) {
        setCommentError('Failed to get security token');
        return;
      }
      const { csrfToken } = await csrfRes.json();

      const comment = {
        userId: currentUserId,
        content: commentText,
        scriptId,
        csrfToken,
      };
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(comment),
      });

      if (!res.ok) {
        const errorData = await res.json();

        setComments(prev => prev.filter(c => c.id !== tempComment.id));
        setNewComment(commentText);

        if (errorData.error && (errorData.error.includes('timeouted') || errorData.error.includes('Timeout'))) {
          setCommentError(`❌ ${errorData.error}\n\nPlease check your account settings for more details about your timeout status.`);
        } else {
          setCommentError(errorData.error || "Failed to post comment");
        }
        return;
      }

      const savedComment = await res.json();
      setComments(prev => prev.map(c => c.id === tempComment.id ? savedComment : c));
      incrementCommentPostCount(currentUserId);
      const newStatus = getUserRateLimitStatus(currentUserId);
      setRateLimitStatus(newStatus);
    } catch (error) {
      setComments(prev => prev.filter(c => c.id !== tempComment.id));
      setNewComment(commentText);
      setCommentError('Failed to post comment. Please try again.');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleDeleteScript = async (e: React.FormEvent) => {
    e.preventDefault();

    setDeleteScriptLoading(true);
    setDeleteScriptError("");
    setDeleteScriptSuccess("");

    try {
      const res = await fetch(`/api/scripts/${scriptId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (res.ok) {
        setDeleteScriptSuccess("Script deleted successfully!");
        window.location.href = '/home';
      } else {
        const data = await res.json();
        setDeleteScriptError(data.error || "Failed to delete script");
      }
    } catch (error) {
      console.error('Delete request failed:', error);
      setDeleteScriptError("Failed to delete script");
    } finally {
      setDeleteScriptLoading(false);
    }
  };

  const handleLikeToggle = async () => {
    if (!isLoggedIn) {
      alert('Please log in to like scripts');
      return;
    }
    if (isLiking) {
      return;
    }
    setLikeError("");
    setIsLiking(true);

    const wasLiked = isLiked;
    const oldLikeCount = likeCount;

    if (wasLiked) {
      setIsLiked(false);
      setLikeCount(Math.max(0, likeCount - 1));
    } else {
      setIsLiked(true);
      setLikeCount(likeCount + 1);
    }

    try {
      const csrfRes = await fetch('/api/csrf-token', { method: 'GET', credentials: 'include' });
      if (!csrfRes.ok) {
        setIsLiked(wasLiked);
        setLikeCount(oldLikeCount);
        setLikeError('Failed to get security token. Please try again.');
        setTimeout(() => setLikeError("") , 3000);
        return;
      }
      const { csrfToken } = await csrfRes.json();

      const res = await fetch(`/api/scripts/${scriptId}/like`, {
        method: wasLiked ? 'DELETE' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        console.log('Like toggle response:', { liked: data.liked, likeCount: data.likeCount });

        setIsLiked(data.liked || false);
        setLikeCount(data.likeCount || 0);

        setScript((prev: any) => prev ? {
          ...prev,
          likes: data.likeCount || 0
        } : prev);

        setTimeout(async () => {
          try {
            const timestamp = Date.now();
            const cacheBuster = `?t=${timestamp}&cb=${Math.random()}`;
            const refreshRes = await fetch(`/api/scripts/${scriptId}${cacheBuster}`, {
              credentials: 'include',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'X-Requested-With': 'XMLHttpRequest'
              }
            });
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              setScript(refreshData);
              console.log('Script data refreshed after like/unlike');
            }
          } catch (err) {
            console.log('Failed to refresh script data:', err);
          }
        }, 1000);
      } else {
        setIsLiked(wasLiked);
        setLikeCount(oldLikeCount);

        if (data.error && (data.error.includes('timeouted') || data.error.includes('Timeout'))) {
          setLikeError(`❌ ${data.error}\n\nPlease check your account settings for more details about your timeout status.`);
        } else {
          setLikeError(data.error || `Failed to ${wasLiked ? 'remove' : 'add'} like.`);
        }
        setTimeout(() => setLikeError("") , 3000);
      }
    } catch {
      setIsLiked(wasLiked);
      setLikeCount(oldLikeCount);
      setLikeError('Failed to update like. Please try again.');
      setTimeout(() => setLikeError("") , 3000);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUserId) return;
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    const deleteCheck = canDeleteComment(currentUserId);
    if (!deleteCheck.allowed) {
      setCommentDeleteError(deleteCheck.error || "Comment delete rate limit exceeded");
      setTimeout(() => setCommentDeleteError("") , 3000);
      return;
    }
    setDeletingCommentId(commentId);
    setCommentDeleteError("");
    try {
      const csrfRes = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include'
      });
      if (!csrfRes.ok) {
        setCommentDeleteError('Failed to get security token');
        setTimeout(() => setCommentDeleteError("") , 3000);
        return;
      }
      const { csrfToken } = await csrfRes.json();

      const res = await fetch("/api/comments", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ commentId, userId: currentUserId, scriptId }),
      });

      if (!res.ok) {
        const errorData = await res.json();

        if (errorData.error && (errorData.error.includes('timeouted') || errorData.error.includes('Timeout'))) {
          setCommentDeleteError(`❌ ${errorData.error}\n\nPlease check your account settings for more details about your timeout status.`);
        } else {
          setCommentDeleteError(errorData.error || 'Failed to delete comment');
        }
        setTimeout(() => setCommentDeleteError("") , 3000);
        return;
      }

      setComments(prev => prev.filter(comment => comment.id !== commentId));
      incrementCommentDeleteCount(currentUserId);
      const newStatus = getUserRateLimitStatus(currentUserId);
      setRateLimitStatus(newStatus);
    } catch (error) {
      setCommentDeleteError('Failed to delete comment. Please try again.');
      setTimeout(() => setCommentDeleteError("") , 3000);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportError, setReportError] = useState('');
  const maxReportLen = 2000;

  const submitReport = async () => {
    const sanitized = reportReason.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
    if (sanitized.length === 0) { setShowReportModal(false); setReportReason(''); setReportError(''); return; }
    if (sanitized.length < 3) { setReportError('Reason too short'); return; }
    try {
      const res = await fetch(`/api/scripts/${scriptId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: sanitized.slice(0, maxReportLen) }),
        credentials: 'include'
      });
      if (res.ok) {
        setShowReportModal(false);
        setReportReason('');
        setReportError('');
        alert('Reported');
      } else {
        setReportError('Failed to report');
      }
    } catch {
      setReportError('Failed to report');
    }
  };

  const [showCommentReport, setShowCommentReport] = useState<{ open: boolean, commentId: string | null }>({ open: false, commentId: null });
  const [commentReportReason, setCommentReportReason] = useState('');
  const [commentReportError, setCommentReportError] = useState('');
  const submitCommentReport = async () => {
    if (!showCommentReport.commentId) { setShowCommentReport({ open: false, commentId: null }); return; }
    const sanitized = commentReportReason.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
    if (sanitized.length === 0) { setShowCommentReport({ open: false, commentId: null }); setCommentReportReason(''); setCommentReportError(''); return; }
    if (sanitized.length < 3) { setCommentReportError('Reason too short'); return; }
    try {
      const res = await fetch('/api/comments/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: showCommentReport.commentId, scriptId, reason: sanitized.slice(0, maxReportLen) }),
        credentials: 'include'
      });
      if (res.ok) {
        setShowCommentReport({ open: false, commentId: null });
        setCommentReportReason('');
        setCommentReportError('');
        alert('Comment reported');
      } else {
        setCommentReportError('Failed to report');
      }
    } catch {
      setCommentReportError('Failed to report');
    }
  };

  useEffect(() => {
    if (!comments || comments.length === 0) return;
    const uniqueKeys = Array.from(new Set(comments.map(c => c.username || c.userId).filter(Boolean)));
    (async () => {
      try {
        const res = await fetch('/api/users/meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames: uniqueKeys }),
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          const map: Record<string, any> = {};
          (data.users || []).forEach((u: any) => {
            if (!u) return;
            if (u.username) map[u.username] = u;
            if (u.id) map[u.id] = u;
          });
          setUserMap(map);
        }
      } catch {}
    })();
  }, [comments]);

  useEffect(() => {
    if (!script) return;
    const chosen = script.customThumbnail || script.dbThumbnail || script.databaseThumbnail || script.thumbnailUrl || (script.isUniversal ? "/universal.png" : "/no-thumbnail.png");
    setThumbnail(chosen);
    setThumbnailLoading(false);
  }, [script?.id]);

  useEffect(() => {
    if (!script) return;

    (async () => {
      try {
        const promises: Promise<void>[] = [];

        promises.push(
          fetch(`/api/scripts/${script.id || scriptId}/thumb`, {
            cache: 'no-store',
            credentials: 'include',
          }).then(async (r) => {
            if (r.ok) {
              const j = await r.json();
              if (j.thumbnail) setThumbnail(j.thumbnail);
            }
          }).catch(() => {})
        );

        if (script.ownerId) {
          const needs = !script.ownerAvatar || script.ownerAvatar === '/default.png';
          if (needs) {
            promises.push(
              fetch('/api/users/meta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usernames: [script.ownerId] }),
                credentials: 'include',
              }).then(async (res) => {
                if (res.ok) {
                  const data = await res.json();
                  const found = data.users?.find((u: any) => u.username?.toLowerCase() === script.ownerId.toLowerCase());
                  if (found && found.accountthumbnail) {
                    setScript((prev: any) => ({ ...prev, ownerAvatar: found.accountthumbnail }));
                  }
                }
              }).catch(() => {})
            );
          }
        }

        await Promise.all(promises);
      } catch {}

      setThumbnailLoading(false);
    })();
  }, [script?.id, scriptId]);

  useEffect(() => {
    if (isLoggedIn && userInfo && userInfo.id) {
      setCurrentUserId(userInfo.id);
    }
  }, [isLoggedIn, userInfo]);

  useEffect(() => {
    setPromoOptions([
      {
        title: "Promotion Code",
        info: "Enter a promotion code to boost your script's visibility and points"
      },
      {
        title: "Age Reset Code",
        info: "Enter an age reset code to reset your script's age to current time"
      }
    ]);
  }, []);

  const titleFontSize = 30;

  const allReady = scriptLoaded && ownerLoaded;

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <div className="w-20 h-20 border-4 border-gray-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Script Not Found</h1>
          <p className="text-gray-400 text-lg">The script you're looking for doesn't exist or has been removed.</p>
          <div className="mt-6">
            <a href="/home" className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
              Return to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!allReady) {
    return null;
  }

  const isBumped = script?.isBumped && script?.bumpExpire && new Date(script.bumpExpire) > new Date();
  const bumpHoursLeft = isBumped ? Math.ceil((new Date(script.bumpExpire).getTime() - Date.now()) / (1000 * 60 * 60)) : 0;

  const handleBump = async () => {
    if (!scriptId) return;
    if (isBumped) {
      alert(`Already Bumped. Next bump in ${bumpHoursLeft} hour${bumpHoursLeft !== 1 ? 's' : ''}`);
      return;
    }
    try {
      const csrfRes = await fetch('/api/csrf-token', { method: 'GET', credentials: 'include' });
      const { csrfToken } = csrfRes.ok ? await csrfRes.json() : { csrfToken: '' };

      const res = await fetch(`/api/scripts/${scriptId}/bump`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-csrf-token': csrfToken || '' },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setScript(prev => ({
          ...prev,
          isBumped: true,
          bumpExpire: data.bumpExpire,
          points: data.newPoints || prev.points
        }));
        alert('Script bumped successfully!');
      } else if (data && data.error) {
        if (data.error.includes('timeouted') || data.error.includes('Timeout')) {
          alert(`❌ ${data.error}\n\nPlease check your account settings for more details about your timeout status.`);
        } else {
          alert(data.error);
        }
      }
    } catch {
      alert('Failed to bump. Please try again.');
    }
  };

  return (
    <div className={`${isEditing ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-gray-900 text-white`}>

       <style jsx global>{`
         ::-webkit-scrollbar { width: 8px; height: 8px; }
         ::-webkit-scrollbar-track { background: #111827; }
         ::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
         ::-webkit-scrollbar-thumb:hover { background: #6b7280; }
         * { scrollbar-width: thin; scrollbar-color: #4b5563 #111827; }
         code.language-lua .token-comment { color: #637777; font-style: italic; }
         code.language-lua .token-string { color: #A3BE8C; }
         code.language-lua .token-number { color: #D08770; }
         code.language-lua .token-kw { color: #81A1C1; }
         code.language-lua .token-builtin { color: #B48EAD; }
         code.language-lua { display: block; }
       `}</style>

       <main className={`w-full mx-auto py-8 sm:py-10 lg:py-12 px-1 sm:px-2 lg:px-4 max-w-6xl flex flex-col gap-8 sm:gap-12 ${isEditing ? 'hidden' : ''}`}>

         {showReportModal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
             <div className="w-full max-w-lg bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-4">
               <div className="flex items-center justify-between mb-3">
                 <h3 className="text-lg font-semibold">Report Script</h3>
                 <button onClick={() => { setShowReportModal(false); setReportReason(''); setReportError(''); }} className="text-gray-400 hover:text-white">✕</button>
               </div>
               <textarea
                 value={reportReason}
                 onChange={(e) => { if (e.target.value.length <= maxReportLen) setReportReason(e.target.value); }}
                 placeholder="Describe the issue (max 2000 chars)"
                 className="w-full h-40 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
               />
               <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                 <span>{reportReason.length}/{maxReportLen}</span>
                 {reportError && <span className="text-red-400">{reportError}</span>}
               </div>
               <div className="mt-4 flex justify-end gap-2">
                 <button onClick={() => { setShowReportModal(false); setReportReason(''); setReportError(''); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Cancel</button>
                 <button onClick={submitReport} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Submit</button>
               </div>
             </div>
           </div>
         )}

         {showCommentReport.open && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
             <div className="w-full max-w-lg bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-4">
               <div className="flex items-center justify-between mb-3">
                 <h3 className="text-lg font-semibold">Report Comment</h3>
                 <button onClick={() => { setShowCommentReport({ open: false, commentId: null }); setCommentReportReason(''); setCommentReportError(''); }} className="text-gray-400 hover:text-white">✕</button>
               </div>
               <textarea
                 value={commentReportReason}
                 onChange={(e) => { if (e.target.value.length <= maxReportLen) setCommentReportReason(e.target.value); }}
                 placeholder="Describe the issue (max 2000 chars)"
                 className="w-full h-40 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
               />
               <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                 <span>{commentReportReason.length}/{maxReportLen}</span>
                 {commentReportError && <span className="text-red-400">{commentReportError}</span>}
               </div>
               <div className="mt-4 flex justify-end gap-2">
                 <button onClick={() => { setShowCommentReport({ open: false, commentId: null }); setCommentReportReason(''); setCommentReportError(''); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Cancel</button>
                 <button onClick={submitCommentReport} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Submit</button>
               </div>
             </div>
           </div>
         )}

         <header className="flex flex-col lg:grid lg:grid-cols-12 gap-5 sm:gap-8">

          <div className="lg:col-span-5 order-1 w-full max-w-[240px] xs:max-w-[280px] sm:max-w-full mx-auto flex items-center justify-center">
            <div className="relative group rounded-2xl overflow-hidden border border-gray-800 bg-gradient-to-br from-gray-950 to-gray-900 shadow-xl ring-1 ring-black/40 aspect-square w-full max-w-[240px] xs:max-w-[280px] sm:max-w-full">
              {thumbnailLoading || !thumbnail ? (
                <div className="w-16 h-16 border-8 border-gray-600/30 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Image
                  src={thumbnail}
                  alt={script.title}
                  fill
                  sizes="(max-width:768px) 100vw, 40vw"
                  className="object-cover select-none transition-transform duration-700 ease-out group-hover:scale-105"
                  priority
                />
              )}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_60%)] mix-blend-overlay" />
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col order-2 w-full">
            <div className="flex flex-col gap-6 pt-0 w-full">

              <div className="flex flex-col gap-3 w-full">
                                 <div ref={titleContainerRef} className="w-full">
                   <h1 className="block font-bold leading-tight text-white drop-shadow-sm max-w-full w-full break-words whitespace-normal mb-2" style={{
                     fontSize: `${titleFontSize}px`,
                     lineHeight: '1.1'
                   }}>
                     <span className="block w-full break-words whitespace-normal">{script.title}</span>
                   </h1>
                 </div>
                                 <div className="flex flex-wrap items-center gap-3 text-[15px] text-gray-400 w-full">
                   <div className="flex items-center gap-1.5">{script.price === 'Paid' ? <LockedIcon /> : <UnlockedIcon />}<span className={script.price === 'Paid' ? 'text-yellow-300' : 'text-green-300'}>{script.price === 'Paid' ? `Paid ${script.priceAmount ? script.priceAmount + '$' : ''}` : 'Free'}</span></div>
                   <div className="flex items-center gap-1.5"><CoinIcon /><span>{Math.floor(pointsDisplay).toLocaleString()} pts</span></div>
                   {postedAgo && <div className="flex items-center gap-1.5"><ClockIcon /><span>{postedAgo}</span></div>}
                   <div className="flex items-center gap-1.5"><EyeIcon /><span>{script.views}</span></div>
                   <div className="flex items-center gap-1.5"><HeartIcon /><span>{likeCount.toLocaleString()}</span></div>
                   <div className="flex items-center gap-1.5"><CommentIcon /><span>{comments.length}</span></div>
                 </div>
              </div>

              <div className={isOwner ? "grid grid-cols-2 gap-2 w-full max-w-xl h-[240px] overflow-hidden" : "grid grid-cols-1 gap-2 w-full max-w-xl h-[240px] overflow-hidden"}>
                {isOwner ? (
                  <>
                    <button onClick={handleCopyScript} className="h-full min-h-0 px-2 text-xs flex items-center justify-center gap-2 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-200 hover:text-white transition-colors active:scale-[.97]"><CopyIcon /><span>{copied ? 'Copied!' : 'Copy'}</span></button>
                    <button onClick={() => { const scriptContent = script?.scriptCode || script?.code || script?.content || script?.script; if (scriptContent) { const blob = new Blob([scriptContent], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${script.title || 'script'}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); } }} className="h-full min-h-0 px-2 text-xs flex items-center justify-center gap-2 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-200 hover:text-white transition-colors active:scale-[.97]"><DownloadIcon /><span>Download</span></button>
                    <button onClick={handleLikeToggle} disabled={!likeLoaded || isLiking} className="h-full min-h-0 px-2 text-xs flex items-center justify-center gap-2 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-200 hover:text-white text-xs font-medium active:scale-[.97] disabled:opacity-50 disabled:cursor-not-allowed">
                      <HeartIcon />
                      <span>{isLiking ? '...' : (isLiked ? 'Liked' : 'Like')}</span>
                    </button>
                    <button onClick={handleEditClick} disabled={isEditing || script?.isOrphaned} className="h-full min-h-0 px-2 text-xs flex items-center justify-center gap-2 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-200 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.97]"><EditIcon /><span>{script?.isOrphaned ? 'Orphaned' : 'Edit'}</span></button>
                    <button
                      onClick={handleBump}
                      disabled={script?.isOrphaned}
                      className="h-full min-h-0 px-2 text-xs flex items-center justify-center gap-2 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-200 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.97]"
                      title={script?.isOrphaned ? "Orphaned scripts cannot be bumped" : "Bump script"}
                    >
                      <BumpIcon />
                      <span>{isBumped ? `Bumped (${bumpHoursLeft}h left)` : 'Bump'}</span>
                    </button>
                    <button onClick={() => setShowPromoInput(true)} disabled={script?.isOrphaned} className={`h-full min-h-0 px-2 text-xs flex items-center justify-center gap-2 rounded-lg transition-colors active:scale-[.97] ${script?.isOrphaned ? 'bg-gray-700/30 text-gray-500 cursor-not-allowed' : 'bg-gray-700/60 hover:bg-gray-700 text-gray-200 hover:text-white'}`}><PromoteIcon /><span>{script?.isOrphaned ? 'Orphaned' : script?.promotionActive && script?.promotionCode ? 'Use Age Reset' : 'Promote'}</span></button>
                    <button
                      onClick={async () => {
                        if (!script || !currentUserId) return;
                        const newStatus = script.status === 'Patched' || script.status === 'patched' ? 'Functional' : 'Patched';
                        try {
                          const csrfResponse = await fetch('/api/csrf-token', {
                            method: 'GET',
                            credentials: 'include'
                          });

                          if (!csrfResponse.ok) {
                            alert('Failed to get security token');
                            return;
                          }

                          const { csrfToken } = await csrfResponse.json();

                          const res = await fetch(`/api/scripts/${scriptId}/status`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              'x-csrf-token': csrfToken,
                              ...(currentUserId ? { 'x-user-id': currentUserId } : {})
                            },
                            body: JSON.stringify({ status: newStatus }),
                            credentials: 'include',
                          });
                          if (res.ok) {
                            setScript((prev: any) => prev ? { ...prev, status: newStatus, updatedAt: new Date() } : prev);
                          } else {
                            const err = await res.json();
                            if (err.error && (err.error.includes('timeouted') || err.error.includes('Timeout'))) {
                              alert(`❌ ${err.error}\n\nPlease check your account settings for more details about your timeout status.`);
                            } else {
                              alert(err.error || 'Failed to change status');
                            }
                          }
                        } catch {
                          alert('Network error changing status');
                        }
                      }}
                      disabled={script?.isOrphaned}
                      className="h-full min-h-0 px-2 text-xs flex items-center justify-center gap-2 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.97]"
                      title={script?.isOrphaned ? "Orphaned scripts cannot be modified" : "Toggle script status"}
                    >
                      <span>{script?.status === 'Patched' || script.status === 'patched' ? 'Tag as Functional' : 'Tag as Patched'}</span>
                    </button>
                    <div className="h-full min-h-0 px-2 text-xs flex items-center justify-center gap-2 rounded-lg bg-gray-700/30 text-white select-none">
                      Points Multiplier: x{(script.multiplier !== undefined ? script.multiplier : 1).toFixed(2)}
                    </div>
                  </>
                ) : (
                  <>
                    <button onClick={handleCopyScript} className="w-full h-full min-h-0 flex items-center justify-center gap-2 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-200 hover:text-white text-xs font-medium active:scale-[.97]"><CopyIcon /><span>{copied ? 'Copied!' : 'Copy'}</span></button>
                    <button onClick={() => { const scriptContent = script?.scriptCode || script?.code || script?.content || script?.script; if (scriptContent) { const blob = new Blob([scriptContent], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${script.title || 'script'}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); } }} className="w-full h-full min-h-0 flex items-center justify-center gap-2 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-200 hover:text-white text-xs font-medium active:scale-[.97]"><DownloadIcon /><span>Download</span></button>
                    <button onClick={handleLikeToggle} disabled={!likeLoaded || isLiking} className="w-full h-full min-h-0 px-2 text-xs flex items-center justify-center gap-2 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-200 hover:text-white text-xs font-medium active:scale-[.97] disabled:opacity-50 disabled:cursor-not-allowed">
                      <HeartIcon />
                      <span>{isLiking ? '...' : (isLiked ? 'Liked' : 'Like')}</span>
                    </button>
                    <button onClick={async () => {
                      if (isOwner) return;
                      if (!isLoggedIn) { alert('Only logged people can report'); return; }
                      setShowReportModal(true);
                    }} className="w-full h-full min-h-0 px-2 text-xs flex items-center justify-center gap-2 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-200 hover:text-white text-xs font-medium active:scale-[.97]"><FlagIcon /><span>Report</span></button>
                  </>
                )}
              </div>

              {script?.isOrphaned && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <span className="font-semibold">⚠️ Orphaned Script:</span>
                    <span>This script's owner account has been deleted. The script is preserved for reference but cannot be modified.</span>
                  </div>
                </div>
              )}

               <div className="mt-2 flex w-full flex-col lg:flex-row lg:items-center gap-3">

                  <div className="w-full lg:w-1/2 flex flex-col gap-2">

                     <div className="flex flex-wrap items-center gap-2 text-sm sm:text-xs justify-start">
                       {script.status && (
                         <span className={`flex-grow flex items-center justify-center gap-1 px-3 py-1.5 sm:px-2 sm:py-0.5 rounded ${script.status === 'Functional' ? 'bg-emerald-900/60 border border-emerald-400 text-emerald-300' : 'bg-rose-900/60 border border-rose-400 text-rose-300'} ml-0`} style={{ minHeight: '32px' }}>{displayStatus(script.status)}</span>
                       )}
                       {script.gameId && script.gameId !== 'universal' ? (
                         <a href={`https://www.roblox.com/games/${script.gameId}`} target="_blank" rel="noopener noreferrer" className="flex-grow flex items-center justify-center gap-1 px-3 py-1.5 sm:px-2 sm:py-0.5 rounded bg-indigo-900/60 border border-indigo-400 text-indigo-300 ml-0" style={{ minHeight: '32px' }}>
                             <span>{script.gameName || script.gameTitle || 'Game'}</span>
                           </a>
                       ) : (
                         <span className="flex-grow flex items-center justify-center gap-1 px-3 py-1.5 sm:px-2 sm:py-0.5 rounded bg-orange-900/60 border border-orange-400 text-orange-300 ml-0" style={{ minHeight: '32px' }}>
                           Universal
                         </span>
                       )}
                       {(script.ownerVerified || script.ownerIsVerified || script.verified) && (
                         <span className="flex-grow flex items-center justify-center gap-1 px-3 py-1.5 sm:px-2 sm:py-0.5 rounded bg-green-900/60 border border-green-400 text-green-300 ml-0" style={{ minHeight: '32px' }}>
                           <VerifiedIcon /> Verified
                         </span>
                       )}
                     </div>

                      <div className="flex flex-wrap items-center gap-2 text-sm sm:text-xs justify-start mt-0.5">
                        <div className="flex-grow flex items-center justify-center -ml-3">
                          <span className="text-gray-400 text-xs">
                            Points Multiplier: x{(script.multiplier !== undefined ? script.multiplier : 1).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex-grow flex items-center justify-center -ml-5">
                          <span className="text-gray-400 text-xs">
                            Promotion Tier: {script.promotionActive ? (script.promotionTier || 'Active') : 'None'}
                            {script.promotionExpiresAt && (
                              <span className="block mt-1">
                                Expires at: {new Date(script.promotionExpiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </span>
                            )}
                          </span>
                        </div>

                      </div>
                  </div>

                  <div className="w-full lg:w-1/2 flex flex-col sm:flex-row items-start sm:items-center gap-3">

                    <div className="flex items-center gap-3 lg:gap-4 mx-auto sm:ml-auto">
                      <a href={`/profile/${script.ownerId || 'Unknown'}`} className="group relative w-16 h-16 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl border border-gray-800 ring-1 ring-gray-800 bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center overflow-hidden shadow shadow-black/40 transition-transform hover:scale-[1.04] focus:outline-none focus:ring-2 focus:ring-indigo-400/50">
                        <Avatar src={script.ownerAvatar} alt={script.ownerId || 'owner'} size={64} className="w-16 h-16 sm:w-14 sm:h-14 lg:w-16 lg:h-16" />
                        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.07),transparent_70%)]" />
                      </a>
                      <div className="flex flex-col items-start">
                        <span className="text-[11px] sm:text-[10px] lg:text-[11px] tracking-wide uppercase text-gray-500 select-none">Uploaded by</span>
                        <div className="flex items-center gap-2">
                          <a href={`/profile/${script.ownerId || 'Unknown'}`} className="text-white text-base sm:text-sm lg:text-base hover:underline hover:decoration-indigo-400 underline-offset-2 transition-colors leading-snug">{script.ownerId || 'Unknown User'}</a>
                          {(() => {
                            const shouldShowVerified = script.ownerVerified || script.ownerIsVerified || script.verified || script.isVerified;
                            return shouldShowVerified && (
                              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            );
                          })()}
                        </div>
                        {script.ownerTotalViews && (
                          <span className="text-[10px] sm:text-[9px] lg:text-[11px] text-gray-500 mt-0.5">{script.ownerTotalViews} total views</span>
                        )}
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </header>

        <section className="bg-gray-900/50 rounded-2xl border border-gray-700 p-5 sm:p-6">
          <h2 className="text-2xl text-white mb-4">Description</h2>
          <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed">
            <div
              dangerouslySetInnerHTML={{
                __html: showFullDesc || !script.features || script.features.length <= DESC_CHAR_LIMIT
                  ? formatDescription(script.features)
                  : formatDescription(script.features.slice(0, DESC_CHAR_LIMIT) + '...')
              }}
            />
            {script.features && script.features.length > DESC_CHAR_LIMIT && (
              <button
                className="mt-4 inline-flex items-center gap-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 px-3 py-1.5 rounded-md text-xs tracking-wide border border-indigo-500/40 shadow-sm transition-colors"
                onClick={() => setShowFullDesc(v => !v)}
              >
                {showFullDesc ? 'Show Less' : 'Show More'}
              </button>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-700 bg-gray-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-700">
            <h3 className="text-sm tracking-wide text-gray-200 select-none">RAW CODE</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyScript}
                title={copied ? 'Copied!' : 'Copy'}
                aria-label="Copy script"
                className={`relative w-11 h-11 flex items-center justify-center rounded-md bg-gray-700/60 hover:bg-gray-700 text-gray-200 hover:text-white transition-colors transition-transform ${copied ? 'ring-2 ring-indigo-400 scale-105 bg-gray-600/70' : ''}`}
              >
                <CopyIcon />
                {copied && (
                  <span className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow animate-pulse select-none">Copied</span>
                )}
              </button>
              <button
                 onClick={() => { const scriptContent = script?.scriptCode || script?.code || script?.content || script?.script; if (scriptContent) { const blob = new Blob([scriptContent], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${script.title || 'script'}.txt`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); } }}
                 title="Download"
                 aria-label="Download script"
                 className="w-11 h-11 flex items-center justify-center rounded-md bg-gray-700/60 hover:bg-gray-700 text-gray-200 hover:text-white transition-colors"
              >
                <DownloadIcon />
              </button>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            <pre className="m-0 p-0 text-[15px] md:text-[16px] leading-relaxed font-mono text-gray-200 whitespace-pre overflow-x-auto">
              <code
                className="language-lua"
                data-lang="lua"
                dangerouslySetInnerHTML={{
                  __html: highlightLuau(
                    (showFullCode || !script.scriptCode || script.scriptCode.split('\n').length <= CODE_LINE_LIMIT)
                      ? (script.scriptCode || '')
                      : script.scriptCode.split('\n').slice(0, CODE_LINE_LIMIT).join('\n') + '\n...'
                  )
                }}
              />
            </pre>
          </div>
        </section>

        {(script.discordServer || script.keySystemLink) && (
          <section className="bg-gray-900/50 rounded-2xl border border-gray-700 p-5 sm:p-6">
            <h2 className="text-2xl text-white mb-4">Connections</h2>
            <div className="space-y-3">
              {script.keySystemLink && (
                <a
                  href={script.keySystemLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-4 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <KeyIcon />
                  <span>Key System</span>
                </a>
              )}
              {script.discordServer && (
                <a
                  href={script.discordServer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white px-4 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <DiscordIcon />
                  <span>Discord Server</span>
                </a>
              )}
            </div>
          </section>
        )}

        <section className="bg-gray-900/50 rounded-2xl border border-gray-700 p-5 sm:p-6">
          <h2 className="text-2xl text-white mb-4">Comments ({comments.length})</h2>
          <div className="space-y-6">
            <div className="space-y-4">
              {paginatedComments.map((comment) => {
                const isCurrentUserComment = comment.userId === currentUserId;
                const commenterUsername = comment.username || userMap[comment.userId]?.username || '';
                const displayName = isCurrentUserComment ? (userInfo?.username || 'You') : (commenterUsername || 'User');
                const avatarSrc = isCurrentUserComment ? currentUserAvatar : (userMap[commenterUsername]?.accountthumbnail || userMap[comment.userId]?.accountthumbnail || '/default.png');
                const profileLink = isCurrentUserComment ? `/profile/${userInfo?.username || ''}` : `/profile/${commenterUsername || 'Unknown'}`;
                const commenterVerified = !!(commenterUsername && (userMap[commenterUsername]?.verified || userMap[comment.userId]?.verified));

                return (
                  <div key={comment.id} className={`bg-gray-900/50 rounded-lg p-4 border border-gray-700 relative ${comment.isOptimistic ? 'opacity-70 border-yellow-500/50' : ''}`}>
                    <div className="flex items-start justify-between mb-2 gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <a href={profileLink} className="w-14 h-14 rounded-md bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center overflow-hidden relative shadow shadow-black/30 group">
                          <Avatar src={avatarSrc} alt={displayName} size={56} className="w-14 h-14" />
                          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_65%)]" />
                        </a>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <a
                              href={profileLink}
                              className="text-blue-400 hover:underline underline-offset-2 decoration-indigo-400 transition-colors truncate max-w-[180px]"
                            >
                              {displayName}
                            </a>

                            {((!isCurrentUserComment && commenterVerified) || (isCurrentUserComment && !!userInfo?.verified)) && (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 border border-green-400/70 text-green-200 text-[10px] ml-1 bg-gradient-to-br from-green-900/60 to-green-800/60 font-semibold shadow-lg">
                                <VerifiedIcon />
                                <span>Verified</span>
                              </span>
                            )}

                            {comment.isOptimistic && (
                              <div className="flex items-center gap-1 text-yellow-400 text-xs ml-2">
                                <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                                <span>Posting...</span>
                              </div>
                            )}
                          </div>
                          <div
                            className="text-gray-300 leading-relaxed mt-1 break-words"
                            dangerouslySetInnerHTML={{
                              __html: formatComment(comment.content)
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <span className="text-xs text-gray-500">
                          {comment.timestamp ? timeAgo(comment.timestamp) : ''}
                        </span>

                        {isLoggedIn && comment.userId !== currentUserId && (
                          <button
                            onClick={() => { setShowCommentReport({ open: true, commentId: comment.id }); setCommentReportReason(''); setCommentReportError(''); }}
                            className={`text-gray-500 hover:text-yellow-400 transition-colors`}
                            title="Report comment"
                          >
                            <FlagIcon />
                          </button>
                        )}
                        {comment.userId === currentUserId && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className={`text-gray-500 hover:text-red-400 transition-colors ${deletingCommentId === comment.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Delete comment"
                            disabled={deletingCommentId === comment.id}
                          >
                            {deletingCommentId === comment.id ? (
                              <span className="animate-spin w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full inline-block"></span>
                            ) : (
                              <TrashIcon />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {navigator.clipboard.writeText(comment.id)}}
                      className="absolute bottom-2 right-3 text-xs text-gray-500 hover:text-indigo-400 focus:outline-none focus:underline underline-offset-2 transition-colors bg-gray-800/80 px-2 py-1 rounded shadow"
                      title="Copy comment ID"
                      type="button"
                    >
                      Copy ID
                    </button>
                  </div>
                );
              })}
              {comments.length === 0 && (
                <div className="text-center py-4 text-gray-500 border border-dashed border-gray-600/50 rounded-lg bg-gray-900/40">
                  <p className="text-sm">No comments yet. {isLoggedIn ? 'Be the first to share something.' : 'Log in to start the conversation.'}</p>
                </div>
              )}
            </div>

            {totalCommentPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button disabled={commentsPage === 1} onClick={() => setCommentsPage(p => Math.max(1, p - 1))} className="px-4 py-2 rounded-lg bg-gray-200 disabled:bg-gray-300 text-black font-medium hover:bg-gray-300 transition-colors disabled:cursor-not-allowed shadow-sm">Prev</button>
                <span className="text-sm text-gray-600">Page {commentsPage} / {totalCommentPages}</span>
                <button disabled={commentsPage === totalCommentPages} onClick={() => setCommentsPage(p => Math.min(totalCommentPages, p + 1))} className="px-4 py-2 rounded-lg bg-gray-200 disabled:bg-gray-300 text-black font-medium hover:bg-gray-300 transition-colors disabled:cursor-not-allowed shadow-sm">Next</button>
              </div>
            )}
            {isLoggedIn && (
              <div className="flex items-start gap-4 pt-6">
                <div className="w-[96px] h-[96px] min-w-[96px] min-h-[96px] rounded-lg overflow-hidden border border-gray-800 ring-1 ring-gray-800 hover:ring-gray-700 transition-colors bg-gradient-to-br from-gray-900 to-gray-800 flex-shrink-0 shadow-inner shadow-black/30 relative">
                  <Avatar src={currentUserAvatar} alt="You" size={96} className="w-[96px] h-[96px]" />
                  <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(140deg,rgba(255,255,255,0.06),transparent)]" />
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts..."
                    className="w-full bg-gray-800 border border-gray-600 hover:border-gray-500 focus:border-indigo-400 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors transition-shadow min-h-[96px] shadow-sm focus:shadow-indigo-900/30"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handlePostComment}
                      disabled={!newComment.trim() || isPostingComment}
                      className="px-5 py-2 rounded-lg font-medium transition-all bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 text-white shadow hover:shadow-indigo-900/30 disabled:shadow-none"
                    >
                      {isPostingComment ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                  {commentError && <p className="text-red-400 text-sm mt-2">{commentError}</p>}
                </div>
              </div>
            )}
          </div>
        </section>

         {script.tags && script.tags.length > 0 && (
           <section className="mt-1 mb-1">
             <h3 className="text-lg font-bold text-gray-900 mb-1">Tags</h3>
             <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
               {script.tags.map((tag:string) => (
                 <span key={tag} className="inline-block px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-white text-sm font-medium select-none hover:bg-gray-600 transition-colors duration-150">
                   {tag}
                 </span>
               ))}
             </div>
           </section>
         )}
      </main>

      {isEditing && (
        <div className="fixed inset-0 bg-gray-900 z-50 overflow-hidden">
          <div className="w-full h-screen overflow-y-auto p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-white">Edit Script</h2>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-400 hover:text-white text-2xl p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="space-y-6">

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Script Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={editFormData.title}
                    onChange={handleInputChange}
                    placeholder="Enter script title..."
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                           Game ID (Place ID) {!editFormData.isUniversal && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type="text"
                      name="gameId"
                      value={editFormData.gameId || ''}
                      onChange={handleInputChange}
                      disabled={editFormData.isUniversal}
                      placeholder="Enter Roblox game ID"
                      className={`w-full px-4 py-3 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white ${
                        editFormData.isUniversal
                          ? 'bg-gray-700 cursor-not-allowed opacity-60'
                          : 'bg-gray-800'
                      }`}
                    />
                  </div>

                  <div className="flex flex-col justify-end mb-1">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isUniversal"
                        name="isUniversal"
                        checked={editFormData.isUniversal}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setEditFormData((prev: any) => ({
                            ...prev,
                            isUniversal: checked,
                            gameId: checked ? "universal" : ""
                          }));
                        }}
                        className="w-5 h-5 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-offset-gray-900"
                      />
                      <label htmlFor="isUniversal" className="ml-3 text-sm text-gray-300">
                        Universal Script (works on all games)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Script Type</label>
                    <select name="price" value={editFormData.price} onChange={handleInputChange} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-white">
                      <option value="Free">Free</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                </div>
                {editFormData.price === 'Paid' && (
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Price Amount (e.g. $5 or 5 USD)</label>
                    <input type="text" name="priceAmount" value={editFormData.priceAmount || ''} onChange={handleInputChange} placeholder="$5" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white" />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Key System Link (Optional)</label>
                    <input
                      type="url"
                      name="keySystemLink"
                      value={editFormData.keySystemLink || ''}
                      onChange={handleInputChange}
                      placeholder="https://example.com/getkey"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Discord Server (Optional)</label>
                    <input
                      type="url"
                      name="discordServer"
                      value={editFormData.discordServer || ''}
                      onChange={handleInputChange}
                      placeholder="https://discord.gg/3WwQsq78mE"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">Custom Thumbnail</label>
                  <div className="mt-2 flex justify-center items-center w-full">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 hover:border-white transition-colors w-80 h-80 mx-auto text-center flex items-center justify-center">
                      {imagePreview ? (
                        imagePreview.startsWith('data:image') ? (
                          <Image src={imagePreview} alt="Thumbnail Preview" width={320} height={320} className="w-full h-full object-cover rounded-lg" />
                        ) : imagePreview.startsWith('http') || imagePreview.startsWith('/') ? (
                          <Image src={imagePreview} alt="Thumbnail Preview" width={320} height={320} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <div className="space-y-1 text-gray-500">
                            <div className="text-sm">{imagePreview}</div>
                          </div>
                        )
                      ) : script?.thumbnailUrl ? (
                        <Image src={script.thumbnailUrl} alt="Current Thumbnail" width={320} height={320} className="w-full h-full object-cover rounded-lg opacity-60" />
                      ) : (
                        <div className="space-y-1 text-gray-500">
                          <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <div className="flex text-sm justify-center">
                            <span className="font-medium text-purple-400">Upload a file</span>
                          </div>
                        </div>
                      )}
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              setImagePreview("Checking image...");

                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const originalBase64 = reader.result as string;

                                try {
                                  const uploadValidation = await ImageOptimizer.validateUpload(originalBase64, ImagePresets.thumbnail);
                                  if (!uploadValidation.canUpload) {
                                    setImagePreview(`❌ ${uploadValidation.issues.join(', ')}`);
                                    setEditFormData((prev: any) => ({ ...prev, customThumbnail: null }));
                                    return;
                                  }

                                  setImagePreview("Optimizing image...");

                                  const optimized = await ImageOptimizer.optimizeImage(originalBase64, ImagePresets.thumbnail);

                                  const originalSize = Math.round(ImageOptimizer.getBase64FileSize(originalBase64) / 1024);
                                  const optimizedSize = Math.round(optimized.fileSize / 1024);
                                  const savings = Math.round(((originalSize - optimizedSize) / originalSize) * 100);

                                  setEditFormData((prev: any) => ({ ...prev, customThumbnail: optimized.dataUrl }));
                                  setImagePreview(optimized.dataUrl);

                                } catch (optimizationError) {

                                  setEditFormData((prev: any) => ({ ...prev, customThumbnail: originalBase64 }));
                                  setImagePreview(originalBase64);
                                }
                              };
                              reader.readAsDataURL(file);
                            } catch (error) {

                              setImagePreview(null);
                              setEditFormData((prev: any) => ({ ...prev, customThumbnail: null }));
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Leave empty to use automatic game thumbnail. Recommended: 512x512px.</p>
                </div>

                <div>
                                     <label className="block text-sm text-gray-300 mb-2">
                     Features & Detailed Description
                   </label>
                  <textarea
                    name="features"
                    value={editFormData.features}
                    onChange={handleInputChange}
                    rows={8}
                    placeholder="Describe your script features, how to use it, etc..."
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Use **bold**, • bullets, and numbered lists for formatting.</p>
                </div>

                <div>
                                     <label className="block text-sm text-gray-300 mb-2">
                     Script Source Code <span className="text-red-400">*</span>
                   </label>
                  <div className="rounded-lg border border-gray-700 bg-gray-900/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                      <h3 className="text-sm tracking-wide text-gray-200 select-none">RAW CODE</h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (editFormData.scriptCode) {
                              navigator.clipboard.writeText(editFormData.scriptCode);
                            }
                          }}
                          title="Copy script"
                          className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-700/60 hover:bg-gray-700 text-gray-200 hover:text-white transition-colors"
                        >
                          <CopyIcon />
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <textarea
                        name="scriptCode"
                        value={editFormData.scriptCode}
                        onChange={handleInputChange}
                        rows={20}
                        placeholder="-- Your Lua script code here..."
                        className="w-full p-0 m-0 text-[15px] leading-relaxed font-mono text-white whitespace-pre overflow-x-auto bg-transparent border-none resize-none focus:outline-none focus:ring-0"
                        wrap="off"
                      />
                    </div>
                  </div>
                </div>

                {(saveSuccess || securityError) && (
                  <div className="pt-4">
                    {saveSuccess && (
                      <div className="p-3 bg-green-900/30 border border-green-700/50 rounded-lg mb-4">
                        <p className="text-green-400 text-sm">{saveSuccess}</p>
                      </div>
                    )}
                    {securityError && (
                      <div className="p-4 bg-red-900/40 border border-red-600/50 rounded-lg mb-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-red-300 font-semibold mb-2">Validation Error</h4>
                            <p className="text-red-200 text-sm whitespace-pre-line mb-3">{securityError}</p>
                            <div className="text-xs text-red-300/80">
                              <p className="mb-1"><strong>Common fixes:</strong></p>
                              <ul className="list-disc list-inside space-y-1 ml-2">
                                {securityError.includes('Custom thumbnail') && (
                                  <li>Upload a custom thumbnail image for universal scripts</li>
                                )}
                                {securityError.includes('Title') && (
                                  <li>Ensure title is 3-45 characters and contains no inappropriate content</li>
                                )}
                                {securityError.includes('Description') && (
                                  <li>Ensure description is 10-2000 characters and contains no inappropriate content</li>
                                )}
                                {securityError.includes('Script code') && (
                                  <li>Ensure script code is 10-25000 characters</li>
                                )}
                                {securityError.includes('Game ID') && (
                                  <li>Enter a valid Roblox game ID for non-universal scripts</li>
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-gray-800 gap-4">
                  <button
                    onClick={() => setShowDeleteScript(true)}
                    disabled={script?.isOrphaned}
                    className="w-full sm:w-auto px-6 py-2.5 bg-red-700 hover:bg-red-800 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                    title={script?.isOrphaned ? "Orphaned scripts cannot be deleted" : "Delete script"}
                  >
                    Delete Script
                  </button>

                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                      onClick={handleCancelEdit}
                      className="w-full sm:w-auto px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isLoading || !editFormData.title || !editFormData.scriptCode}
                      className="w-full sm:w-auto px-6 py-2.5 bg-white hover:bg-gray-200 disabled:bg-gray-600 text-black rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPromoInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-2 p-8 flex flex-col items-center pointer-events-auto" style={{boxShadow:'0 8px 32px rgba(0,0,0,0.18)'}}>
            <button
              onClick={() => { setShowPromoInput(false); setPromoCode(""); setPromoStatus(null); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl focus:outline-none"
              aria-label="Close promotion modal"
            >
              &times;
            </button>
            <h2 className="text-2xl text-gray-900 mb-6 text-center">Redeem Promotion Code</h2>
            <div className="w-full flex flex-col gap-3 mb-4">
              {promoOptions.map((opt, idx) => (
                <label key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${selectedPromo===idx?'border-yellow-400 bg-yellow-50':'border-gray-200 bg-gray-50'} cursor-pointer transition-all`}>
                  <input
                    type="radio"
                    name="promoOption"
                    checked={selectedPromo===idx}
                    onChange={() => setSelectedPromo(idx)}
                    className="w-5 h-5 text-yellow-500 focus:ring-yellow-500 border-gray-300"
                  />
                  <div className="flex flex-col">
                    <span className="text-gray-900 text-base">{opt.title}</span>
                    <span className="text-gray-600 text-xs">{opt.info}</span>
                  </div>
                </label>
              ))}
            </div>
            <div className="w-full flex gap-2 items-center mb-2">
              <input
                type="text"
                maxLength={30}
                value={promoCode}
                onChange={e => setPromoCode(e.target.value)}
                placeholder="Enter your code and verify"
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-base"
                autoFocus
              />
              <button
                disabled={promoLoading || !promoCode.trim()}
                className="px-6 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-300 text-white disabled:cursor-not-allowed text-base transition-colors"
                onClick={async () => {
                  setPromoStatus(null);
                  setPromoLoading(true);
                  try {
                    const res = await fetch('/api/promotions/redeem', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ code: promoCode.trim(), scriptId }),
                      credentials: 'include',
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                      const isAgeReset = data.promotion.codeType === 'ageReset';
                      setPromoStatus(isAgeReset ? 'Age reset applied!' : 'Promotion applied!');

                      if (data.promotion.codeType === 'ageReset') {
                        setScript((prev: any) => prev ? { ...prev, ...{
                          createdAt: data.promotion.effectiveAge,
                          promotionTier: null,
                          promotionCode: null,
                          promotionExpiresAt: null,
                          promotionActive: false,
                          effectiveAge: null,
                          ageResetAt: null,
                          ageResetCode: null,
                          scriptAgeReset: null
                        }} : prev);
                      } else {
                        setScript((prev: any) => prev ? { ...prev, ...{
                          promotionTier: data.promotion.tier,
                          promotionCode: data.promotion.code,
                          promotionExpiresAt: data.promotion.expiresAt,
                          promotionActive: data.promotion.active,
                          multiplier: parseFloat((data.promotion.multiplier || 1).toFixed(2)),
                          effectiveAge: data.promotion.effectiveAge,
                          scriptAgeReset: data.promotion.effectiveAge,
                          ageResetAt: data.promotion.ageResetAt || prev.ageResetAt,
                          ageResetCode: data.promotion.ageResetCode || prev.ageResetCode,
                          promotionAgeReversal: data.promotion.ageReversalDays
                        }} : prev);
                      }

                      setTimeout(() => {
                        setShowPromoInput(false);
                        setPromoCode("");
                        setPromoStatus(null);
                        window.location.reload();
                      }, 1500);
                    } else {
                      let msg = 'Invalid code';
                      if (data.reason === 'expired') msg = 'Promotion code expired';
                      else if (data.reason === 'used') msg = 'Promotion code already used';
                      else if (data.reason === 'invalid') msg = 'Invalid promotion code';
                      else if (data.reason === 'already_has_promo') msg = 'Script already has an active promotion code';
                      else if (data.reason === 'used_on_other_script') msg = 'Promotion code already used on another script';
                      setPromoStatus(msg);
                      setScript((prev: any) => prev ? { ...prev, ...{
                        promotionTier: null,
                        promotionCode: null,
                        promotionExpiresAt: null,
                        promotionActive: false
                      }} : prev);
                    }
                  } catch {
                    setPromoStatus('Network error');
                  } finally {
                    setPromoLoading(false);
                  }
                }}
              >
                {promoLoading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
            {promoStatus && <div className="text-sm mt-1 text-center text-yellow-600">{promoStatus}</div>}
          </div>
        </div>
      )}

      {showDeleteScript && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Delete Script</h2>
                <button
                  onClick={() => {
                    setShowDeleteScript(false);
                    setDeleteScriptError("");
                    setDeleteScriptSuccess("");
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <CloseIcon />
                </button>
              </div>

              <p className="text-gray-300 text-sm mb-4">
                This action is irreversible. The script will be permanently deleted.
              </p>

              <div className="space-y-4">
                {deleteScriptError && (
                  <div className="text-red-400 text-sm bg-gray-700 p-3 border border-gray-600">
                    {deleteScriptError}
                  </div>
                )}

                {deleteScriptSuccess && (
                  <div className="text-green-400 text-sm bg-gray-700 p-3 border border-gray-600">
                    {deleteScriptSuccess}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteScript}
                    disabled={deleteScriptLoading}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-5 py-2.5 font-semibold transition-colors disabled:text-gray-400"
                  >
                    {deleteScriptLoading ? 'Deleting...' : 'Delete Script'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteScript(false);
                      setDeleteScriptError("");
                      setDeleteScriptSuccess("");
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2.5 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
  );
}

