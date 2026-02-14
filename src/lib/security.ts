import DOMPurify from 'dompurify';

export interface RateLimit {
  count: number;
  resetTime: number;
}

export interface UserSecurity {
  scriptsPosted: RateLimit;
  scriptsEdited: RateLimit;
  commentsPosted: RateLimit;
  likesGiven: RateLimit;
  commentDeletes: RateLimit;
}

const userSecurityData = new Map<string, UserSecurity>();

export const RATE_LIMITS = {
  RESET_INTERVAL: 60 * 60 * 1000,
  SCRIPTS_PER_HOUR: 5,
  EDITS_PER_HOUR: 10,
  COMMENTS_PER_HOUR: 20,
  LIKES_PER_HOUR: 50,
  COMMENT_DELETES_PER_HOUR: 10
};

const initializeUserSecurity = (userId: string): UserSecurity => {
  const currentTime = Date.now();
  return {
    scriptsPosted: { count: 0, resetTime: currentTime + RATE_LIMITS.RESET_INTERVAL },
    scriptsEdited: { count: 0, resetTime: currentTime + RATE_LIMITS.RESET_INTERVAL },
    commentsPosted: { count: 0, resetTime: currentTime + RATE_LIMITS.RESET_INTERVAL },
    likesGiven: { count: 0, resetTime: currentTime + RATE_LIMITS.RESET_INTERVAL },
    commentDeletes: { count: 0, resetTime: currentTime + RATE_LIMITS.RESET_INTERVAL }
  };
};

const resetRateLimitIfNeeded = (rateLimit: RateLimit): void => {
  const currentTime = Date.now();
  if (currentTime >= rateLimit.resetTime) {
    rateLimit.count = 0;
    rateLimit.resetTime = currentTime + RATE_LIMITS.RESET_INTERVAL;
  }
};

export const canPostScript = (userId: string): { allowed: boolean; error?: string; resetIn?: number } => {
  if (!userSecurityData.has(userId)) {
    userSecurityData.set(userId, initializeUserSecurity(userId));
  }
  
  const userSec = userSecurityData.get(userId)!;
  resetRateLimitIfNeeded(userSec.scriptsPosted);
  
  if (userSec.scriptsPosted.count >= RATE_LIMITS.SCRIPTS_PER_HOUR) {
    const resetIn = Math.ceil((userSec.scriptsPosted.resetTime - Date.now()) / (60 * 1000));
    return {
      allowed: false,
      error: `Rate limit exceeded. You can only post ${RATE_LIMITS.SCRIPTS_PER_HOUR} scripts per hour. Try again in ${resetIn} minutes.`,
      resetIn
    };
  }
  
  return { allowed: true };
};

export const incrementScriptPostCount = (userId: string): void => {
  if (!userSecurityData.has(userId)) {
    userSecurityData.set(userId, initializeUserSecurity(userId));
  }
  
  const userSec = userSecurityData.get(userId)!;
  resetRateLimitIfNeeded(userSec.scriptsPosted);
  userSec.scriptsPosted.count++;
};

export const canEditScript = (userId: string): { allowed: boolean; error?: string; resetIn?: number } => {
  if (!userSecurityData.has(userId)) {
    userSecurityData.set(userId, initializeUserSecurity(userId));
  }
  
  const userSec = userSecurityData.get(userId)!;
  resetRateLimitIfNeeded(userSec.scriptsEdited);
  
  if (userSec.scriptsEdited.count >= RATE_LIMITS.EDITS_PER_HOUR) {
    const resetIn = Math.ceil((userSec.scriptsEdited.resetTime - Date.now()) / (60 * 1000));
    return {
      allowed: false,
      error: `Rate limit exceeded. You can only edit ${RATE_LIMITS.EDITS_PER_HOUR} scripts per hour. Try again in ${resetIn} minutes.`,
      resetIn
    };
  }
  
  return { allowed: true };
};

export const incrementScriptEditCount = (userId: string): void => {
  if (!userSecurityData.has(userId)) {
    userSecurityData.set(userId, initializeUserSecurity(userId));
  }
  
  const userSec = userSecurityData.get(userId)!;
  resetRateLimitIfNeeded(userSec.scriptsEdited);
  userSec.scriptsEdited.count++;
};

interface ScriptEditHistory {
  scriptId: string;
  lastEditTime: number;
  resetTime: number;
}

const scriptEditHistory = new Map<string, ScriptEditHistory>();

export const canEditSpecificScript = (userId: string, scriptId: string): { allowed: boolean; error?: string; resetIn?: number } => {
  const key = `${userId}:${scriptId}`;
  const currentTime = Date.now();
  
  if (!scriptEditHistory.has(key)) {
    scriptEditHistory.set(key, {
      scriptId,
      lastEditTime: 0,
      resetTime: currentTime + RATE_LIMITS.RESET_INTERVAL
    });
  }
  
  const history = scriptEditHistory.get(key)!;
  
  if (currentTime >= history.resetTime) {
    history.lastEditTime = 0;
    history.resetTime = currentTime + RATE_LIMITS.RESET_INTERVAL;
  }
  
  const timeSinceLastEdit = currentTime - history.lastEditTime;
  if (timeSinceLastEdit < 60000) {
    const resetIn = Math.ceil((60000 - timeSinceLastEdit) / 1000);
    return {
      allowed: false,
      error: `You can only edit this script once per minute. Try again in ${resetIn} seconds.`,
      resetIn
    };
  }
  
  return { allowed: true };
};

export const updateScriptEditHistory = (userId: string, scriptId: string): void => {
  const key = `${userId}:${scriptId}`;
  const currentTime = Date.now();
  
  if (!scriptEditHistory.has(key)) {
    scriptEditHistory.set(key, {
      scriptId,
      lastEditTime: currentTime,
      resetTime: currentTime + RATE_LIMITS.RESET_INTERVAL
    });
  } else {
    const history = scriptEditHistory.get(key)!;
    history.lastEditTime = currentTime;
    history.resetTime = currentTime + RATE_LIMITS.RESET_INTERVAL;
  }
};

export const canPostComment = (userId: string): { allowed: boolean; error?: string; resetIn?: number } => {
  if (!userSecurityData.has(userId)) {
    userSecurityData.set(userId, initializeUserSecurity(userId));
  }
  
  const userSec = userSecurityData.get(userId)!;
  resetRateLimitIfNeeded(userSec.commentsPosted);
  
  if (userSec.commentsPosted.count >= RATE_LIMITS.COMMENTS_PER_HOUR) {
    const resetIn = Math.ceil((userSec.commentsPosted.resetTime - Date.now()) / (60 * 1000));
    return {
      allowed: false,
      error: `Comment rate limit exceeded. You can only post ${RATE_LIMITS.COMMENTS_PER_HOUR} comments per hour. Try again in ${resetIn} minutes.`,
      resetIn
    };
  }
  
  return { allowed: true };
};

export const incrementCommentPostCount = (userId: string): void => {
  if (!userSecurityData.has(userId)) {
    userSecurityData.set(userId, initializeUserSecurity(userId));
  }
  
  const userSec = userSecurityData.get(userId)!;
  resetRateLimitIfNeeded(userSec.commentsPosted);
  userSec.commentsPosted.count++;
};

export const canLikePost = (userId: string): { allowed: boolean; error?: string; resetIn?: number } => {
  if (!userSecurityData.has(userId)) {
    userSecurityData.set(userId, initializeUserSecurity(userId));
  }
  
  const userSec = userSecurityData.get(userId)!;
  resetRateLimitIfNeeded(userSec.likesGiven);
  
  if (userSec.likesGiven.count >= RATE_LIMITS.LIKES_PER_HOUR) {
    const resetIn = Math.ceil((userSec.likesGiven.resetTime - Date.now()) / (60 * 1000));
    return {
      allowed: false,
      error: `Like rate limit exceeded. You can only like ${RATE_LIMITS.LIKES_PER_HOUR} posts per hour. Try again in ${resetIn} minutes.`,
      resetIn
    };
  }
  
  return { allowed: true };
};

export const incrementLikeCount = (userId: string): void => {
  if (!userSecurityData.has(userId)) {
    userSecurityData.set(userId, initializeUserSecurity(userId));
  }
  
  const userSec = userSecurityData.get(userId)!;
  resetRateLimitIfNeeded(userSec.likesGiven);
  userSec.likesGiven.count++;
};

export const canDeleteComment = (userId: string): { allowed: boolean; error?: string; resetIn?: number } => {
  if (!userSecurityData.has(userId)) {
    userSecurityData.set(userId, initializeUserSecurity(userId));
  }
  
  const userSec = userSecurityData.get(userId)!;
  resetRateLimitIfNeeded(userSec.commentDeletes);
  
  if (userSec.commentDeletes.count >= RATE_LIMITS.COMMENT_DELETES_PER_HOUR) {
    const resetIn = Math.ceil((userSec.commentDeletes.resetTime - Date.now()) / (60 * 1000));
    return {
      allowed: false,
      error: `Comment delete rate limit exceeded. You can only delete ${RATE_LIMITS.COMMENT_DELETES_PER_HOUR} comments per hour. Try again in ${resetIn} minutes.`,
      resetIn
    };
  }
  
  return { allowed: true };
};

export const incrementCommentDeleteCount = (userId: string): void => {
  if (!userSecurityData.has(userId)) {
    userSecurityData.set(userId, initializeUserSecurity(userId));
  }
  
  const userSec = userSecurityData.get(userId)!;
  resetRateLimitIfNeeded(userSec.commentDeletes);
  userSec.commentDeletes.count++;
};

export const getUserRateLimitStatus = (userId: string): {
  scriptsPosted: { count: number; limit: number; resetIn: number };
  scriptsEdited: { count: number; limit: number; resetIn: number };
  commentsPosted: { count: number; limit: number; resetIn: number };
  likesGiven: { count: number; limit: number; resetIn: number };
  commentDeletes: { count: number; limit: number; resetIn: number };
} => {
  if (!userSecurityData.has(userId)) {
    userSecurityData.set(userId, initializeUserSecurity(userId));
  }
  
  const userSec = userSecurityData.get(userId)!;
  resetRateLimitIfNeeded(userSec.scriptsPosted);
  resetRateLimitIfNeeded(userSec.scriptsEdited);
  resetRateLimitIfNeeded(userSec.commentsPosted);
  resetRateLimitIfNeeded(userSec.likesGiven);
  resetRateLimitIfNeeded(userSec.commentDeletes);
  
  const currentTime = Date.now();
  
  return {
    scriptsPosted: {
      count: userSec.scriptsPosted.count,
      limit: RATE_LIMITS.SCRIPTS_PER_HOUR,
      resetIn: Math.ceil((userSec.scriptsPosted.resetTime - currentTime) / (60 * 1000))
    },
    scriptsEdited: {
      count: userSec.scriptsEdited.count,
      limit: RATE_LIMITS.EDITS_PER_HOUR,
      resetIn: Math.ceil((userSec.scriptsEdited.resetTime - currentTime) / (60 * 1000))
    },
    commentsPosted: {
      count: userSec.commentsPosted.count,
      limit: RATE_LIMITS.COMMENTS_PER_HOUR,
      resetIn: Math.ceil((userSec.commentsPosted.resetTime - currentTime) / (60 * 1000))
    },
    likesGiven: {
      count: userSec.likesGiven.count,
      limit: RATE_LIMITS.LIKES_PER_HOUR,
      resetIn: Math.ceil((userSec.likesGiven.resetTime - currentTime) / (60 * 1000))
    },
    commentDeletes: {
      count: userSec.commentDeletes.count,
      limit: RATE_LIMITS.COMMENT_DELETES_PER_HOUR,
      resetIn: Math.ceil((userSec.commentDeletes.resetTime - currentTime) / (60 * 1000))
    }
  };
};

export const resetUserRateLimits = (userId: string): void => {
  if (userSecurityData.has(userId)) {
    userSecurityData.delete(userId);
  }
};

export function sanitizeMongoQuery(value: string): string {
  if (!value || typeof value !== 'string') return '';
  
  const dangerousPatterns = [
    /\$where/i,
    /\$regex/i,
    /\$ne/i,
    /\$gt/i,
    /\$lt/i,
    /\$gte/i,
    /\$lte/i,
    /\$in/i,
    /\$nin/i,
    /\$exists/i,
    /\$type/i,
    /\$mod/i,
    /\$all/i,
    /\$size/i,
    /\$elemMatch/i,
    /\$text/i,
    /\$search/i,
    /\$language/i,
    /\$caseSensitive/i,
    /\$diacriticSensitive/i
  ];
  
  let sanitized = value;
  
  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }
  
  return sanitized;
}

export function createSafeMongoRegex(value: string, options: string = 'i'): RegExp {
  if (!value || typeof value !== 'string') {
    return new RegExp('^$', options);
  }
  
  const sanitized = sanitizeMongoQuery(value);
  
  const escaped = sanitized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  return new RegExp(`^${escaped}$`, options);
}

export function createSafeMongoRegexQuery(value: string, options: string = 'i'): { $regex: RegExp } {
  return {
    $regex: createSafeMongoRegex(value, options)
  };
}

export function isValidObjectId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  return objectIdPattern.test(id);
}

export function sanitizeMongoField(fieldName: string): string {
  if (!fieldName || typeof fieldName !== 'string') return '';
  
  let sanitized = fieldName.replace(/[^a-zA-Z0-9_]/g, '');
  
  const forbiddenFields = [
    '__proto__',
    'constructor',
    'prototype',
    'hasOwnProperty',
    'toString',
    'valueOf'
  ];
  
  if (forbiddenFields.includes(sanitized)) {
    return '';
  }
  
  return sanitized;
}

const purifyConfig = {
  ALLOWED_TAGS: [
    'div', 'span', 'strong', 'em', 'u', 's', 'br', 'p',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre'
  ],
  ALLOWED_ATTR: [
    'class', 'id', 'style', 'title', 'alt', 'href', 'target',
    'rel', 'data-*', 'aria-*'
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button', 'iframe', 'frame', 'frameset', 'noframes', 'noscript'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect', 'onunload', 'onabort', 'onbeforeunload', 'onerror', 'onhashchange', 'onmessage', 'onoffline', 'ononline', 'onpagehide', 'onpageshow', 'onpopstate', 'onresize', 'onstorage', 'oncontextmenu', 'onkeydown', 'onkeypress', 'onkeyup', 'onmousedown', 'onmousemove', 'onmouseout', 'onmouseup', 'onwheel', 'oncopy', 'oncut', 'onpaste', 'onselectstart', 'onselectionchange'],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
  RETURN_TRUSTED_TYPE: false
};

export function sanitizeHTML(html: string): string {
  if (!html || typeof html !== 'string') return '';
  
  try {
    const sanitized = DOMPurify.sanitize(html, purifyConfig);
    return sanitized;
  } catch (error) {
    return escapeHTML(html);
  }
}

export function escapeHTML(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function validateUserInput(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') return '';
  
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  return sanitized;
}

export function validateAccountThumbnail(thumbnailData: string): { isValid: boolean; error?: string } {
  if (!thumbnailData || typeof thumbnailData !== 'string') {
    return { isValid: false, error: 'Thumbnail data is required' };
  }

  if (thumbnailData.includes('<') || thumbnailData.includes('>')) {
    return { isValid: false, error: 'HTML content not allowed in thumbnails' };
  }

  const dangerousPatterns = [
    /<iframe/i,
    /<script/i,
    /<object/i,
    /<embed/i,
    /<form/i,
    /<input/i,
    /<textarea/i,
    /<select/i,
    /<button/i,
    /javascript:/i,
    /vbscript:/i,
    /on\w+\s*=/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(thumbnailData)) {
      return { isValid: false, error: 'Dangerous content detected in thumbnail' };
    }
  }

  if (thumbnailData.startsWith('http://') || thumbnailData.startsWith('https://')) {
    const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const hasValidExtension = allowedImageExtensions.some(ext => 
      thumbnailData.toLowerCase().includes(ext)
    );
    
    if (!hasValidExtension) {
      return { isValid: false, error: 'Invalid image URL format' };
    }
  }
  else if (thumbnailData.startsWith('data:image/')) {
    const base64ImageRegex = /^data:image\/(jpeg|jpg|png|gif|webp|svg\+xml);base64,/;
    if (!base64ImageRegex.test(thumbnailData)) {
      return { isValid: false, error: 'Invalid base64 image format' };
    }
  }
  else if (thumbnailData.trim() === '') {
    return { isValid: true };
  }
  else {
    return { isValid: false, error: 'Invalid thumbnail format. Only image URLs or base64 data allowed.' };
  }

  return { isValid: true };
}

export function containsDangerousContent(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(text));
}