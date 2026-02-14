import { Filter } from 'bad-words';
import * as nsfwjs from 'nsfwjs';

const filter = new Filter();

let nsfwModel: nsfwjs.NSFWJS | null = null;

export function isContentClean(text: string): boolean {
  if (!text || typeof text !== 'string') return true;
  return !filter.isProfane(text);
}

export function cleanContent(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return filter.clean(text);
}

export function getBadWords(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  return filter.list.filter(word => 
    text.toLowerCase().includes(word.toLowerCase())
  );
}

export function validateContent(text: string): {
  isValid: boolean;
  isClean: boolean;
  badWords: string[];
  cleanedText: string;
  error?: string;
} {
  if (!text || typeof text !== 'string') {
    return {
      isValid: true,
      isClean: true,
      badWords: [],
      cleanedText: text
    };
  }

  const isClean = isContentClean(text);
  const badWords = getBadWords(text);
  const cleanedText = cleanContent(text);

  return {
    isValid: isClean,
    isClean,
    badWords,
    cleanedText,
    error: isClean ? undefined : `Content contains inappropriate language: ${badWords.join(', ')}`
  };
}

export function filterContentByField(text: string, field: 'username' | 'bio' | 'script-title' | 'script-description' | 'script-code' | 'comment' | 'general'): {
  isValid: boolean;
  cleanedText: string;
  error?: string;
} {
  if (!text || typeof text !== 'string') {
    return { isValid: true, cleanedText: text };
  }

  const strictness = {
    'username': 'high',
    'bio': 'medium',
    'script-title': 'high',
    'script-description': 'medium',
    'script-code': 'high',
    'comment': 'medium',
    'general': 'low'
  };

  const level = strictness[field];
  
  if (level === 'high') {
    const validation = validateContent(text);
    if (!validation.isValid) {
      return {
        isValid: false,
        cleanedText: validation.cleanedText,
        error: `This ${field.replace('-', ' ')} contains inappropriate content`
      };
    }
    
    if (field === 'username') {
      const lowerText = text.toLowerCase();
      const badPatterns = [
        'nigga', 'nigger', 'fuck', 'shit', 'bitch', 'ass', 'dick', 'pussy', 'cock', 'whore',
        'slut', 'cunt', 'bastard', 'motherfucker', 'fucker', 'faggot', 'fag', 'retard',
        'n1gga', 'n1gger', 'n1gg3r', 'n1gga', 'fuck', 'fuk', 'fuq', 'fck', 'shit', 'sh1t',
        'b1tch', 'bitch', 'd1ck', 'dick', 'pussy', 'puss', 'c0ck', 'cock', 'wh0re', 'whore',
        'slut', 'slut', 'cunt', 'bastard', 'motherfucker', 'm0therfucker', 'fucker', 'faggot'
      ];
      
      for (const pattern of badPatterns) {
        if (lowerText.includes(pattern)) {
          return {
            isValid: false,
            cleanedText: text,
            error: 'Username contains inappropriate content'
          };
        }
      }
      
      const leetPatterns = [
        /n[1i]gg[ae]r?/i,
        /f[uck]+/i,
        /sh[1i]t/i,
        /b[1i]tch/i,
        /d[1i]ck/i,
        /puss[iey]+/i,
        /c[0o]ck/i,
        /wh[0o]re/i,
        /slut/i,
        /cunt/i,
        /bastard/i,
        /m[0o]therfuck[er]+/i,
        /fagg[0o]t/i
      ];
      
      for (const pattern of leetPatterns) {
        if (pattern.test(lowerText)) {
          return {
            isValid: false,
            cleanedText: text,
            error: 'Username contains inappropriate content'
          };
        }
      }
    }
  }

  const cleanedText = cleanContent(text);
  
  return {
    isValid: true,
    cleanedText
  };
}

async function initializeNSFWModel(): Promise<nsfwjs.NSFWJS> {
  if (!nsfwModel) {
    nsfwModel = await nsfwjs.load();
  }
  return nsfwModel;
}

export interface ImageContentFilterResult {
  isSafe: boolean;
  confidence: number;
  categories: {
    porn: number;
    sexy: number;
    neutral: number;
    drawing: number;
    hentai: number;
  };
  reason?: string;
}

export async function filterImageContent(
  imageBuffer: Buffer, 
  threshold: number = 0.8
): Promise<ImageContentFilterResult> {
  try {
    const model = await initializeNSFWModel();
    
    const img = new Image();
    const blob = new Blob([imageBuffer]);
    const url = URL.createObjectURL(blob);
    
    return new Promise((resolve) => {
      img.onload = async () => {
        try {
          const predictions = await model.classify(img);
          
          const categories = {
            porn: predictions.find(p => p.className === 'Porn')?.probability || 0,
            sexy: predictions.find(p => p.className === 'Sexy')?.probability || 0,
            neutral: predictions.find(p => p.className === 'Neutral')?.probability || 0,
            drawing: predictions.find(p => p.className === 'Drawing')?.probability || 0,
            hentai: predictions.find(p => p.className === 'Hentai')?.probability || 0,
          };
          
          const inappropriateConfidence = Math.max(
            categories.porn,
            categories.sexy,
            categories.hentai
          );
          
          const isSafe = inappropriateConfidence < threshold;
          
          URL.revokeObjectURL(url);
          
          resolve({
            isSafe,
            confidence: inappropriateConfidence,
            categories,
            reason: !isSafe ? `Content flagged as inappropriate (${(inappropriateConfidence * 100).toFixed(1)}% confidence)` : undefined
          });
          
        } catch (error) {
          console.error('Content filtering error:', error);
          URL.revokeObjectURL(url);
          
          resolve({
            isSafe: true,
            confidence: 0,
            categories: {
              porn: 0,
              sexy: 0,
              neutral: 1,
              drawing: 0,
              hentai: 0,
            },
            reason: 'Content filter failed, allowing upload'
          });
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({
          isSafe: true,
          confidence: 0,
          categories: {
            porn: 0,
            sexy: 0,
            neutral: 1,
            drawing: 0,
            hentai: 0,
          },
          reason: 'Could not load image for filtering'
        });
      };
      
      img.src = url;
    });
    
  } catch (error) {
    console.error('Content filter initialization error:', error);
    
    return {
      isSafe: true,
      confidence: 0,
      categories: {
        porn: 0,
        sexy: 0,
        neutral: 1,
        drawing: 0,
        hentai: 0,
      },
      reason: 'Content filter unavailable, allowing upload'
    };
  }
}

export async function filterBase64Image(
  base64Data: string, 
  threshold: number = 0.8
): Promise<ImageContentFilterResult> {
  try {
    const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    
    const buffer = Buffer.from(base64, 'base64');
    
    return await filterImageContent(buffer, threshold);
    
  } catch (error) {
    console.error('Base64 content filtering error:', error);
    
    return {
      isSafe: true,
      confidence: 0,
      categories: {
        porn: 0,
        sexy: 0,
        neutral: 1,
        drawing: 0,
        hentai: 0,
      },
      reason: 'Invalid base64 data, allowing upload'
    };
  }
}

export function getImageContentFilterStatus(): { modelLoaded: boolean; version?: string } {
  return {
    modelLoaded: nsfwModel !== null,
    version: nsfwModel ? 'nsfwjs' : undefined
  };
}

export default filter;

