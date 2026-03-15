import Service from '../models/Service.js'

export const createService = async (req, res) => {
    try {
        const { title, description, category, price, deliveryTime, tags } = req.body
        const service = new Service({
            freelancerId: req.user._id,
            title, description, category, price, deliveryTime, tags
        })
        await service.save()
        res.status(201).json(service)
    } catch (error) {
        res.status(500).json({ error: "Failed to create service" })
    }
}

export const getServices = async (req, res) => {
    try {
        const { category, minPrice, maxPrice, search } = req.query
        let filter = { isActive: true }
        if (category) filter.category = category
        if (search) filter.title = { $regex: search, $options: 'i' }
        if (minPrice || maxPrice) {
            filter.price = {}
            if (minPrice) filter.price.$gte = parseFloat(minPrice)
            if (maxPrice) filter.price.$lte = parseFloat(maxPrice)
        }
        const services = await Service.find(filter)
            .populate('freelancerId', 'username profilePic rating')
            .sort({ createdAt: -1 })
        res.status(200).json(services)
    } catch (error) {
        res.status(500).json({ error: "Failed to get services" })
    }
}

export const getServiceById = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id)
            .populate('freelancerId', 'username profilePic rating bio country')
        if (!service) return res.status(404).json({ error: "Service not found" })
        res.status(200).json(service)
    } catch (error) {
        res.status(500).json({ error: "Failed to get service" })
    }
}

export const deleteService = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id)
        if (!service) return res.status(404).json({ error: "Service not found" })
        if (service.freelancerId.toString() !== req.user._id.toString())
            return res.status(403).json({ error: "Not authorized" })
        await Service.findByIdAndDelete(req.params.id)
        res.status(200).json({ message: "Service deleted" })
    } catch (error) {
        res.status(500).json({ error: "Failed to delete service" })
    }
}
