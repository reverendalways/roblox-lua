"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "../../../../context/AuthContext";
import { ImageOptimizer, ImagePresets } from "../../../../lib/imageOptimizer";

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export default function EditScriptPage() {
  const params = useParams();
  const router = useRouter();
  const { userInfo, isLoggedIn } = useAuth();
  const [script, setScript] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (params.id) {
      fetchScript();
    }
  }, [params.id]);

  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  const fetchScript = async () => {
    (window as any).showLoadingBar?.();
    try {
      const res = await fetch(`/api/scripts/${params.id}?edit=true`, {
        cache: 'no-store',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setScript(data);

        const editData = { ...data };
        if (editData.customThumbnail && !editData.customThumbnail.startsWith('data:image')) {
          delete editData.customThumbnail;
        }

        if (!editData.tags || !Array.isArray(editData.tags)) {
          editData.tags = [];
        }

        setEditFormData(editData);
        if (data.customThumbnail || data.dbThumbnail || data.thumbnailUrl) {
          setImagePreview(data.customThumbnail || data.dbThumbnail || data.thumbnailUrl);
        }
      }
    } catch (error) {
      console.error('Failed to fetch script:', error);
    } finally {
      setLoading(false);
      (window as any).hideLoadingBar?.();
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

    setHasChanges(true);

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    if (name === 'discordServer' || name === 'keySystemLink') {
      const timeout = setTimeout(() => {
        handleAutoSave();
      }, 2000);
      setSaveTimeout(timeout);
    }
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value.trimStart());
  };

  const handleAddTag = () => {
    const newTag = tagInput.trim();
    if (!newTag) return;
    if (editFormData.tags.includes(newTag)) return;
    if (editFormData.tags.length >= 10) {
      alert("You can add up to 10 tags");
      return;
    }
    if (newTag.length > 50) {
      alert("Each tag must be 50 characters or less");
      return;
    }
    setEditFormData((prev: any) => ({ ...prev, tags: [...prev.tags, newTag] }));
    setTagInput("");
    setHasChanges(true);
  };

  const handleRemoveTag = (tag: string) => {
    setEditFormData((prev: any) => ({ ...prev, tags: prev.tags.filter((t: string) => t !== tag) }));
    setHasChanges(true);
  };

  const handleAutoSave = async () => {
    if (!editFormData || !hasChanges) return;

    setAutoSaving(true);
    try {
      const autoSaveData: any = {};
      if (editFormData.discordServer !== undefined) {
        autoSaveData.discordServer = editFormData.discordServer;
      }
      if (editFormData.keySystemLink !== undefined) {
        autoSaveData.keySystemLink = editFormData.keySystemLink;
      }

      if (Object.keys(autoSaveData).length === 0) return;

      const res = await fetch(`/api/scripts/${params.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(autoSaveData),
        credentials: 'include',
      });

      if (res.ok) {
        setHasChanges(false);
        console.log('Auto-saved successfully');
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editFormData) return;

    setSaving(true);
    (window as any).showLoadingBar?.();
    try {
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`/api/scripts/${params.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
        credentials: 'include',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        setHasChanges(false);
        alert('Script saved successfully!');

        router.push(`/script/${params.id}?saved=true&t=${Date.now()}`);
      } else {
        const error = await res.json();
        console.error('Save failed:', error);
        alert(`Error: ${error.error || 'Failed to save'}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      if (error.name === 'AbortError') {
        alert('Request timed out. Please try again.');
      } else {
        alert('Network error. Please try again.');
      }
    } finally {
      setSaving(false);
      (window as any).hideLoadingBar?.();
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this script? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/scripts/${params.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        router.push('/home');
      } else {
        const error = await res.json();
        alert(`Error: ${error.error || 'Failed to delete'}`);
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!script) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Script not found</div>
      </div>
    );
  }

  if (!isLoggedIn || userInfo?.username !== script.ownerId) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">You can only edit your own scripts.</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">

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

      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeftIcon />
              <span>Back to Script</span>
            </button>
            <h1 className="text-3xl font-bold">Edit Script</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
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
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className={`w-full px-4 py-3 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
              <label className="block text-sm font-medium text-gray-300 mb-2">Script Type</label>
              <select
                name="price"
                value={editFormData.price}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Free">Free</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>

          {editFormData.price === 'Paid' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Price Amount (e.g. $5 or 5 USD)</label>
              <input
                type="text"
                name="priceAmount"
                value={editFormData.priceAmount || ''}
                onChange={handleInputChange}
                placeholder="$5"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Key System Link (Optional)
                {autoSaving && (editFormData.keySystemLink !== undefined) && (
                  <span className="ml-2 text-xs text-blue-400">Auto-saving...</span>
                )}
              </label>
              <input
                type="url"
                name="keySystemLink"
                value={editFormData.keySystemLink || ''}
                onChange={handleInputChange}
                placeholder="https://example.com/getkey"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Discord Server (Optional)
                {autoSaving && (editFormData.discordServer !== undefined) && (
                  <span className="ml-2 text-xs text-blue-400">Auto-saving...</span>
                )}
              </label>
              <input
                type="url"
                name="discordServer"
                value={editFormData.discordServer || ''}
                onChange={handleInputChange}
                placeholder="https://discord.gg/3WwQsq78mE"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Custom Thumbnail</label>
            <div className="mt-2 flex justify-center items-center w-full">
              <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 hover:border-white transition-colors w-80 h-80 mx-auto text-center flex items-center justify-center">
                {imagePreview ? (
                  <Image
                    src={imagePreview}
                    alt="Thumbnail Preview"
                    width={320}
                    height={320}
                    className="w-full h-full object-cover rounded-lg"
                  />
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
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const originalBase64 = reader.result as string;

                          try {
                            const optimized = await ImageOptimizer.optimizeImage(originalBase64, ImagePresets.thumbnail);
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
            <p className="text-xs text-gray-500 mt-2 text-center">Leave empty to use automatic game thumbnail. Recommended: 512x512px.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Features & Detailed Description
            </label>
            <textarea
              name="features"
              value={editFormData.features}
              onChange={handleInputChange}
              rows={8}
              placeholder="Describe your script features, how to use it, etc..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Use **bold**, *italic*, ***bold italic***, • bullets, and numbered lists for formatting.</p>
            <div className="mt-2 p-3 bg-gray-800/50 border border-gray-600 rounded-md">
              <p className="text-xs text-gray-300">
                <strong>Script HUB Tip:</strong> If your script is a Script HUB, include the game names in your description for better searchability.
                Example: "Script HUB for Adopt Me, Brookhaven, and Arsenal"
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-2">
              Tags (up to 10, each max 50 characters)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                id="tags"
                value={tagInput}
                onChange={handleTagInputChange}
                className="flex-1 p-2 text-sm bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add a tag and press Enter or +"
                maxLength={50}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
              />
              <button
                type="button"
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors"
                onClick={handleAddTag}
                disabled={editFormData.tags.length >= 10 || !tagInput.trim()}
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {editFormData.tags.map((tag: string) => (
                <span key={tag} className="bg-gray-700 text-gray-200 px-3 py-1 rounded-full text-xs flex items-center gap-1 border border-gray-600">
                  {tag}
                  <button
                    type="button"
                    className="ml-1 text-gray-400 hover:text-red-400 transition-colors"
                    onClick={() => handleRemoveTag(tag)}
                    title="Remove tag"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Script Source Code <span className="text-red-400">*</span>
            </label>
            <div className="rounded-lg border border-gray-700 bg-gray-900/50 backdrop-blur-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                <h3 className="text-sm tracking-wide text-gray-200 select-none">RAW CODE</h3>
              </div>
              <div className="p-4">
                <textarea
                  name="scriptCode"
                  value={editFormData.scriptCode}
                  onChange={handleInputChange}
                  rows={20}
                  placeholder="-- Your Lua script code here..."
                  className="w-full p-0 m-0 text-[15px] leading-relaxed font-mono text-gray-200 whitespace-pre overflow-x-auto bg-transparent border-none resize-none focus:outline-none focus:ring-0"
                  wrap="off"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-gray-800 gap-4">
            <button
              onClick={() => router.back()}
              className="w-full sm:w-auto px-6 py-3 text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
              >
                <TrashIcon />
                {deleting ? 'Deleting...' : 'Delete Script'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || autoSaving}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
              >
                <SaveIcon />
                {saving ? 'Saving...' : autoSaving ? 'Auto-saving...' : hasChanges ? 'Save Changes' : 'Saved'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
