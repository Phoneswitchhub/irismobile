// Authentication utilities
export function phoneToEmail(phone: string): string {
  return `${phone.replace(/\D/g, '')}@phoneswitchhub.app`;
}

export function makePassword(pin: string, phone: string): string {
  return `iris_${pin}_${phone.replace(/\D/g, '')}`;
}

// Format price with ฿ currency symbol
export function formatPrice(n: number | string): string {
  const num = typeof n === 'number' ? n : parseFloat(n) || 0;
  return '฿' + num.toLocaleString();
}

// Format date according to language context
export function formatDate(str: string, lang: string = 'th'): string {
  if (!str) return '';
  const d = new Date(str);
  const langMap: Record<string, string> = { ko: 'ko-KR', th: 'th-TH', mm: 'my-MM', en: 'en-US' };
  const targetLang = langMap[lang] || 'th-TH';
  return d.toLocaleDateString(targetLang, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Chat bypass keyword filter (filters telephone, Line ID, and bank account keywords)
export function filterBypassKeywords(text: string, blockTextMap?: { phone: string; line: string; account: string }): string {
  if (!text) return '';

  const labels = blockTextMap || {
    phone: '[Phone Blocked]',
    line: '[LINE Blocked]',
    account: '[Account Blocked]'
  };

  // 1. Phone numbers pattern (Thailand 9-10 digits)
  const phoneRegex = /(?:\+?66|0)[1-9]\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;

  // 2. Line ID patterns
  const lineRegex = /(?:line\s*(?:id)?|라인\s*(?:id)?|@)\s*[:=]?\s*([a-zA-Z0-9_.-]{3,30})/gi;

  // 3. Bank accounts patterns
  const bankRegex = /\b\d{3}[-.]?\d{1}[-.]?\d{5}[-.]?\d{1}\b|\b\d{3}[-.]?\d{3}[-.]?\d{3}[-.]?\d{1}\b/g;

  let filtered = text;
  filtered = filtered.replace(phoneRegex, labels.phone);
  filtered = filtered.replace(lineRegex, labels.line);
  filtered = filtered.replace(bankRegex, labels.account);

  return filtered;
}

// Client-side image resizing and compression
export function resizeAndCompressImage(file: File, maxWidth = 1000, quality = 0.75): Promise<File> {
  return new Promise((resolve) => {
    try {
      if (!file || !file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        try {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;

              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }

              canvas.width = width;
              canvas.height = height;

              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
              }

              canvas.toBlob((blob) => {
                try {
                  if (blob) {
                    const fileName = file.name || 'image.jpg';
                    const dotIndex = fileName.lastIndexOf('.');
                    const baseName = dotIndex !== -1 ? fileName.substring(0, dotIndex) : fileName;
                    const compressedFile = new File([blob], baseName + '.jpg', {
                      type: 'image/jpeg',
                      lastModified: Date.now()
                    });
                    resolve(compressedFile);
                  } else {
                    resolve(file);
                  }
                } catch (e) {
                  console.error('toBlob callback error:', e);
                  resolve(file);
                }
              }, 'image/jpeg', quality);
            } catch (e) {
              console.error('canvas processing error:', e);
              resolve(file);
            }
          };
          img.onerror = (e) => {
            console.error('img load error:', e);
            resolve(file);
          };
          img.src = event.target?.result as string;
        } catch (e) {
          console.error('reader onload error:', e);
          resolve(file);
        }
      };
      reader.onerror = (e) => {
        console.error('reader error:', e);
        resolve(file);
      };
    } catch (e) {
      console.error('outer compress error:', e);
      resolve(file);
    }
  });
}

// Helper to check if a user phone number matches the admin configuration
export const ADMIN_PHONE = ''; // Can be set as process.env.NEXT_PUBLIC_ADMIN_PHONE or configured on profile creation
