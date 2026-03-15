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
    const ext = allowed.test(path.extname(file.originalname).toLowerCase())
    ext ? cb(null, true) : cb(new Error('File type not allowed'))
}

export const uploadAvatar = multer({ storage: createStorage('avatars'), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter })
export const uploadPortfolio = multer({ storage: createStorage('portfolio'), limits: { fileSize: 20 * 1024 * 1024 }, fileFilter })
export const uploadDeliverable = multer({ storage: createStorage('deliverables'), limits: { fileSize: 50 * 1024 * 1024 }, fileFilter })
export const uploadDocument = multer({ storage: createStorage('documents'), limits: { fileSize: 10 * 1024 * 1024 }, fileFilter })
