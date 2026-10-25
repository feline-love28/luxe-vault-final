const jwt = require('jsonwebtoken');

// Protects a route: expects header "Authorization: Bearer <token>"
function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ success: false, message: 'Please log in first.' });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
}

// Use after requireAuth: only lets admins through
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access only.' });
    }
    next();
}

module.exports = { requireAuth, requireAdmin };
