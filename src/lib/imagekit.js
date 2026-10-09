// ImageKit Integration for Freight Inquiries Screenshots & Media

const imagekitPublicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;
const imagekitUrlEndpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT;

export const isImageKitConfigured = Boolean(
  imagekitPublicKey && 
  imagekitUrlEndpoint && 
  !imagekitUrlEndpoint.includes('your_imagekit_id')
);

/**
 * Upload an inquiry screenshot / image to ImageKit
 * @param {File|Blob} file - The image file from clipboard or file picker
 * @param {string} fileName - Optional desired file name
 * @returns {Promise<{url: string, fileId: string}|null>}
 */
export async function uploadScreenshotToImageKit(file, fileName = `inquiry-screenshot-${Date.now()}.png`) {
  if (!file) return null;

  // If ImageKit credentials are configured, upload via ImageKit REST API
  if (isImageKitConfigured) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      formData.append('publicKey', imagekitPublicKey);
      formData.append('useUniqueFileName', 'true');
      formData.append('folder', '/polestar-inquiries');

      const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: formData
      });

      if (uploadRes.ok) {
        const result = await uploadRes.json();
        return {
          url: result.url,
          thumbnailUrl: result.thumbnailUrl,
          fileId: result.fileId
        };
      } else {
        const errText = await uploadRes.text();
        console.warn('ImageKit direct upload response:', errText);
      }
    } catch (err) {
      console.warn('ImageKit upload exception:', err);
    }
  }

  // Graceful Fallback: Generate local object URL if upload is unavailable
  return new Promise((resolve) => {
    if (file instanceof Blob || file instanceof File) {
      const localUrl = URL.createObjectURL(file);
      resolve({
        url: localUrl,
        thumbnailUrl: localUrl,
        fileId: `local-${Date.now()}`
      });
    } else {
      resolve(null);
    }
  });
}
