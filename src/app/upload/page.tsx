"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useAuth } from "../../context/AuthContext";
import { ImageOptimizer, ImagePresets } from "../../lib/imageOptimizer";
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

const ImageIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export default function UploadScript() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isLoggedIn, userInfo, isAuthLoading, logout } = useAuth();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentUserId] = useState("user123");
  const [isLoading, setIsLoading] = useState(false);
  const [gameThumbnail, setGameThumbnail] = useState<string>("");
  const [loadingGameThumbnail, setLoadingGameThumbnail] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    gameId: "",
    isUniversal: false,
    features: "",
    scriptType: "free" as "free" | "paid",
    scriptCode: "",
    keySystemLink: "",
    discordServer: "",
    customThumbnail: null as string | null,
    tags: [] as string[],
    priceAmount: undefined as number | undefined
  });
  const [validationErrors, setValidationErrors] = useState({
    title: "",
    gameId: "",
    features: "",
    scriptCode: "",
    tags: "",
    priceAmount: "",
    discordServer: "",
    keySystemLink: "",
    customThumbnail: ""
  });
  const [tagInput, setTagInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const MAX_THUMBNAIL_SIZE_MB = 1.5;

  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [turnstileError, setTurnstileError] = useState<string>('');
  const [turnstileKey, setTurnstileKey] = useState<number>(0);

  useEffect(() => {
    const checkAuthOnMount = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token && !userInfo && !isAuthLoading) {
        try {
          const res = await fetch('/api/auth/userinfo', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            credentials: 'include',
          });

          if (res.ok) {
            window.location.reload();
          }
        } catch (err) {
        }
      }
    };

    checkAuthOnMount();
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        fetch('/api/auth/userinfo', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        })
        .then(res => {
          if (res.ok) {
            window.location.reload();
          } else {
            window.location.href = '/login';
          }
        })
        .catch(() => {
          window.location.href = '/login';
        });
      } else {
        window.location.href = '/login';
      }
    }
  }, [isAuthLoading, isLoggedIn]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  const validateField = (name: string, value: any) => {
    switch (name) {
      case 'title':
        if ((typeof value === 'string' ? value.replace(/\s/g, '') : '').length < 3) return "Title must be at least 3 non-space characters";
        if (typeof value === 'string' && value.length > 45) return "Title must be less than 45 characters";
        return "";
      case 'priceAmount':
        if (formData.scriptType === 'paid') {
          if (value === undefined || value === null || value === "") return "";
          const num = Number(value);
          if (isNaN(num) || num < 1 || num > 1000) return "Price must be between $1 and $1000";
        }
        return "";
      case 'gameId':
        if (!formData.isUniversal && !value) return "Game ID is required (or check Universal)";
        if (!formData.isUniversal && value && !/^\d+$/.test(value)) return "Game ID must be a valid number";
        if (!formData.isUniversal && value && value.length < 3) return "Game ID must be at least 3 digits";
        if (!formData.isUniversal && value && value.length > 20) return "Game ID must be less than 20 digits";
        if (formData.isUniversal && value) return "Universal scripts cannot have a Game ID";
        return "";
      case 'features':
        if ((typeof value === 'string' ? value.replace(/\s/g, '') : '').length < 10) return "Description must be at least 10 non-space characters";
        return "";
      case 'scriptCode':
        if ((typeof value === 'string' ? value.replace(/\s/g, '') : '').length < 10) return "Script code must be at least 10 non-space characters";
        return "";
      case 'discordServer':
        if (typeof value === 'string' && value.trim().length > 0) {
          const trimmed = value.trim();
          if (!/^https?:\/\/(www\.)?discord\.(gg|com)\/(invite\/)?[\w-]+$/.test(trimmed)) return "Must be a valid Discord invite link (e.g., https://discord.gg/abc123 or https://discord.com/invite/abc123)";
        }
        return "";
      case 'keySystemLink':
        if (value && !/^https?:\/\/.+/.test(value)) return "Must be a valid URL starting with http:// or https://";
        return "";
      case 'customThumbnail':
        if (formData.isUniversal && !imagePreview) return "Universal scripts require a custom thumbnail";
        return "";
      case 'tags':
        if (!Array.isArray(value)) return "Tags must be an array";
        if (value.length > 10) return "You can add up to 10 tags";
        for (const tag of value) {
          if (typeof tag !== 'string' || tag.trim().length === 0) return "Tags cannot be empty";
          if (tag.length > 50) return "Each tag must be 50 characters or less";
        }
        return "";
      default:
        return "";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        ...(name === 'isUniversal' && checked ? { gameId: "" } : {})
      }));
      if (name === 'isUniversal' && checked) {
        setValidationErrors(prev => ({ ...prev, gameId: "" }));
        setGameThumbnail("");
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      let error = validateField(name, value);
      if (name === 'priceAmount' && (value === undefined || value === null || value === "")) {
        error = "";
      }
      setValidationErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleGameIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const gameId = e.target.value.trim();
    setFormData(prev => ({ ...prev, gameId }));
    setValidationErrors(prev => ({ ...prev, gameId: "" }));
    setGameThumbnail("");
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value.trimStart());
  };
  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (!newTag) return;
    if (formData.tags.includes(newTag)) return;
    if (formData.tags.length >= 10) {
      setValidationErrors(prev => ({ ...prev, tags: "You can add up to 10 tags" }));
      return;
    }
    if (newTag.length > 50) {
      setValidationErrors(prev => ({ ...prev, tags: "Each tag must be 50 characters or less" }));
      return;
    }
    setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
    setTagInput("");
    setValidationErrors(prev => ({ ...prev, tags: "" }));
  };
  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    setValidationErrors(prev => ({ ...prev, tags: "" }));
  };

  const hasValidationErrors = () => {
    const errors = {
      title: validateField('title', formData.title),
      gameId: validateField('gameId', formData.gameId),
      features: validateField('features', formData.features),
      scriptCode: validateField('scriptCode', formData.scriptCode),
      discordServer: validateField('discordServer', formData.discordServer),
      keySystemLink: validateField('keySystemLink', formData.keySystemLink),
      customThumbnail: validateField('customThumbnail', formData.customThumbnail as any),
      tags: validateField('tags', formData.tags),
      priceAmount: (formData.scriptType === 'paid' && formData.priceAmount !== undefined && formData.priceAmount !== null && String(formData.priceAmount) !== "") ? validateField('priceAmount', formData.priceAmount) : ""
    };

    const hasErrors = Object.values(errors).some(error => error !== "");
    if (hasErrors) {

    }

    return hasErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTurnstileError("");

    if (!turnstileToken) {
      setTurnstileError("Please complete the security verification");
      return;
    }

    const errors = {
      title: validateField('title', formData.title),
      gameId: validateField('gameId', formData.gameId),
      features: validateField('features', formData.features),
      scriptCode: validateField('scriptCode', formData.scriptCode),
      discordServer: validateField('discordServer', formData.discordServer),
      keySystemLink: validateField('keySystemLink', formData.keySystemLink),
      customThumbnail: validateField('customThumbnail', formData.customThumbnail as any),
      tags: validateField('tags', formData.tags),
      priceAmount: (formData.scriptType === 'paid' && formData.priceAmount !== undefined && formData.priceAmount !== null && String(formData.priceAmount) !== "") ? validateField('priceAmount', formData.priceAmount) : ""
    };
    setValidationErrors(errors);
    const hasErrors = Object.values(errors).some(error => error !== "");
    if (hasErrors) {
      alert('Please fix the validation errors before submitting.');
      return;
    }
    setIsLoading(true);
    (window as any).showLoadingBar?.();
    try {
      const csrfResponse = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include'
      });

      if (!csrfResponse.ok) {
        throw new Error('Failed to get CSRF token');
      }

      const { csrfToken } = await csrfResponse.json();

      const payload = {
        title: formData.title,
        gameId: formData.isUniversal ? undefined : formData.gameId,
        isUniversal: formData.isUniversal,
        features: formData.features,
        price: formData.scriptType === 'free' ? 'Free' : 'Paid',
        keySystemLink: formData.keySystemLink,
        discordServer: formData.discordServer,
        customThumbnail: typeof formData.customThumbnail === 'string' ? formData.customThumbnail : null,
        scriptCode: formData.scriptCode,
        tags: formData.tags,
        priceAmount: (formData.scriptType === 'paid' && formData.priceAmount !== undefined && formData.priceAmount !== null && String(formData.priceAmount) !== "") ? Number(formData.priceAmount) : undefined,
        turnstileToken: turnstileToken,
        csrfToken: csrfToken,
      };
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
        if (!res.ok) {
        const err = await res.json();
        if (err && err.error && typeof err.error === 'string') {
          if (err.error.includes('Turnstile') || err.error.includes('Security verification')) {
            setTurnstileError(err.error);
            setTurnstileToken('');
            setTurnstileKey(prev => prev + 1);
            return;
          }
          if (err.error.includes('timeouted') || err.error.includes('Timeout')) {
            alert(`❌ ${err.error}\n\nPlease check your account settings for more details about your timeout status.`);
            return;
          }
          if (err.error.toLowerCase().includes('discord')) {
            setValidationErrors(prev => ({ ...prev, discordServer: err.error }));
          } else if (err.error.toLowerCase().includes('key system') || err.error.toLowerCase().includes('url')) {
            setValidationErrors(prev => ({ ...prev, keySystemLink: err.error }));
          } else if (err.error.toLowerCase().includes('price')) {
            setValidationErrors(prev => ({ ...prev, priceAmount: err.error }));
          } else if (err.error.toLowerCase().includes('title')) {
            setValidationErrors(prev => ({ ...prev, title: err.error }));
          } else if (err.error.toLowerCase().includes('description') || err.error.toLowerCase().includes('features')) {
            setValidationErrors(prev => ({ ...prev, features: err.error }));
          } else if (err.error.toLowerCase().includes('script code') || err.error.toLowerCase().includes('code')) {
            setValidationErrors(prev => ({ ...prev, scriptCode: err.error }));
          } else if (err.error.toLowerCase().includes('game id') || err.error.toLowerCase().includes('gameid')) {
            setValidationErrors(prev => ({ ...prev, gameId: err.error }));
          } else if (err.error.toLowerCase().includes('thumbnail')) {
            setValidationErrors(prev => ({ ...prev, customThumbnail: err.error }));
          } else if (err.error.toLowerCase().includes('tags')) {
            setValidationErrors(prev => ({ ...prev, tags: err.error }));
          } else {
            setValidationErrors(prev => ({ ...prev, title: err.error }));
          }
        }
        throw new Error('Failed to upload script');
      }

      const result = await res.json();
      const scriptId = result.scriptId;

      if (scriptId) {
        alert(`Script uploaded successfully! Redirecting to your script...`);
        window.location.href = `/script/${scriptId}`;
      } else {
        alert('Script uploaded successfully!');
      }
      setFormData({
        title: "",
        gameId: "",
        isUniversal: false,
        features: "",
        scriptType: "free",
        scriptCode: "",
        keySystemLink: "",
        discordServer: "",
        customThumbnail: null,
        tags: [],
        priceAmount: undefined
      });
      setImagePreview(null);
      setGameThumbnail("");
    } catch (error) {
      alert('Error uploading script. Please try again.');
    } finally {
      setIsLoading(false);
      (window as any).hideLoadingBar?.();
    }
  };

  const getCurrentThumbnail = () => {
    if (imagePreview) return imagePreview;
    if (formData.customThumbnail) return formData.customThumbnail;
    if (formData.isUniversal) return "/universal.png";
    if (gameThumbnail) return gameThumbnail;
    return "/no-thumbnail.png";
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > MAX_THUMBNAIL_SIZE_MB * 1024 * 1024) {
      alert(`File size must be less than ${MAX_THUMBNAIL_SIZE_MB}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const originalBase64 = e.target?.result as string;
      if (!originalBase64) return;

      try {
        const uploadValidation = await ImageOptimizer.validateUpload(originalBase64, ImagePresets.thumbnail);
        if (!uploadValidation.canUpload) {
          alert(`Upload failed: ${uploadValidation.issues.join(', ')}`);
          return;
        }

        setImagePreview("Optimizing image...");

        const optimized = await ImageOptimizer.optimizeImage(originalBase64, ImagePresets.thumbnail);

        const originalSize = Math.round(ImageOptimizer.getBase64FileSize(originalBase64) / 1024);
        const optimizedSize = Math.round(optimized.fileSize / 1024);
        const savings = Math.round(((originalSize - optimizedSize) / originalSize) * 100);

        setImagePreview(optimized.dataUrl);
        setFormData(prev => ({ ...prev, customThumbnail: optimized.dataUrl }));

        console.log(`Image optimized: ${originalSize}KB → ${optimizedSize}KB (${savings}% smaller)`);
      } catch (error) {
        console.error('Image optimization failed:', error);
        setImagePreview(originalBase64);
        setFormData(prev => ({ ...prev, customThumbnail: originalBase64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const removeThumbnail = () => {
    setImagePreview(null);
    setFormData(prev => ({ ...prev, customThumbnail: "" }));
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">

      <main className="w-full mx-auto py-8 sm:py-12 lg:py-16 px-3 sm:px-4 lg:px-8">
        <div className="max-w-3xl mx-auto bg-gray-800/50 rounded-xl border border-gray-700/50 shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6 text-white">Upload Script</h1>
          <form onSubmit={handleSubmit} className="space-y-6">

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-1">
                Tags (up to 10, each max 50 characters)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  id="tags"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  className="flex-1 p-2 text-sm bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
                  placeholder="Add a tag and press Enter or +"
                  maxLength={50}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                />
                <button
                  type="button"
                  className="px-3 py-2 bg-white text-gray-900 rounded-md text-xs font-medium border border-gray-300 hover:bg-gray-100"
                  onClick={handleAddTag}
                  disabled={formData.tags.length >= 10 || !tagInput.trim()}
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span key={tag} className="bg-gray-200 text-gray-900 px-2 py-1 rounded text-xs flex items-center gap-1 border border-gray-300">
                    {tag}
                    <button type="button" className="ml-1 text-gray-700 hover:text-red-400" onClick={() => handleRemoveTag(tag)}>&times;</button>
                  </span>
                ))}
              </div>
              {validationErrors.tags && (
                <p className="mt-2 text-sm text-red-400">{validationErrors.tags}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="customThumbnail">
                Custom Thumbnail
              </label>
              <div className="w-full flex justify-center">
                <div
                  className="relative bg-[#1a2233] rounded-lg border-2 border-[#232c44] border-dashed cursor-pointer transition hover:border-gray-300 focus-within:border-gray-300 flex items-center justify-center aspect-square"
                  style={{ width: 220, height: 220 }}
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => !imagePreview && document.getElementById('customThumbnailInput')?.click()}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded aspect-square" />
                      <button
                        type="button"
                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 shadow-lg z-10"
                        onClick={e => { e.stopPropagation(); removeThumbnail(); }}
                        title="Remove thumbnail"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none aspect-square">
                      <ImageIcon />
                      <span className="mt-2 text-gray-200 text-center">Choose image or drag and drop here</span>
                    </div>
                  )}
                  <input
                    type="file"
                    id="customThumbnailInput"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">Images are automatically optimized to 512x512px. Recommended: 512x512px.</p>
              {formData.isUniversal && !imagePreview && (
                <p className="mt-2 text-sm text-red-400">Universal scripts require a custom thumbnail.</p>
              )}
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
                Script Title
              </label>
              <input
                type="text"
                name="title"
                id="title"
                value={formData.title}
                onChange={handleInputChange}
                className="block w-full p-3 text-sm bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
                placeholder="Enter your script title"
                required
                maxLength={45}
              />
              {validationErrors.title && (
                <p className="mt-2 text-sm text-red-400">{validationErrors.title}</p>
              )}
            </div>

            <div>
              <label htmlFor="gameId" className="block text-sm font-medium text-gray-300 mb-1">
                Game ID (Roblox Place ID)
              </label>
              <input
                type="text"
                name="gameId"
                id="gameId"
                value={formData.gameId}
                onChange={handleGameIdChange}
                className={`block w-full p-3 text-sm bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300 ${formData.isUniversal ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : ''}`}
                placeholder="Enter Roblox Game ID"
                disabled={formData.isUniversal}
                required={!formData.isUniversal}
              />
              <div className="flex flex-col items-center mt-2 mb-1">
                <Image src="/image.png" alt="Roblox Place ID Example" width={300} height={24} className="rounded border border-gray-600 bg-white" />
                <span className="text-xs text-gray-400 mt-1">Example: 5041144419</span>
              </div>
              {validationErrors.gameId && (
                <p className="mt-2 text-sm text-red-400">{validationErrors.gameId}</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="isUniversal"
                id="isUniversal"
                checked={formData.isUniversal}
                onChange={handleInputChange}
                className="w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-300"
              />
              <label htmlFor="isUniversal" className="ml-2 text-sm font-medium text-gray-300">
                Universal Script (No Game ID required)
              </label>
            </div>

            <div>
              <label htmlFor="features" className="block text-sm font-medium text-gray-300 mb-1">
                Features / Description
              </label>
              <textarea
                name="features"
                id="features"
                value={formData.features}
                onChange={handleInputChange}
                className="block w-full p-3 text-sm bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
                placeholder="Describe the features of your script"
                rows={4}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Use **bold**, *italic*, ***bold italic***, • bullets, and numbered lists for formatting.</p>
              <div className="mt-2 p-3 bg-gray-800/50 border border-gray-600 rounded-md">
                <p className="text-xs text-gray-300">
                  <strong>Script HUB Tip:</strong> If your script is a Script HUB, include the game names in your description for better searchability.
                  Example: "Script HUB for Adopt Me, Brookhaven, and Arsenal"
                </p>
              </div>
              {validationErrors.features && (
                <p className="mt-2 text-sm text-red-400">{validationErrors.features}</p>
              )}
            </div>

            <div>
              <label htmlFor="scriptType" className="block text-sm font-medium text-gray-300 mb-1">
                Script Type
              </label>
              <select
                name="scriptType"
                id="scriptType"
                value={formData.scriptType}
                onChange={handleInputChange}
                className="block w-full p-3 text-sm bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
                required
              >
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            {formData.scriptType === 'paid' && (
              <div>
                <label htmlFor="priceAmount" className="block text-sm font-medium text-gray-300 mb-1">
                  Price (USD, $1 - $1000) <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="number"
                  name="priceAmount"
                  id="priceAmount"
                  min={1}
                  max={1000}
                  step={1}
                  value={formData.priceAmount ?? ""}
                  onChange={handleInputChange}
                  className="block w-full p-3 text-sm bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
                  placeholder="Enter price in USD"
                />
                {validationErrors.priceAmount && (
                  <p className="mt-2 text-sm text-red-400">{validationErrors.priceAmount}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="scriptCode" className="block text-sm font-medium text-gray-300 mb-1">
                Script Code
              </label>
              <textarea
                name="scriptCode"
                id="scriptCode"
                value={formData.scriptCode}
                onChange={handleInputChange}
                className="block w-full p-3 text-sm bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
                placeholder="Enter your script code"
                rows={6}
                required
              />
              {validationErrors.scriptCode && (
                <p className="mt-2 text-sm text-red-400">{validationErrors.scriptCode}</p>
              )}
            </div>

            <div>
              <label htmlFor="keySystemLink" className="block text-sm font-medium text-gray-300 mb-1">
                Key System Link <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                name="keySystemLink"
                id="keySystemLink"
                value={formData.keySystemLink}
                onChange={handleInputChange}
                className="block w-full p-3 text-sm bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
                placeholder="Enter the key system link (optional)"
              />
              {validationErrors.keySystemLink && (
                <p className="mt-2 text-sm text-red-400">{validationErrors.keySystemLink}</p>
              )}
            </div>

            <div>
              <label htmlFor="discordServer" className="block text-sm font-medium text-gray-300 mb-1">
                Discord Server Link <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                name="discordServer"
                id="discordServer"
                value={formData.discordServer}
                onChange={handleInputChange}
                className="block w-full p-3 text-sm bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
                placeholder="Enter your Discord server link (optional)"
              />
              {validationErrors.discordServer && (
                <p className="mt-2 text-sm text-red-400">{validationErrors.discordServer}</p>
              )}
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
                  setTurnstileKey(prev => prev + 1);
                }}
                onExpire={() => {
                  setTurnstileError('Security verification expired. Please verify again.');
                  setTurnstileToken('');
                  setTurnstileKey(prev => prev + 1);
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

            <div className="flex justify-end">
              <button
                type="submit"
                className={`px-6 py-3 text-sm rounded-md font-medium transition-colors flex items-center space-x-2 border ${
                  hasValidationErrors() || isLoading || !turnstileToken
                    ? 'bg-gray-500 cursor-not-allowed text-gray-300 border-gray-400'
                    : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-100'
                }`}
                disabled={isLoading || hasValidationErrors() || !turnstileToken}
              >
                {isLoading && (
                  <svg className="w-4 h-4 mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16M4 6h16M4 18h16" />
                  </svg>
                )}
                <span>{isLoading ? 'Uploading...' : 'Upload Script'}</span>
              </button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}