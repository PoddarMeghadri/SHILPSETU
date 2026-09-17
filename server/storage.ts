import fs from 'fs';
import path from 'path';
import multer from 'multer';

// Storage directory for uploaded craft images
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer disk storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    cb(null, `craft_${uniqueSuffix}${ext}`);
  },
});

// File validation: Only JPEG, PNG, WEBP and max 10MB
export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images up to 10MB are permitted'));
    }
  },
});

export async function saveBase64Image(base64Data: string, prefix = 'craft'): Promise<string> {
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    // If already an HTTP/HTTPS URL
    if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
      return base64Data;
    }
    throw new Error('Invalid base64 image data');
  }

  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');

  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error('Image exceeds 10MB maximum limit');
  }

  let ext = '.jpg';
  if (mimeType === 'image/png') ext = '.png';
  if (mimeType === 'image/webp') ext = '.webp';

  const filename = `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  fs.writeFileSync(filePath, buffer);
  return `/uploads/${filename}`;
}
