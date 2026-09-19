const { ApiError } = require("../utils/apiError.utils");
const jwtVerify = require("../utils/jwtVerify");

async function authy(req, res, next) {
    try {
        var origin = req.get('origin');
        const token = req.cookies.user
        const cookies = req.cookies.user
        const pKey = process.env.PKEY
        const authToken = req.headers.token || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null)

        // Check if token is missing or undefined
        if (!authToken && cookies === "undefined") {
            // Respond with session expired error
            return res.status(401).json({ message: "Session expired , Login please ", type: "error", isSuccess: false, isError: true });
            // throw Error(401, "Session expired")
        }

        const tokenResult = await jwtVerify(authToken, pKey)
        if (tokenResult.error) {
            const message = tokenResult.isExpired ? "session expired" : "unauthorized user access"
            return res.status(401).json({
                type: "error",
                message: message,
                isSuccess: false,
                isError: true
            })
        }

        req.body.user = tokenResult
        // Multer (used on multipart/form-data routes, e.g. file uploads)
        // replaces req.body wholesale when it parses the request, wiping out
        // req.body.user set above. req.user is untouched by multer, so
        // routes that run a multer middleware after authy must read the
        // user from here instead of req.body.user.
        req.user = tokenResult
        next()
    } catch (error) {
        // Handle internal server error
        res.status(500).json(
            {
                type: 'error',
                message: 'Internal server error!',
                isSuccess: false
                , isError: true
            });
    }
}

module.exports = authy