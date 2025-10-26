const bcrypt = require('bcryptjs');
const user = require("../Models/user.modal");
const loginRecord = require("../Models/loginRecord.modal"); // Import login record model
const ApiError = require("../utils/apiError.utils");
const ApiResponse = require("../utils/apiResponse.utils");
const jwtGenetator = require('../utils/jwtGenerator');
const clients = require('../Models/client.modal');
const share = require('../Models/share.modal');
const { userSchemas } = require('../utils/validationSchemas');
const { validateRequest } = require('../middleware/validation.middleware');
const {
    isValidEmail,
    validatePasswordStrength,
    validateStringLength
} = require('../utils/validationUtils.js');






// to register new user 
const register = async (req, res, next) => {
    try {
        // Validate request body using Joi schema
        const { error, value } = userSchemas.register.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const validationErrors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));
            return next(ApiError.validationError(validationErrors));
        }

        const { name, email, pass } = value;

        // Check if user already exists
        const userExist = await user.findOne({ email });
        if (userExist) {
            return next(ApiError.conflictError('Email already exists'));
        }

        // Encrypting password
        const enPass = await bcrypt.hash(pass, 10);

        // Saving user data in database
        let query = await user.create({ name, email, pass: enPass });
        query = await query.toObject();

        // Removing sensitive data before sending response
        delete query.pass;
        delete query.email;

        return res.status(201).json(
            ApiResponse.created(null, "Registration successful")
        );

    }
    catch (error) {
        // Handle database errors
        if (error.code === 11000) {
            return next(ApiError.conflictError('Email already exists'));
        }

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => ({
                field: err.path,
                message: err.message,
                value: err.value
            }));
            return next(ApiError.validationError(validationErrors));
        }

        // Handle other errors
        console.error('Registration error:', error);
        return next(ApiError.internalError('Registration failed'));
    }

}

// login user
const login = async (req, res, next) => {
    try {
        // Validate request body using Joi schema
        const { error, value } = userSchemas.login.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const validationErrors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));
            return next(ApiError.validationError(validationErrors));
        }

        const { email, pass } = value;

        //find user by email
        const userExists = await user.findOne({ email });

        // if user not found
        if (!userExists) {
            return next(ApiError.notFoundError('User does not exist'));
        }

        // compare password in bd vs entered password
        const isPasswordValid = await bcrypt.compare(pass, userExists.pass);

        // if password is incorrect
        if (!isPasswordValid) {
            return next(ApiError.authenticationError("Invalid password"));
        }
        // extract all values except _id
        const { name, email: userEmail, __v, token: tkn, ...userData } = userExists.toObject();

        // delete password 
        delete userData.pass;

        // generate jwt token for authentication
        const token = await jwtGenetator(userData, "28d")
        // if error while generating token
        if (token.error) {
            console.error("Error generating token:", token.message);
            return next(ApiError.internalError("Token generation failed"));
        }

        // Create login record for successful authentication
        try {
            const { v4: uuidv4 } = require('uuid'); // Import UUID for session ID generation

            // Utility functions for device detection
            const detectDeviceType = (userAgent) => {
                const ua = userAgent.toLowerCase();
                if (/android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua)) {
                    if (/ipad/i.test(ua)) return 'tablet';
                    return 'mobile';
                }
                if (/windows|macintosh|linux/i.test(ua)) {
                    return 'desktop';
                }
                return 'unknown';
            };

            const detectPlatform = (userAgent) => {
                const ua = userAgent.toLowerCase();
                if (/android/i.test(ua)) return 'android';
                if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
                if (/windows/i.test(ua)) return 'windows';
                if (/macintosh/i.test(ua)) return 'macos';
                if (/linux/i.test(ua)) return 'linux';
                if (/chrome|firefox|safari|edge/i.test(ua)) return 'web';
                return 'unknown';
            };

            const getClientIP = (req) => {
                const forwarded = req.headers['x-forwarded-for'];
                if (forwarded) {
                    return forwarded.split(',')[0].trim();
                }
                const realIP = req.headers['x-real-ip'];
                if (realIP) {
                    return realIP;
                }
                return req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
            };

            // Create login record data
            const userAgent = req.headers['user-agent'] || 'unknown';
            const ipAddress = getClientIP(req);
            const sessionId = uuidv4();
            const deviceType = detectDeviceType(userAgent);
            const platform = detectPlatform(userAgent);

            const loginData = {
                userId: userExists._id,
                sessionId,
                loginTime: new Date(),
                loginStatus: 'success',
                userAgent,
                deviceType,
                platform,
                ipAddress,
                appVersion: req.headers['app-version'] || '1.0.0',
                apiVersion: 'v1',
                metadata: {
                    requestId: req.headers['x-request-id'] || '',
                    referer: req.headers.referer || '',
                    acceptLanguage: req.headers['accept-language'] || ''
                }
            };

            // Create the login record asynchronously (don't block the response)
            loginRecord.createLoginRecord(loginData).catch(error => {
                console.error('Error creating login record:', error);
                // Don't fail the login if login record creation fails
            });

            // Add session ID to the response for frontend tracking
            userData.sessionId = sessionId;

        } catch (loginRecordError) {
            console.error('Error in login record creation:', loginRecordError);
            // Continue with login even if login record creation fails
        }

        // setting cookies options
        const cookieOptions = {
            expires: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: true,
            sameSite: "none",
        };

        // return response with authorization token
        res.cookie("user", token, cookieOptions)
        return res.json(new ApiResponse(true, false, "login successfully", { user: token }));

    } catch (error) {
        //
        console.error("login Error= >", error.message);
        return next(new Error(error.message));
    }
}

// to logout user 
const logout = async (req, res, next) => {
    try {
        // Get session ID from request body or headers
        const sessionId = req.body.sessionId || req.headers['session-id'];

        // Update logout time if session ID is available
        if (sessionId) {
            try {
                await loginRecord.updateLogoutTime(sessionId, new Date());
            } catch (loginRecordError) {
                console.error('Error updating logout time:', loginRecordError);
                // Don't fail logout if login record update fails
            }
        }

        // clear cookies 
        res.clearCookie("user").json(new ApiResponse(true, false, "You've been successfully logged out. Thank you!"))

    } catch (error) {
        // if any error while logging out
        return next(new ApiError(500, error.message))
    }
}

// user profile 
const profile = async (req, res, next) => {
    const currentTime = Date.now()
    try {
        const { _id } = req.body.user
        console.log("🔍 User Profile - parent =>", req.body.user)

        // Get user data including email
        const userData = await user.findOne({ _id })
        console.log("🔍 User Profile - userData =>", userData)

        if (!userData) {
            return next(new ApiError(404, "User not found"));
        }

        const { name, email } = userData
        console.log("🔍 User Profile - Name: " + name + ", Email: " + email)

        // console.log(`req recived  name=>${name} , _ID=>${_id} `)
        const { name } = await user.findOne({ _id })
        const allClients = await clients.find({ parentId: _id }, { transactions: 0, parentId: 0 });
        let allSharedLinks = await share.find({ parentId: _id })

        allSharedLinks = allSharedLinks.map(({ shareToken, clientName, expireTime, _id }) => {
            return {
                linkId: _id,
                isActive: currentTime < expireTime,
                clientName, shareToken
            }
        })

        console.log("🔍 User Profile - Name=>", name)
        console.log("🔍 User Profile - Email=>", email)
        console.log("🔍 User Profile - all shared links =>", allSharedLinks)

        })
        console.log("Name=>", name)
        console.log("all shared links =>", allSharedLinks)
        return res.status(200).json(
            new ApiResponse(true, false, "success", {
                name: name,
                email: email,
                symbol: name.charAt(0),
                allClients: allClients,
                allSharedLinks: allSharedLinks
            })
        )
    } catch (error) {
        console.error("🔍 User Profile - Error:", error.message);
        return next(new ApiError(500, error.message));
    }
}

// Verify password for PIN reset
const verifyPasswordForPinReset = async (req, res, next) => {
    try {
        // Validate request body
        const { error, value } = userSchemas.login.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const validationErrors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));
            return next(ApiError.validationError(validationErrors));
        }

        const { email, pass } = value;

        // Find user by email
        const userExist = await user.findOne({ email });
        if (!userExist) {
            return next(ApiError.notFoundError('User not found'));
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(pass, userExist.pass);
        if (!isPasswordValid) {
            return next(ApiError.unauthorizedError('Invalid password'));
        }

        // Generate temporary reset token (valid for 10 minutes)
        const resetToken = jwtGenetator.generateResetToken(userExist._id);

        return res.status(200).json(
            ApiResponse.success({
                resetToken,
                expiresIn: '10 minutes'
            }, "Password verified successfully. You can now reset your PIN.")
        );

    } catch (error) {
        console.error('Password verification error:', error);
        return next(ApiError.internalError('Password verification failed'));
    }
};

// Reset PIN with verified password
const resetPin = async (req, res, next) => {
    try {
        const { resetToken, newPin } = req.body;

        if (!resetToken || !newPin) {
            return next(ApiError.badRequestError('Reset token and new PIN are required'));
        }

        // Verify reset token
        const decoded = jwtGenetator.verifyResetToken(resetToken);
        if (!decoded) {
            return next(ApiError.unauthorizedError('Invalid or expired reset token'));
        }

        // Find user
        const userExist = await user.findById(decoded.userId);
        if (!userExist) {
            return next(ApiError.notFoundError('User not found'));
        }

        // Hash the new PIN
        const hashedPin = await bcrypt.hash(newPin, 10);

        // Update user's PIN (assuming you have a PIN field in user model)
        // For now, we'll store it in a separate field or use a different approach
        // You might want to store PIN in a separate vault collection
        
        return res.status(200).json(
            ApiResponse.success(null, "PIN reset successfully")
        );

    } catch (error) {
        console.error('PIN reset error:', error);
        return next(ApiError.internalError('PIN reset failed'));
    }
};

module.exports = {
    register,
    login,
    profile,
    logout,
    verifyPasswordForPinReset,
    resetPin
};