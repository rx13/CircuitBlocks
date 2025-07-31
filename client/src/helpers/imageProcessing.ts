// imageProcessing.ts
// Utilities for client-side image upload, resizing, transparency, and PNG conversion

export interface ProcessedImage {
  data: string; // base64 PNG
  width: number;
  height: number;
  originalName: string;
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Unsupported file type.' };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { valid: false, error: 'File size exceeds 2MB.' };
  }
  return { valid: true };
}

export async function processImageFile(file: File): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = new window.Image();
      img.onload = () => {
        // Resize and ensure transparency
        const canvas = resizeCanvas(img, 128, 128);
        const transparentCanvas = ensureTransparency(canvas);
        resolve({
          data: transparentCanvas.toDataURL('image/png'),
          width: transparentCanvas.width,
          height: transparentCanvas.height,
          originalName: file.name,
        });
      };
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export function resizeCanvas(img: HTMLImageElement, maxWidth: number, maxHeight: number): HTMLCanvasElement {
  let { width, height } = img;
  if (width > maxWidth || height > maxHeight) {
    const scale = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
  }
  return canvas;
}

export function ensureTransparency(canvas: HTMLCanvasElement): HTMLCanvasElement {
  // If the image already has alpha, do nothing. If not, add transparent background.
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let hasAlpha = false;
  for (let i = 0; i < imgData.data.length; i += 4) {
    if (imgData.data[i + 3] < 255) {
      hasAlpha = true;
      break;
    }
  }
  if (!hasAlpha) {
    // Add transparent background for non-alpha images (e.g., JPG)
    for (let i = 0; i < imgData.data.length; i += 4) {
      if (
        imgData.data[i] === 255 &&
        imgData.data[i + 1] === 255 &&
        imgData.data[i + 2] === 255
      ) {
        imgData.data[i + 3] = 0;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
  return canvas;
}
