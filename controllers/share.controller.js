const clients = require("../Models/client.modal");
const moment = require("moment");
const ApiError = require("../utils/apiError.utils");
const ApiResponse = require("../utils/apiResponse.utils");
const jwtGenetator = require("../utils/jwtGenerator");
const share = require("../Models/share.modal");
const jwtVerify = require("../utils/jwtVerify");
const user = require("../Models/user.modal");
const Transaction = require("../Models/transaction.modal");
const { default: mongoose } = require("mongoose");
const mergedShare = require("../Models/mergedShare.modal");
const { shareSchemas } = require('../utils/validationSchemas');
const {
    validateNumberRange,
    validateArray,
    validateStringLength
} = require('../utils/validationUtils');



// to generate share token which will be used to get all transaction between client and user 
const GenetateShareLink = async (req, res, next) => {
    try {
        // Validate request parameters
        const { value, unit } = req.params;
        const { clientId } = req.body;
        const parentId = req.body.user._id;

        // Validate required fields
        if (!clientId) {
            return next(ApiError.validationError([{
                field: 'clientId',
                message: 'Client ID is required',
                value: clientId
            }]));
        }

        if (!parentId) {
            return next(ApiError.authenticationError("Unauthorized user"));
        }

        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(clientId)) {
            return next(ApiError.validationError([{
                field: 'clientId',
                message: 'Invalid client ID format',
                value: clientId
            }]));
        }

        // Validate time parameters
        const valueNum = parseInt(value);
        if (!valueNum || valueNum < 1 || valueNum > 365) {
            return next(ApiError.validationError([{
                field: 'value',
                message: 'Time value must be between 1 and 365',
                value: valueNum
            }]));
        }

        const validUnits = ['minutes', 'hours', 'days', 'weeks', 'months'];
        if (!validUnits.includes(unit)) {
            return next(ApiError.validationError([{
                field: 'unit',
                message: 'Invalid time unit. Must be one of: minutes, hours, days, weeks, months',
                value: unit
            }]));
        }

        // Check if client exists
        const existingClient = await clients.findOne({
            parentId,
            _id: mongoose.Types.ObjectId(clientId),
            isActive: true
        });

        if (!existingClient) {
            return next(ApiError.notFoundError("Client not found"));
        }

        const newTime = moment().add(valueNum, unit).format('lll');
        const expireTimeMili = moment(newTime).valueOf();
        const expireTime = valueNum + " " + unit;

        // Check if link already exists with given parentId and clientId, and not expired
        const linkAlreadyExists = await share.findOne({
            parentId,
            clientId: mongoose.Types.ObjectId(clientId),
            expireTime: { $gt: Date.now() }
        });

        if (linkAlreadyExists) {
            const linkValidity = moment(parseInt(linkAlreadyExists.expireTime)).local().format("llll");
            const message = `Already have a link. Share this with your client. This link will expire on [ ${linkValidity} ]`;
            const link = `https://creditc.vercel.app/share/${linkAlreadyExists._id}`;
            return res.status(200).json(
                ApiResponse.success({ link }, message)
            );
        }

        // Generate share token
        const shareToken = await jwtGenetator({ Tn: expireTimeMili + parentId }, expireTime);

        // Create new share entry
        const result = await share.create({
            clientId: mongoose.Types.ObjectId(clientId),
            shareToken,
            parentId,
            expireTime: expireTimeMili,
            clientName: existingClient.name
        });

        const message = `Share this link with your friend. This link will expire after ${newTime}`;
        const link = `https://creditc.vercel.app/share/${result._id}`;

        return res.status(201).json(
            ApiResponse.created({ link }, message)
        );

    } catch (error) {
        console.error("Error in GenetateShareLink:", error.message);
        return next(ApiError.internalError('Failed to generate share link'));
    }
}

const generateMergedShareLink = async (req, res, next) => {
    try {
        // Validate request parameters
        const { value, unit } = req.params;
        const { clientIds } = req.body;
        const parentId = req.body.user._id;

        if (!parentId) {
            return next(ApiError.authenticationError("Unauthorized user"));
        }

        // Validate clientIds array
        if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
            return next(ApiError.validationError([{
                field: 'clientIds',
                message: 'Client IDs must be a non-empty array',
                value: clientIds
            }]));
        }

        // Validate array length
        if (clientIds.length > 10) {
            return next(ApiError.validationError([{
                field: 'clientIds',
                message: 'Maximum 10 clients can be shared at once',
                value: clientIds.length
            }]));
        }

        // Validate time parameters
        const valueNum = parseInt(value);
        if (!valueNum || valueNum < 1 || valueNum > 365) {
            return next(ApiError.validationError([{
                field: 'value',
                message: 'Time value must be between 1 and 365',
                value: valueNum
            }]));
        }

        const validUnits = ['minutes', 'hours', 'days', 'weeks', 'months'];
        if (!validUnits.includes(unit)) {
            return next(ApiError.validationError([{
                field: 'unit',
                message: 'Invalid time unit. Must be one of: minutes, hours, days, weeks, months',
                value: unit
            }]));
        }

        // Validate each clientId
        for (let i = 0; i < clientIds.length; i++) {
            const clientId = clientIds[i];
            if (!mongoose.Types.ObjectId.isValid(clientId)) {
                return next(ApiError.validationError([{
                    field: `clientIds[${i}]`,
                    message: 'Invalid client ID format',
                    value: clientId
                }]));
            }
        }

        // Check if all clients exist and belong to the user
        const existingClients = await clients.find({
            parentId,
            _id: { $in: clientIds.map(id => mongoose.Types.ObjectId(id)) },
            isActive: true
        });

        if (existingClients.length !== clientIds.length) {
            return next(ApiError.notFoundError("One or more clients not found"));
        }

        const newTime = moment().add(valueNum, unit).format('lll');
        const expireTimeMili = moment(newTime).valueOf();
        const expireTime = `${valueNum} ${unit}`;

        const shareToken = await jwtGenetator({ parentId, clientIds, expireTimeMili }, expireTime);

        const result = await mergedShare.create({
            parentId,
            clientIds,
            shareToken,
            expireTime: expireTimeMili,
        });

        const message = `Share this merged link. It will expire on ${newTime}.`;
        const link = `https://creditc.vercel.app/share/merged/${result._id}`;

        return res.status(201).json(
            ApiResponse.created({ link }, message)
        );

    } catch (error) {
        console.error("Error in generateMergedShareLink:", error.message);
        return next(ApiError.internalError('Failed to generate merged share link'));
    }
};

const getMergedTransactionData = async (req, res, next) => {
    try {
        const { id: shareRequestId } = req.params;

        if (!shareRequestId) {
            return next(ApiError.validationError([{
                field: 'id',
                message: 'Share request ID is required',
                value: shareRequestId
            }]));
        }

        if (!mongoose.Types.ObjectId.isValid(shareRequestId)) {
            return next(ApiError.validationError([{
                field: 'id',
                message: 'Invalid share request ID format',
                value: shareRequestId
            }]));
        }

        const mergedLink = await mergedShare.findById(shareRequestId);

        if (!mergedLink) {
            return next(ApiError.notFoundError("Merged link not found"));
        }

        const { parentId, clientIds, shareToken } = mergedLink;
        const tokenStatus = await jwtVerify(shareToken);

        if (tokenStatus.isExpired) {
            return next(ApiError.unauthorizedError("This merged link has expired"));
        }

        const parentData = await user.findById(parentId).select("name");
        const parentName = parentData ? parentData.name : "Unknown User";

        const clientObjectIds = clientIds.map(id => mongoose.Types.ObjectId(id));
        const clientData = await clients.find({ '_id': { $in: clientObjectIds } }).select("name");
        const clientNames = clientData.map(c => c.name);

        const result = await Transaction.aggregate([
            {
                $match: {
                    clientId: { $in: clientObjectIds }
                }
            },
            {
                $sort: {
                    "date": -1
                }
            },
            {
                $group: {
                    _id: null,
                    totalReceived: {
                        $sum: { $cond: [{ $eq: ["$type", "IN"] }, "$amount", 0] }
                    },
                    totalSent: {
                        $sum: { $cond: [{ $eq: ["$type", "OUT"] }, { $multiply: ["$amount", -1] }, 0] }
                    },
                    transactions: { $push: "$$ROOT" }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalSent: 1,
                    totalReceived: 1,
                    transactions: 1
                }
            }
        ]);

        const responseData = {
            parentName,
            clientNames,
            ...result[0]
        };

        return res.status(200).json(
            ApiResponse.success(responseData, "Merged transaction data retrieved successfully")
        );

    } catch (error) {
        console.error("Error in getMergedTransactionData:", error.message);
        return next(ApiError.internalError('Failed to retrieve merged transaction data'));
    }
};

// to display all transaction between client and user by share token
const getTransactionByShareToken = async (req, res, next) => {
    try {
        // Extract the share request ID from request headers
        const shareRequestId = req.headers.sharetoken;

        // Check if the share request ID exists and is valid
        if (!shareRequestId || shareRequestId.length <= 9) {
            return next(new ApiError(400, "Invalid link"))
        }

        // Find the share request in the database using the ID
        const shareIdResult = await share.find({ _id: shareRequestId });

        // If the share token exists
        if (shareIdResult.length > 0) {
            const { parentId, clientId, shareToken } = shareIdResult[0];

            // console.log("share result=>>", shareIdResult);

            const tokenStatus = await jwtVerify(shareToken);

            console.log(" JWT token status=>>", tokenStatus);
            console.log("token Status=>>", tokenStatus);
            // Check if the JWT token is expired
            if (tokenStatus.isExpired) {
                return next(new ApiError(402, "Expired Link"))
            }

            // Get parent data
            const parentData = await user.find({ _id: parentId });
            const parentName = parentData[0].name;

            // Aggregate transaction data to calculate total received, total sent, and transactions, also client name
            const result = await clients.aggregate(
                [
                    {
                        $match: {
                            parentId: parentId,
                            _id: mongoose.Types.ObjectId(clientId),
                        }
                    },
                    {
                        $lookup: {
                            from: "transactions",
                            localField: "_id",
                            foreignField: "clientId",
                            as: "trnsData"
                        }
                    },
                    {
                        $unwind: "$trnsData"
                    },
                    {
                        $sort: {
                            "trnsData.date": -1 // Sort transactions by date in descending order
                        }
                    },
                    {
                        $group: {
                            _id: "$_id",
                            clientName: { $first: "$name" },
                            totalRecived: { //total amount recived by parent
                                $sum: {
                                    $cond: {
                                        if: { $eq: ["$trnsData.type", "IN"] },
                                        then: "$trnsData.amount",
                                        else: 0
                                    }
                                }
                            },
                            totalSent: { // total amount sent by parent
                                $sum: {
                                    $cond: {
                                        if: { $eq: ["$trnsData.type", "OUT"] },
                                        then: { $multiply: ["$trnsData.amount", -1] },
                                        else: 0
                                    }
                                }
                            },
                            transactions: {
                                $push: {
                                    $cond: {
                                        if: { $eq: ["$trnsData.type", "IN"] },
                                        then: {
                                            "type": "sent",
                                            "amount": { $multiply: ["$trnsData.amount", -1] },
                                            "dis": "$trnsData.dis",
                                            "date": "$trnsData.date"
                                        },
                                        else: {
                                            "type": "recived",
                                            "amount": { $multiply: ["$trnsData.amount", -1] },
                                            "dis": "$trnsData.dis",
                                            "date": "$trnsData.date"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            clientName: 1,
                            _id: 0,
                            totalSent: 1,
                            totalRecived: 1,
                            balance: { $subtract: ["$totalSent", "$totalRecived"] },
                            transactions: 1,
                        }
                    }
                ]
            );

            const { clientName, totalRecived, totalSent, balance, transactions } = result[0]
            return res.status(200).json(new ApiResponse(true, false, "success", {
                parentName,
                clientName,
                totalRecived,
                totalSent,
                balance,
                transactions
            }));
        }

        // if share token not found in database
        return next(new ApiError(404, 'Invalid Link'));

    } catch (error) {
        return next(new ApiError(500, error.message));
    }
}

// to delete share token or expire link
const deleteShareToken = async (req, res, next) => {
    try {
        const { shareid } = req.headers
        //*********** */ to find out that provided id is valid object Id or not********
        const isObjectId = mongoose.isValidObjectId(shareid)

        // ***************** if  not a valid object id **********************
        if (!isObjectId) {

            return next(new ApiError(502, "Bad request !"));
        }
        // *********  valid object id ******

        //**********  find the record in database by provided id  ************
        const result = await share.findOne({ _id: shareid });

        // ******** if record  not not found 
        if (result == null) {
            return next(new ApiError(502, 'Invalid request'))
        }

        // check if link exists in database
        if (result.id === shareid) {
            // delete record from database
            const deleteResult = await share.deleteOne({ _id: shareid })

            // if record deleted successfully 
            if (deleteResult.deletedCount == 1) {
                return res.status(200).json(
                    new ApiResponse(true, false, "Link deleted successfully")
                )

            }
            // if record is not deleted or any error at database

            return next(new ApiError(401, "something went wrong"))


        }
    }
    catch (error) {
        return next(new ApiError(500, error.message));
    }
}



module.exports = {
    GenetateShareLink,
    getTransactionByShareToken,
    deleteShareToken,
    generateMergedShareLink,
    getMergedTransactionData
}
