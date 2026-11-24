// AWS S3 Upload Utility for Now 9 Citizen Videos & Media Assets
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const REGION = import.meta.env.VITE_AWS_REGION || 'ap-south-2';
const BUCKET = import.meta.env.VITE_AWS_S3_BUCKET || 'now9-media-hyderabad';
const ACCESS_KEY_ID = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;

let s3ClientInstance = null;

function getS3Client() {
  if (!s3ClientInstance && ACCESS_KEY_ID && SECRET_ACCESS_KEY) {
    s3ClientInstance = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      },
    });
  }
  return s3ClientInstance;
}

/**
 * Uploads a video or image file to AWS S3 bucket
 * @param {File|Blob} file - The file to upload
 * @param {string} folder - 'videos', 'common-talks', 'thumbnails'
 * @param {function} onProgress - Optional progress callback (percent: number)
 * @returns {Promise<string>} Public URL of the uploaded S3 object
 */
export async function uploadFileToS3(file, folder = 'videos', onProgress = null) {
  const client = getS3Client();

  if (!client || !BUCKET) {
    console.warn('[AWS S3] S3 credentials missing, using local object URL');
    return file instanceof Blob ? URL.createObjectURL(file) : '';
  }

  try {
    if (onProgress) onProgress(20);

    const cleanName = file.name 
      ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      : `media_${Date.now()}.mp4`;
    const key = `${folder}/${Date.now()}_${cleanName}`;

    // Convert file to ArrayBuffer/Uint8Array for browser upload compatibility
    const arrayBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);

    if (onProgress) onProgress(50);

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fileBytes,
      ContentType: file.type || 'video/mp4',
    });

    if (onProgress) onProgress(75);

    await client.send(command);

    if (onProgress) onProgress(100);

    const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
    console.log('[AWS S3] Successfully uploaded to:', publicUrl);
    return publicUrl;
  } catch (err) {
    console.error('[AWS S3] Upload failed, falling back to local preview:', err);
    // If S3 upload fails for any reason (e.g. offline/CORS error), fallback gracefully so user flow doesn't break
    return file instanceof Blob ? URL.createObjectURL(file) : '';
  }
}
