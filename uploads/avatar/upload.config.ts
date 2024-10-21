import { diskStorage } from 'multer';
import { extname } from 'path';

export const storageConfig = (folder: string) => {
  return diskStorage({
    destination: `./uploads/${folder}`,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    }
  });
};

export const fileFilter = (req, file, cb) => {
  const ext = extname(file.originalname);
  const allowedExtArr = ['.jpg', '.png', '.jpeg'];
  
  if (!allowedExtArr.includes(ext)) {
    req.fileValidationError = `Wrong extension type. Accepted files ext are: ${allowedExtArr.toString()}`;
    cb(null, false);
  } else {
    const fileSize = parseInt(req.headers['Content-Length']);
    if (fileSize > 1024 * 1024 * 5) { 
      req.fileValidationError = 'File is too large';
      cb(null, false);
    } else {
      cb(null, true);
    }
  }
};
