import PDFDocument from 'pdfkit'
import Transaction from '../models/Transaction.js'
import User from '../models/User.js'
import Project from '../models/Project.js'

export const generateInvoice = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.transactionId)
            .populate('fromUserId', 'username email')
            .populate('toUserId', 'username email')
            .populate('projectId', 'title')

        if (!transaction) return res.status(404).json({ error: "Transaction not found" })

        const doc = new PDFDocument({ margin: 50 })

        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${transaction._id}.pdf`)
        doc.pipe(res)

        // Header
        doc.fontSize(24).fillColor('#1A2E4A').text('FURSA', { align: 'center' })
        doc.fontSize(10).fillColor('#666').text('فرصة — Freelancing Platform', { align: 'center' })
        doc.moveDown()
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#FF6B35')
        doc.moveDown()

        // Invoice title
        doc.fontSize(18).fillColor('#1A2E4A').text('INVOICE / فاتورة', { align: 'center' })
        doc.moveDown()

        // Invoice details
        doc.fontSize(11).fillColor('#333')
        doc.text(`Invoice ID: ${transaction._id}`)
        doc.text(`Date: ${new Date(transaction.createdAt).toLocaleDateString('en-US')}`)
        doc.text(`Status: ${transaction.status.toUpperCase()}`)
        doc.moveDown()

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#ddd')
        doc.moveDown()

        // Parties
        doc.fontSize(12).fillColor('#1A2E4A').text('From / من:')
        doc.fontSize(11).fillColor('#333')
        doc.text(`Name: ${transaction.fromUserId?.username || 'N/A'}`)
        doc.text(`Email: ${transaction.fromUserId?.email || 'N/A'}`)
        doc.moveDown()

        doc.fontSize(12).fillColor('#1A2E4A').text('To / إلى:')
        doc.fontSize(11).fillColor('#333')
        doc.text(`Name: ${transaction.toUserId?.username || 'N/A'}`)
        doc.text(`Email: ${transaction.toUserId?.email || 'N/A'}`)
        doc.moveDown()

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#ddd')
        doc.moveDown()

        // Project
        if (transaction.projectId) {
            doc.fontSize(12).fillColor('#1A2E4A').text('Project / المشروع:')
            doc.fontSize(11).fillColor('#333').text(transaction.projectId.title)
            doc.moveDown()
        }

        // Amount
        doc.fontSize(14).fillColor('#FF6B35')
            .text(`Total Amount: $${transaction.amount}`, { align: 'right' })
        doc.fontSize(11).fillColor('#666')
            .text(`Type: ${transaction.type}`, { align: 'right' })
        doc.moveDown(2)

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#FF6B35')
        doc.moveDown()
        doc.fontSize(10).fillColor('#999')
            .text('Thank you for using Fursa Platform — شكراً لاستخدامك منصة فرصة', { align: 'center' })

        doc.end()
    } catch (error) {
        res.status(500).json({ error: "Failed to generate invoice" })
    }
}
