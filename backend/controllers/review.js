import Review from '../models/Review.js'
import User from '../models/User.js'

export const createReview = async (req, res) => {
    try {
        const { revieweeId, projectId, rating, comment } = req.body
        if (!revieweeId) return res.status(400).json({ error: "Freelancer ID is required" })
        if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be between 1 and 5" })

        // Prevent duplicate: one review per client per freelancer (or per project if provided)
        const dupQuery = projectId
            ? { reviewerId: req.user._id, projectId }
            : { reviewerId: req.user._id, revieweeId }
        const existing = await Review.findOne(dupQuery)
        if (existing) return res.status(400).json({ error: "You have already reviewed this freelancer" })

        const review = new Review({ reviewerId: req.user._id, revieweeId, projectId, rating, comment })
        await review.save()

        // Update user average rating
        const reviews = await Review.find({ revieweeId })
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        await User.findByIdAndUpdate(revieweeId, {
            rating: Math.round(avgRating * 10) / 10,
            totalReviews: reviews.length
        })

        res.status(201).json(review)
    } catch (error) {
        res.status(500).json({ error: "Failed to create review" })
    }
}

export const getReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ revieweeId: req.params.userId })
            .populate('reviewerId', 'username profilePic')
            .sort({ createdAt: -1 })
        res.status(200).json(reviews)
    } catch (error) {
        res.status(500).json({ error: "Failed to get reviews" })
    }
}
