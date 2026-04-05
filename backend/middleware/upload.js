import multer from 'multer'
import path from 'path'
import fs from 'fs'

const createStorage = (folder) => multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = `uploads/${folder}`
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        cb(null, dir)
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
        cb(null, unique + path.extname(file.originalname))
    }
})

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|zip|mp4|mov/
    const safeName = typeof file.originalname === 'string' ? file.originalname : ''
    const ext = allowed.test(path.extname(safeName).toLowerCase())
    ext ? cb(null, true) : cb(new Error('File type not allowed'))
}

/** RN often sends empty/missing filename; rely on mimetype and default .jpg */
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/avatars'
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        cb(null, dir)
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
        let ext = path.extname((file.originalname && String(file.originalname)) || '')
        if (!ext || ext === '.') {
            const m = (file.mimetype || '').toLowerCase()
            if (m.includes('png')) ext = '.png'
            else if (m.includes('gif')) ext = '.gif'
            else if (m.includes('webp')) ext = '.webp'
            else if (m.includes('heic') || m.includes('heif')) ext = '.jpg'
            else ext = '.jpg'
        }
        cb(null, unique + ext)
    },
})

const avatarFileFilter = (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase()
    const safeName = typeof file.originalname === 'string' ? file.originalname : ''
    const ext = path.extname(safeName).toLowerCase()
    const mimeOk = /^image\/(jpeg|pjpeg|png|gif|webp|heic|heif|x-ms-bmp)$/i.test(mime)
    const extOk = /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(ext)
    if (mimeOk || extOk) return cb(null, true)
    cb(new Error('File type not allowed'))
}

export const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: avatarFileFilter,
})
export const uploadPortfolio = multer({ storage: createStorage('portfolio'), limits: { fileSize: 20 * 1024 * 1024 }, fileFilter })
export const uploadDeliverable = multer({ storage: createStorage('deliverables'), limits: { fileSize: 50 * 1024 * 1024 }, fileFilter })
export const uploadDocument = multer({ storage: createStorage('documents'), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter })
