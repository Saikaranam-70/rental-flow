const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Storage for ID proofs (Aadhaar, DL, Passport)
const idProofStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: `rentflow/${req.agency._id}/id-proofs`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    public_id: `${file.fieldname}-${Date.now()}`,
  }),
});

// Storage for inventory photos
const inventoryStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: `rentflow/${req.agency._id}/inventory`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 600, crop: 'limit', quality: 'auto' }],
    public_id: `inventory-${Date.now()}`,
  }),
});

// Storage for agency logo
const logoStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: `rentflow/${req.agency._id}/logo`,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
    transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }],
    public_id: `logo-${Date.now()}`,
  }),
});

// Storage for rental agreements (PDF)
const agreementStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: `rentflow/${req.agency._id}/agreements`,
    allowed_formats: ['pdf'],
    resource_type: 'raw',
    public_id: `agreement-${Date.now()}`,
  }),
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/svg+xml'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPG, PNG, WebP) and PDFs are allowed'), false);
  }
};

const uploadIdProof = multer({
  storage: idProofStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
});

const uploadInventoryPhoto = multer({
  storage: inventoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter,
});

const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error('Cloudinary delete error:', err);
  }
};

module.exports = {
  cloudinary,
  uploadIdProof,
  uploadInventoryPhoto,
  uploadLogo,
  deleteFromCloudinary,
};
