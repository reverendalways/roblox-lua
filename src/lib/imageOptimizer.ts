interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  maxFileSize?: number;
  maxUploadSize?: number;
}

interface OptimizedImage {
  dataUrl: string;
  fileSize: number;
  width: number;
  height: number;
  format: string;
}

export class ImageOptimizer {
  private static readonly DEFAULT_OPTIONS: OptimizationOptions = {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.85,
    format: 'webp',
    maxFileSize: 300 * 1024,
    maxUploadSize: 3 * 1024 * 1024
  };

  static async optimizeImage(
    base64DataUrl: string, 
    options: Partial<OptimizationOptions> = {}
  ): Promise<OptimizedImage> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          const { newWidth, newHeight } = this.calculateDimensions(
            img.width, 
            img.height, 
            opts.maxWidth!, 
            opts.maxHeight!
          );

          canvas.width = newWidth;
          canvas.height = newHeight;

          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          let mimeType: string;
          let quality = opts.quality!;

          switch (opts.format) {
            case 'webp':
              mimeType = 'image/webp';
              break;
            case 'jpeg':
              mimeType = 'image/jpeg';
              break;
            case 'png':
              mimeType = 'image/png';
              break;
            default:
              mimeType = 'image/webp';
          }

          if (opts.format === 'webp' && !this.isWebPSupported()) {
            mimeType = 'image/jpeg';
            opts.format = 'jpeg';
          }

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create blob'));
                return;
              }

              if (blob.size > opts.maxFileSize!) {
                this.optimizeWithReducedQuality(canvas, opts, resolve, reject);
                return;
              }

              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = reader.result as string;
                resolve({
                  dataUrl,
                  fileSize: blob.size,
                  width: newWidth,
                  height: newHeight,
                  format: opts.format!
                });
              };
              reader.onerror = () => reject(new Error('Failed to read blob'));
              reader.readAsDataURL(blob);
            },
            mimeType,
            quality
          );

        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = base64DataUrl;
    });
  }

  private static optimizeWithReducedQuality(
    canvas: HTMLCanvasElement,
    options: OptimizationOptions,
    resolve: (result: OptimizedImage) => void,
    reject: (error: Error) => void
  ) {
    let quality = options.quality!;
    let attempts = 0;
    const maxAttempts = 5;

    const tryOptimize = () => {
      if (attempts >= maxAttempts) {
        reject(new Error('Unable to optimize image to acceptable size'));
        return;
      }

      attempts++;
      quality = Math.max(0.1, quality - 0.15);

      const mimeType = options.format === 'webp' ? 'image/webp' : 'image/jpeg';
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }

          if (blob.size <= options.maxFileSize!) {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              resolve({
                dataUrl,
                fileSize: blob.size,
                width: canvas.width,
                height: canvas.height,
                format: options.format!
              });
            };
            reader.onerror = () => reject(new Error('Failed to read blob'));
            reader.readAsDataURL(blob);
          } else {
            tryOptimize();
          }
        },
        mimeType,
        quality
      );
    };

    tryOptimize();
  }

  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { newWidth: number; newHeight: number } {
    let newWidth = originalWidth;
    let newHeight = originalHeight;

    if (originalWidth > maxWidth || originalHeight > maxHeight) {
      const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
      newWidth = Math.round(originalWidth * ratio);
      newHeight = Math.round(originalHeight * ratio);
    }

    return { newWidth, newHeight };
  }

  private static isWebPSupported(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  static getBase64FileSize(base64DataUrl: string): number {
    const base64 = base64DataUrl.split(',')[1];
    if (!base64) return 0;
    
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    return Math.round((base64.length * 3) / 4) - padding;
  }

  static getImageDimensions(base64DataUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = base64DataUrl;
    });
  }

  static async validateImage(
    base64DataUrl: string,
    options: Partial<OptimizationOptions> = {}
  ): Promise<{ isValid: boolean; issues: string[] }> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const issues: string[] = [];

    try {
      const dimensions = await this.getImageDimensions(base64DataUrl);
      const fileSize = this.getBase64FileSize(base64DataUrl);

      if (dimensions.width > opts.maxWidth!) {
        issues.push(`Width (${dimensions.width}px) exceeds maximum (${opts.maxWidth}px)`);
      }
      if (dimensions.height > opts.maxHeight!) {
        issues.push(`Height (${dimensions.height}px) exceeds maximum (${opts.maxHeight}px)`);
      }

      if (fileSize > opts.maxFileSize!) {
        issues.push(`File size (${Math.round(fileSize / 1024)}KB) exceeds maximum (${Math.round(opts.maxFileSize! / 1024)}KB)`);
      }

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      issues.push('Failed to analyze image');
      return { isValid: false, issues };
    }
  }

  static async validateUpload(
    base64DataUrl: string,
    options: Partial<OptimizationOptions> = {}
  ): Promise<{ canUpload: boolean; issues: string[] }> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const issues: string[] = [];

    try {
      const fileSize = this.getBase64FileSize(base64DataUrl);

      if (opts.maxUploadSize && fileSize > opts.maxUploadSize) {
        const maxSizeMB = Math.round(opts.maxUploadSize / 1024 / 1024);
        const actualSizeMB = Math.round(fileSize / 1024 / 1024);
        issues.push(`File size (${actualSizeMB}MB) exceeds maximum upload size (${maxSizeMB}MB)`);
      }

      return {
        canUpload: issues.length === 0,
        issues
      };
    } catch (error) {
      issues.push('Failed to analyze image');
      return { canUpload: false, issues };
    }
  }
}

export const ImagePresets = {
  thumbnail: {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.85,
    format: 'webp' as const,
    maxFileSize: 200 * 1024,
    maxUploadSize: 3 * 1024 * 1024
  },
  avatar: {
    maxWidth: 256,
    maxHeight: 256,
    quality: 0.9,
    format: 'webp' as const,
    maxFileSize: 100 * 1024,
    maxUploadSize: 1 * 1024 * 1024
  }
};
