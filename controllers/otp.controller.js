const otpModel = require('../Models/otp.modal');
const user = require('../Models/user.modal');
const ApiError = require('../utils/apiError.utils');
const ApiResponse = require('../utils/apiResponse.utils');
const jwtGenetator = require('../utils/jwtGenerator');
const { otpSchemas } = require('../utils/validationSchemas');

/**
 * Generate a random 6-digit OTP
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Request OTP for login or password reset
 */
const requestOtp = async (req, res, next) => {
    try {
        // Validate request body
        const { error, value } = otpSchemas.requestOtp.validate(req.body, {
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

        const { email, purpose } = value;

        // Check if user exists (for login and password reset)
        const userExists = await user.findOne({ email: email.toLowerCase() });
        if (!userExists) {
            return next(ApiError.notFoundError('User not found'));
        }

        // Check for recent OTP requests (rate limiting - max 3 requests per 10 minutes)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const recentOtps = await otpModel.countDocuments({
            email: email.toLowerCase(),
            purpose,
            createdAt: { $gte: tenMinutesAgo }
        });

        if (recentOtps >= 3) {
            return next(ApiError.rateLimitError('Too many OTP requests. Please wait 10 minutes before requesting again.'));
        }

        // Invalidate previous unverified OTPs for this email and purpose
        await otpModel.updateMany(
            {
                email: email.toLowerCase(),
                purpose,
                isVerified: false
            },
            {
                $set: { isVerified: true } // Mark as "used" by setting isVerified to true
            }
        );

        // Generate new OTP
        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        // Create OTP record
        const otpRecord = await otpModel.create({
            email: email.toLowerCase(),
            otp: otpCode,
            purpose,
            userId: userExists._id,
            expiresAt
        });

        // TODO: In production, send OTP via email/SMS
        // For now, we'll return it in the response (development only)
        // In production, remove the OTP from response and send via email
        console.log(`📧 OTP for ${email} (${purpose}): ${otpCode}`);

        return res.status(200).json(
            ApiResponse.success(
                {
                    message: purpose === 'login' 
                        ? 'OTP sent to your email. Please check your inbox.' 
                        : 'OTP sent to your email for password reset. Please check your inbox.',
                    // Remove this in production - only for development
                    otp: process.env.NODE_ENV === 'development' ? otpCode : undefined,
                    expiresIn: '10 minutes'
                },
                'OTP sent successfully'
            )
        );

    } catch (error) {
        console.error('Request OTP error:', error);
        return next(ApiError.internalError('Failed to send OTP'));
    }
};

/**
 * Verify OTP for login
 */
const verifyOtpForLogin = async (req, res, next) => {
    try {
        // Validate request body
        const { error, value } = otpSchemas.verifyOtp.validate(req.body, {
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

        const { email, otp, purpose } = value;

        if (purpose !== 'login') {
            return next(ApiError.validationError([{
                field: 'purpose',
                message: 'Invalid purpose for this endpoint. Use password reset endpoint for password reset.',
                value: purpose
            }]));
        }

        // Find the most recent unverified OTP for this email and purpose
        const otpRecord = await otpModel.findOne({
            email: email.toLowerCase(),
            purpose: 'login',
            isVerified: false
        }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return next(ApiError.notFoundError('OTP not found or already used. Please request a new OTP.'));
        }

        // Check if OTP is expired
        if (otpRecord.expiresAt < new Date()) {
            return next(ApiError.unauthorizedError('OTP has expired. Please request a new OTP.'));
        }

        // Check if maximum attempts exceeded
        if (otpRecord.attempts >= 5) {
            return next(ApiError.unauthorizedError('Maximum verification attempts exceeded. Please request a new OTP.'));
        }

        // Verify OTP
        if (otpRecord.otp !== otp) {
            await otpRecord.incrementAttempts();
            return next(ApiError.authenticationError('Invalid OTP. Please try again.'));
        }

        // Mark OTP as verified
        await otpRecord.markAsVerified();

        // Find user
        const userExists = await user.findOne({ email: email.toLowerCase() });
        if (!userExists) {
            return next(ApiError.notFoundError('User not found'));
        }

        // Generate JWT token
        const { name, email: userEmail, __v, token: tkn, ...userData } = userExists.toObject();
        delete userData.pass;

        const token = await jwtGenetator(userData, "28d");
        if (token.error) {
            console.error("Error generating token:", token.message);
            return next(ApiError.internalError("Token generation failed"));
        }

        // Update user's last login
        await user.findByIdAndUpdate(userExists._id, {
            lastLogin: new Date(),
            $inc: { loginCount: 1 }
        });

        // Setting cookies options
        const cookieOptions = {
            expires: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: true,
            sameSite: "none",
        };

        // Return response with authorization token
        res.cookie("user", token, cookieOptions);
        return res.json(
            ApiResponse.success(
                { user: token },
                "Login successful with OTP"
            )
        );

    } catch (error) {
        console.error('Verify OTP for login error:', error);
        return next(ApiError.internalError('Failed to verify OTP'));
    }
};

/**
 * Verify OTP for password reset
 */
const verifyOtpForPasswordReset = async (req, res, next) => {
    try {
        // Validate request body
        const { error, value } = otpSchemas.verifyOtp.validate(req.body, {
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

        const { email, otp, purpose } = value;

        if (purpose !== 'password_reset') {
            return next(ApiError.validationError([{
                field: 'purpose',
                message: 'Invalid purpose for this endpoint.',
                value: purpose
            }]));
        }

        // Find the most recent unverified OTP for this email and purpose
        const otpRecord = await otpModel.findOne({
            email: email.toLowerCase(),
            purpose: 'password_reset',
            isVerified: false
        }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return next(ApiError.notFoundError('OTP not found or already used. Please request a new OTP.'));
        }

        // Check if OTP is expired
        if (otpRecord.expiresAt < new Date()) {
            return next(ApiError.unauthorizedError('OTP has expired. Please request a new OTP.'));
        }

        // Check if maximum attempts exceeded
        if (otpRecord.attempts >= 5) {
            return next(ApiError.unauthorizedError('Maximum verification attempts exceeded. Please request a new OTP.'));
        }

        // Verify OTP
        if (otpRecord.otp !== otp) {
            await otpRecord.incrementAttempts();
            return next(ApiError.authenticationError('Invalid OTP. Please try again.'));
        }

        // Mark OTP as verified
        await otpRecord.markAsVerified();

        // Return success - OTP verified, user can now reset password
        return res.status(200).json(
            ApiResponse.success(
                {
                    message: 'OTP verified successfully. You can now reset your password.',
                    verified: true
                },
                'OTP verified successfully'
            )
        );

    } catch (error) {
        console.error('Verify OTP for password reset error:', error);
        return next(ApiError.internalError('Failed to verify OTP'));
    }
};

/**
 * Reset password with verified OTP
 */
const resetPassword = async (req, res, next) => {
    try {
        // Validate request body
        const { error, value } = otpSchemas.resetPassword.validate(req.body, {
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

        const { email, otp, newPassword } = value;

        // Find verified OTP for password reset
        const otpRecord = await otpModel.findOne({
            email: email.toLowerCase(),
            purpose: 'password_reset',
            otp,
            isVerified: true
        }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return next(ApiError.unauthorizedError('Invalid or unverified OTP. Please verify OTP first.'));
        }

        // Check if OTP was verified recently (within last 15 minutes)
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        if (!otpRecord.verifiedAt || otpRecord.verifiedAt < fifteenMinutesAgo) {
            return next(ApiError.unauthorizedError('OTP verification expired. Please request a new OTP.'));
        }

        // Find user
        const userExists = await user.findOne({ email: email.toLowerCase() });
        if (!userExists) {
            return next(ApiError.notFoundError('User not found'));
        }

        // Hash new password
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        await user.findByIdAndUpdate(userExists._id, {
            pass: hashedPassword
        });

        // Invalidate all OTPs for this email and purpose
        await otpModel.updateMany(
            {
                email: email.toLowerCase(),
                purpose: 'password_reset'
            },
            {
                $set: { isVerified: true }
            }
        );

        return res.status(200).json(
            ApiResponse.success(
                null,
                'Password reset successfully. You can now login with your new password.'
            )
        );

    } catch (error) {
        console.error('Reset password error:', error);
        return next(ApiError.internalError('Failed to reset password'));
    }
};

module.exports = {
    requestOtp,
    verifyOtpForLogin,
    verifyOtpForPasswordReset,
    resetPassword
};

