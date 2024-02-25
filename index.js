//moduls
const Pkey = process.env.jwt_key
const cors = require('cors')
const bcrypt = require('bcryptjs')
const express = require('express')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const { ObjectId } = require("mongoose")
require('./db/config.js')
const app = express()
const user = require('./Models/user.modal.js');
const clients = require('./Models/client.modal.js')
const share = require('./Models/share.modal.js')
const jwtGenetator = require('./utils/jwtGenerator.js')
const jwtVerify = require('./utils/jwtVerify.js')
const Transaction = require('./Models/transaction.modal.js')


//meddilswares

const privetKey = "WeShoulHaveAStrongPriVaTeKek@24-12-2022"
let i = 0
app.use(express.json())
app.use(cookieParser());

// app.use(cors({
//     origin: 'http://localhost:3000', // Adjust the origin to match your React app's URL
//     credentials: true
// }))
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Accept,query,token,clietnId,clientName,shareid,uid,clientid,parentid,sharetoken');
    res.setHeader('Access-Control-Allow-Credentials', true);
    // res.setHeader("access-control-allow-params", 'tId')
    next();
})
//
const port = process.env.port || 2205

async function authy(req, res, next) {
    try {
        var origin = req.get('origin');
        // console.log("origin=>>", origin)
        const token = req.headers.token;

        // Check if token is missing or undefined
        if (!token || token === "undefined") {
            // Respond with session expired error
            return res.status(401).json({ message: "Session expired", type: "error", isSuccess: false, isError: true });
        }


        // Verify JWT token
        jwt.verify(token, privetKey, (err, decodedToken) => {
            // If error occurs during token verification
            if (err) {
                // Handle invalid signature error
                if (err.message === 'invalid signature') {

                    return res.status(401).json(
                        {
                            type: 'error',
                            message: 'Unauthorized user access!'
                            , isSuccess: false
                            , isError: true
                        });
                }
                // Handle other errors during token verification
                return res.status(500).json(
                    {
                        type: 'error',
                        message: err.message,
                        isSuccess: false,
                        isError: true
                    });
            } else {
                // If token is valid, attach decoded user information to request body
                req.body.user = decodedToken;
                // Proceed to the next middleware or route handler
                next();
            }
        });
    } catch (error) {
        // Handle internal server error
        console.log(error);
        res.status(500).json(
            {
                type: 'error',
                message: 'Internal server error!',
                isSuccess: false
                , isError: true
            });
    }
}


// register route
// Endpoint for user registration
app.post('/register', async (req, res) => {
    try {
        // Extracting name, email, and password from request body
        const { name, email, pass } = req.body;

        // Checking if any required field is missing
        if (!name || !email || !pass) {
            res.status(402).json({
                type: 'warning',
                message: "All fields are required",
                isSuccess: false,
                isError: true
            });
        } else {
            // Check if user already exists
            const userExist = await user.findOne({ email });
            if (userExist) {
                res.send({
                    type: 'warning',
                    message: "User Already Exists",
                    isSuccess: false,
                    isError: true
                });
            } else {
                // Encrypting password
                const enPass = await bcrypt.hash(pass, 10);

                // Saving user data in database
                let query = await user.create({ name, email, pass: enPass });
                query = await query.toObject();

                // Removing sensitive data before sending response
                delete query.pass;
                delete query.email;

                // Generate JWT token for authentication
                const token = await jwtGenetator(query, privetKey);

                // Configuring JWT token options
                const options = {
                    expiresIn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    httpOnly: true
                };

                // Sending JWT token as a cookie along with registration success message
                res.status(200).cookie("tkn", token, options).json({
                    'type': 'success',
                    message: 'Registration successful!',
                    isSuccess: true,
                    isError: false
                });
            }
        }
    } catch (error) {
        // Handling errors
        console.log(error);
        let errorMessage = error.message;

        // Parsing and formatting error messages
        errorMessage = errorMessage.replaceAll('credit-users validation failed:', '');
        errorMessage = errorMessage.replace(' name: ', '');
        errorMessage = errorMessage.replace(' email: ', '');
        errorMessage = errorMessage.replace(' pass: ', '');

        // Sending error message as response
        res.json({
            type: 'error',
            message: errorMessage,
            isSuccess: false,
            isError: true
        });
    }
});

// login
app.post('/login', async (req, res) => {
    try {
        const { email, pass } = req.body;

        if (!email || !pass) {
            return res.status(402).json({ result: "All fields are required" });
        }

        const userExists = await user.findOne({ email });

        if (!userExists) {
            return res.status(402).json({
                type: 'error',
                message: "User does not exist",
                isSuccess: false,
                isError: true
            });
        }

        const isPasswordValid = await bcrypt.compare(pass, userExists.pass);

        if (!isPasswordValid) {
            return res.status(402).json({
                type: "error",
                message: "Invalid password",
                isSuccess: false,
                isError: true
            });
        }

        const { name, email: userEmail, __v, ...userData } = userExists.toObject();
        delete userData.pass;

        const token = jwt.sign(userData, privetKey, {
            expiresIn: "28d"
        });

        const cookieOptions = {
            expires: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000),
            httpOnly: true
        };

        res.cookie("user", token, cookieOptions).json({
            type: "success",
            message: "Logged in successfully 👍", isSuccess: false,
            isError: true,
            user: token
        });

    } catch (error) {
        console.error("Login Error=>", error);
        return res.status(500).json({
            type: 'error',
            message: 'Internal server error',
            actualErrorAtLogin: error.message
            , isSuccess: false, isError: true
        });
    }
});


// to logout user
app.get('/logout', authy, (req, res) => {
    res.cookie.Clear("user");
})

//add clients 
// Route to add a new client
app.post('/addclient', authy, async (req, res) => {
    try {
        // Extract necessary data from the request
        const parentId = req.body.user._id; // Get the parent user's ID
        const name = req.body.name; // Get the name of the new client

        // Check if required fields are provided
        if (!parentId || !name) {
            // If any required field is missing, send a warning response
            return res.send({
                type: 'warning',
                message: "All fields are required !"
                , isSuccess: false, isError: true
            });
        }

        // Check if the client name exceeds the maximum length
        if (name.length > 15) {
            // If the name is too long, send an error response
            return res.json({
                type: 'error',
                message: "Name is too long. Maximum length is 15 characters."
                , isSuccess: false, isError: true
            });
        }

        // Create a new client with provided data
        const result = await clients.create({ parentId, name });

        // Check if the client was successfully added to the database
        if (result.id) {
            // If the client was added successfully, send a success response
            return res.status(200).json({
                type: "success",
                message: `'${name}' added successfully.`, isSuccess: false, isError: true
            });
        }

        // If adding the client failed for some reason, send an error response
        return res.status(402).json({
            type: 'error',
            message: "Something went wrong while adding the client.", isSuccess: false, isError: true
        });
    } catch (error) {
        // Handle any errors that occur during the process
        console.error("Error at /addClient", error.message);
        res.json({
            type: 'error',
            message: 'Internal server error occurred while adding the client.'
            , isSuccess: false, isError: true
        });
    }
});

// edit client name
app.put("/editClient", authy, async (req, res) => {

    try {
        const { clientId, newName, currentName } = req.body
        const { _id: parentId } = req.body.user


        if (!currentName || !clientId || !newName) {
            return res.json({
                type: 'error',
                message: "internal Server error !"
                , isSuccess: false, isError: true

            })
        }


        // console.log("Body =>", req.body)
        // console.log("searching user with clientId and parentId ........")

        // find user and update name 
        const result = await clients.findOneAndUpdate(
            {
                $and: [
                    { parentId: parentId },
                    { _id: mongoose.Types.ObjectId(clientId) }]
            }, { name: newName }
        )

        // console.log("DB result =>", result)
        res.json({
            type: 'success',
            message: `'${currentName}' updated successfully.`
            , isSuccess: true, isError: false
        })
    } catch (error) {
        console.log(error.message)
        return res.json({
            type: 'error',
            message: "internal Server error !",
            isSuccess: false, isError: true

        })
    }

})


// to delete client from database 
app.delete('/deleteClient', authy, async (req, res) => {
    try {
        const { _id: parentId } = req.body.user
        const { clientid: clientId, clientname } = req.headers
        console.log("header=>", req.headers)


        // if clientId or parentId not in request
        if (!clientId || !parentId) {
            console.log("missing client")
            return res.json({
                type: 'error',
                message: "internal Server error !"
                , isSuccess: false, isError: true

            })
        }


        // delete client from the database
        const deleteResult = await clients.deleteOne(

            { parentId, _id: mongoose.Types.ObjectId(clientId) }

        )


        // if client deleted successfully
        if (deleteResult.deletedCount >= 1) {
            return res.json({
                type: "success",
                message: `'${clientname}' deleted successfully`
            })
        }



        // in case of client not deleted OR client not found
        return res.json({
            type: 'error',
            message: "something went wrong !",

        })



    }

    catch (error) {
        console.log("ERROR=>>>", error.message)
        return res.json({
            type: 'error',
            message: "internal Server error !",

        })

    }

})

// search the user from dashboard search bar

app.get('/search', authy, async (req, res) => {

    try {
        console.log("req received=>> search request")
        const parentId = req.body.user._id
        const query = req.headers.query
        // console.table({
        //     parentId: parentId,
        //     query: query
        // })
        let result = await clients.aggregate([
            {
                "$match": {
                    "$and": [
                        {
                            "parentId": parentId,
                        },
                        {
                            "name": { "$regex": query, "$options": "i" } // Case-insensitive regex match for "raju"
                        }
                    ]
                }
            }
            ,
            {
                "$lookup": {
                    "from": "transactions",
                    "localField": "_id",
                    "foreignField": "clientId",
                    "as": "trns"
                },

            },
            {
                "$unwind": {
                    "path": "$trns",
                    "preserveNullAndEmptyArrays": false
                }
            }
            , {
                $group: {
                    _id: "$_id",
                    client: { $first: "$$ROOT" },
                    balance: { $sum: "$trns.amount" },
                    lastDate: { $last: "$trns.date" }
                }
            },
            {
                $project: {
                    name: "$client.name",
                    balance: 1,
                    lastDate: {
                        $ifNull: ["$lastDate", "$$NOW"], // If lastDate is null (no transactions found), set to current date
                    },
                },
            }
        ]
        )
        console.log("result=>", result)
        console.log("result Length =>", result.length)
        if (result.length > 0) {
            res.json({
                type: 'success',
                responseData: result
            })
        }
        else {
            res.json({
                type: 'warning',
                message: "Not Found !"
            })
        }


    } catch (error) {
        res.json({
            type: 'error',
            message: 'internal server error !',
            actulaErroAtLogin: error.message
        })
    }
})

app.get('/client/search', authy, async (req, res) => {
    const clientId = req.headers.id
    let query = req.headers.query
    // query=parseInt(query)


    const result = await clients.find(
        {
            _id: clientId,
            "transactions.amount": parseFloat(query)
        }
    )

    // res.json({ type: "hitted" })
})
app.get('/clients', authy, async (req, res) => {
    try {
        const parentId = req.body.user._id
        console.log("parenID:=>", parentId)
        if (parentId) {
            let result = await clients.aggregate([
                {
                    $match: {
                        parentId,
                    },
                },
                {
                    $lookup: {
                        from: "transactions",
                        localField: "_id",
                        foreignField: "clientId",
                        as: "tDetails",
                    },
                },
                {
                    $unwind: {
                        path: "$tDetails",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $group: {
                        _id: "$_id",
                        doc: {
                            $first: "$$ROOT",
                        },
                        // Keep the original document
                        balance: {
                            $sum: "$tDetails.amount",
                        },
                        lastDate: {
                            $last: "$tDetails.date",
                        },
                    },
                },
                {
                    $project: {
                        _id: "$doc._id",
                        name: "$doc.name",
                        balance: 1,
                        lastDate: {
                            $ifNull: ["$lastDate", "$$NOW"], // If lastDate is null (no transactions found), set to current date
                        },
                    },
                },
            ]


            );
            // console.log("result =>", result)


            if (result) { return res.json({ type: 'successs', responseData: result }) }

            return res.json({ type: 'successs', messsage: "Not Found !" })

        }
        else {
            res.json({
                type: 'error',
                message: "Unautherised user"
            })
        }
    } catch (error) {
        res.json({
            type: "error",
            error: error
        })
    }
})

app.get("/insertData", async (req, res) => {
    const data =
        [
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64aa6cba84b4eed825dc388e",
                "amount": -587,
                "dis": "Ticket > [SDGH-ST]",
                "type": "OUT",
                "date": "2023-07-01T18:59"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64aa6cba84b4eed825dc388e",
                "amount": 587,
                "dis": "Ticket Payment [phonepay]",
                "type": "IN",
                "date": "2023-07-07T19:02"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64aa6cba84b4eed825dc388e",
                "amount": -587,
                "dis": "Ticket > [ST-SDGH] ",
                "type": "OUT",
                "date": "2023-07-09T19:02"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64aa6cba84b4eed825dc388e",
                "amount": 0,
                "dis": "Teat",
                "type": "IN",
                "date": "2023-07-13T19:04"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64aa6cba84b4eed825dc388e",
                "amount": 587,
                "dis": "Phonepay",
                "type": "IN",
                "date": "2023-08-07T20:15"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64aa6cba84b4eed825dc388e",
                "amount": 0,
                "dis": "hhhnjkhkj",
                "type": "IN",
                "date": "2023-08-24T22:05"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64aa6cba84b4eed825dc388e",
                "amount": -457,
                "dis": "Ticket 🎟 [LKS. - ROK ]",
                "type": "OUT",
                "date": "2023-09-04T12:06"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64aa6cba84b4eed825dc388e",
                "amount": 457,
                "dis": "Ticket payment ",
                "type": "IN",
                "date": "2023-10-06T12:48"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64aa6e4ae4ae87bed76bfabf",
                "amount": -1000,
                "dis": "Cash",
                "type": "OUT",
                "date": "2023-08-31T17:26"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64aa6e4ae4ae87bed76bfabf",
                "amount": -2000,
                "dis": "Phonepay",
                "type": "OUT",
                "date": "2023-08-20T09:33"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64aa6e4ae4ae87bed76bfabf",
                "amount": 3000,
                "dis": "Account Cleared",
                "type": "IN",
                "date": "2023-09-08T22:30"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64aa6e4ae4ae87bed76bfabf",
                "amount": -2000,
                "dis": "Send to Ashok Mamoji",
                "type": "OUT",
                "date": "2023-09-09T12:03"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64aa6e4ae4ae87bed76bfabf",
                "amount": -5000,
                "dis": "Phnp",
                "type": "OUT",
                "date": "2023-09-19T10:13"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64aa6e4ae4ae87bed76bfabf",
                "amount": -2000,
                "dis": "PhonePe ",
                "type": "OUT",
                "date": "2023-09-27T15:02"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64aa6e4ae4ae87bed76bfabf",
                "amount": 9000,
                "dis": "PhonePe ",
                "type": "IN",
                "date": "2023-12-08T10:14"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -300,
                "dis": "Ptrl",
                "type": "OUT",
                "date": "2023-08-01T17:30"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -50,
                "dis": "Pncher",
                "type": "OUT",
                "date": "2023-08-01T17:31"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -300,
                "dis": "Petrol",
                "type": "OUT",
                "date": "2023-08-04T14:01"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "Petrol",
                "type": "OUT",
                "date": "2023-08-07T19:09"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -50,
                "dis": "Pad",
                "type": "OUT",
                "date": "2023-08-07T19:34"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -300,
                "dis": "Ptrl",
                "type": "OUT",
                "date": "2023-08-11T17:10"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-08-16T16:38"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": 1350,
                "dis": "EXP IN",
                "type": "IN",
                "date": "2023-08-16T22:51"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "Ptrl",
                "type": "OUT",
                "date": "2023-08-20T16:50"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -550,
                "dis": "Scooty break",
                "type": "OUT",
                "date": "2023-08-22T12:46"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "Ptrl",
                "type": "OUT",
                "date": "2023-08-22T17:09"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-08-28T12:37"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": 1950,
                "dis": "Exp in",
                "type": "IN",
                "date": "2023-08-30T21:18"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-09-01T12:20"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -400,
                "dis": "50 Pani +350. Ptrl",
                "type": "OUT",
                "date": "2023-09-04T11:16"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -300,
                "dis": "Ptrl",
                "type": "OUT",
                "date": "2023-09-07T15:43"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -300,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-09-12T14:32"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": 1350,
                "dis": "IN",
                "type": "IN",
                "date": "2023-09-15T09:27"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -300,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-09-16T14:33"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -320,
                "dis": "Ptrl +Break",
                "type": "OUT",
                "date": "2023-09-19T07:57"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -100,
                "dis": "Panni",
                "type": "OUT",
                "date": "2023-09-21T19:13"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -300,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-09-22T13:34"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -300,
                "dis": "PRRL",
                "type": "OUT",
                "date": "2023-09-25T18:13"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -300,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-09-28T19:49"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -30,
                "dis": "EXP",
                "type": "OUT",
                "date": "2023-10-01T20:46"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": 1650,
                "dis": "IN",
                "type": "IN",
                "date": "2023-10-02T20:23"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -300,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-10-02T09:55"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -300,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-10-05T09:56"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -300,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-10-13T14:41"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -100,
                "dis": "Scooty",
                "type": "OUT",
                "date": "2023-10-14T16:52"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": 1000,
                "dis": "Expence paid",
                "type": "IN",
                "date": "2023-10-16T20:18"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -300,
                "dis": "Ptrl",
                "type": "OUT",
                "date": "2023-10-16T14:13"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -300,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-10-18T16:22"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -300,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-10-21T21:30"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-10-25T21:31"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": 350,
                "dis": "PTRL",
                "type": "IN",
                "date": "2023-10-27T14:10"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "Ptrl",
                "type": "OUT",
                "date": "2023-10-27T14:10"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "Correction ",
                "type": "OUT",
                "date": "2023-10-29T14:11"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -50,
                "dis": "Panni",
                "type": "OUT",
                "date": "2023-10-31T23:09"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": 1650,
                "dis": "IN",
                "type": "IN",
                "date": "2023-10-31T23:09"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -300,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-10-31T14:10"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -300,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-11-02T18:11"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -300,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-11-07T15:54"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -50,
                "dis": "PAD",
                "type": "OUT",
                "date": "2023-11-08T15:55"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -250,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-11-09T15:55"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": 1200,
                "dis": "IN",
                "type": "IN",
                "date": "2023-11-16T21:15"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-11-16T13:15"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-11-19T14:12"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -50,
                "dis": "Getish",
                "type": "OUT",
                "date": "2023-11-19T17:12"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-11-22T14:13"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -250,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-11-25T14:06"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -250,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-11-28T14:07"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -50,
                "dis": "PTRL ——",
                "type": "OUT",
                "date": "2023-11-25T14:08"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -250,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-11-30T18:53"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": 1700,
                "dis": "IN",
                "type": "IN",
                "date": "2023-12-01T19:19"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-12-02T19:20"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-12-06T19:23"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -100,
                "dis": "PANNI",
                "type": "OUT",
                "date": "2023-12-07T19:24"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-12-09T15:50"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-12-12T15:42"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": 1700,
                "dis": "IN",
                "type": "IN",
                "date": "2023-12-15T19:50"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -360,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-12-16T13:47"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -340,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-12-19T15:50"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-12-23T14:51"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-12-26T19:52"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -250,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2023-12-29T15:33"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": 1650,
                "dis": "In",
                "type": "IN",
                "date": "2024-01-01T08:37"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2024-01-01T15:20"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -150,
                "dis": "SCOOTY - ",
                "type": "OUT",
                "date": "2024-01-01T18:35"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -130,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2024-01-04T15:09"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2024-01-08T23:55"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2024-01-11T13:14"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2024-01-15T15:31"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": 1500,
                "dis": "IN",
                "type": "IN",
                "date": "2024-01-15T19:47"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2024-01-18T15:32"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2024-01-20T13:14"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -50,
                "dis": "tyre puncture",
                "type": "OUT",
                "date": "2024-01-20T16:37"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -50,
                "dis": "SCOOTY",
                "type": "OUT",
                "date": "2024-01-23T16:41"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRLL",
                "type": "OUT",
                "date": "2024-01-24T18:41"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2024-01-26T12:22"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -100,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2024-01-30T12:04"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -100,
                "dis": "Panni + Getis",
                "type": "OUT",
                "date": "2024-01-30T18:06"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2024-01-31T12:07"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": 1700,
                "dis": "IN",
                "type": "IN",
                "date": "2024-01-31T20:47"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2024-02-05T12:49"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2024-02-08T15:27"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -300,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2024-02-10T15:41"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64cb96c97c42ce5bb6056e82",
                "amount": -350,
                "dis": "PTRL",
                "type": "OUT",
                "date": "2024-02-12T19:26"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64d75b652ba51487433bd35e",
                "amount": -1000,
                "dis": "10000.  Credits",
                "type": "OUT",
                "date": "2023-08-12T07:52"
            },
            {
                "parentId": "64e116ee9b4c2feb3c671734",
                "clientId": "64e1174f9b4c2feb3c6732cb",
                "amount": 34333,
                "dis": "Yhhhhj",
                "type": "IN",
                "date": "2023-08-20T00:56"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64fdb4a3832423ca5e4159ea",
                "amount": -160,
                "dis": "Sonpaldi",
                "type": "OUT",
                "date": "2023-09-10T17:51"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64fdb4a3832423ca5e4159ea",
                "amount": -3000,
                "dis": "CASH",
                "type": "OUT",
                "date": "2023-09-10T17:52"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64fdb4a3832423ca5e4159ea",
                "amount": 2700,
                "dis": "Mistake",
                "type": "IN",
                "date": "2023-09-10T17:52"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64fdb4a3832423ca5e4159ea",
                "amount": -120,
                "dis": "Poket",
                "type": "OUT",
                "date": "2023-09-12T16:37"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64fdb4a3832423ca5e4159ea",
                "amount": 1450,
                "dis": "Saroj masi sarees",
                "type": "IN",
                "date": "2023-09-02T11:49"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64fdb4a3832423ca5e4159ea",
                "amount": -918,
                "dis": "Cylinder ",
                "type": "OUT",
                "date": "2023-09-05T11:50"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64fdb4a3832423ca5e4159ea",
                "amount": -2150,
                "dis": "Credit card Bill",
                "type": "OUT",
                "date": "2023-09-04T11:59"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64fdb4a3832423ca5e4159ea",
                "amount": -1318,
                "dis": "Ticket 🎟 ",
                "type": "OUT",
                "date": "2023-09-04T12:01"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64fdb4a3832423ca5e4159ea",
                "amount": -60,
                "dis": "Ticket 🎟 [CNB - LKO ]",
                "type": "OUT",
                "date": "2023-09-11T12:01"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64fdb4a3832423ca5e4159ea",
                "amount": -1000,
                "dis": "PhonePe ",
                "type": "OUT",
                "date": "2023-09-13T12:10"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64fdb4a3832423ca5e4159ea",
                "amount": 1000,
                "dis": "Mstk",
                "type": "IN",
                "date": "2023-09-13T12:11"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64fdb4a3832423ca5e4159ea",
                "amount": -80,
                "dis": "BhelPuri",
                "type": "OUT",
                "date": "2023-09-23T17:27"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64fdb4a3832423ca5e4159ea",
                "amount": -145,
                "dis": "GABHA",
                "type": "OUT",
                "date": "2023-09-23T20:27"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64fdb4a3832423ca5e4159ea",
                "amount": -5000,
                "dis": "SIP",
                "type": "OUT",
                "date": "2023-09-17T20:01"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64fdb4a3832423ca5e4159ea",
                "amount": -70,
                "dis": "MILK",
                "type": "OUT",
                "date": "2023-09-15T19:08"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "64fdb4a3832423ca5e4159ea",
                "amount": -900,
                "dis": "Coaching fee",
                "type": "OUT",
                "date": "2023-08-10T16:09"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "6501594c5e32736dadf3cc01",
                "amount": -1000,
                "dis": "PhonePe ",
                "type": "OUT",
                "date": "2023-09-13T12:11"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "6501594c5e32736dadf3cc01",
                "amount": 1000,
                "dis": "PhonePe ",
                "type": "IN",
                "date": "2023-09-13T12:00"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "6501594c5e32736dadf3cc01",
                "amount": -500,
                "dis": "PHNP",
                "type": "OUT",
                "date": "2023-09-25T14:04"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "6501594c5e32736dadf3cc01",
                "amount": 500,
                "dis": "IN",
                "type": "IN",
                "date": "2023-09-27T15:19"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "6501594c5e32736dadf3cc01",
                "amount": -1000,
                "dis": "PhonePe ",
                "type": "OUT",
                "date": "2023-10-03T14:50"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "6501594c5e32736dadf3cc01",
                "amount": -1000,
                "dis": "PhonePe ",
                "type": "OUT",
                "date": "2023-10-07T19:38"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "6501594c5e32736dadf3cc01",
                "amount": -2000,
                "dis": "Clear  entry",
                "type": "OUT",
                "date": "2023-11-01T18:55"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "6501594c5e32736dadf3cc01",
                "amount": 4000,
                "dis": "False entry",
                "type": "IN",
                "date": "2024-01-14T18:55"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "6501594c5e32736dadf3cc01",
                "amount": -1000,
                "dis": "PhonePe ",
                "type": "OUT",
                "date": "2023-12-28T19:50"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "6501594c5e32736dadf3cc01",
                "amount": -9860,
                "dis": "Ticket [CNB -> BKN ]",
                "type": "OUT",
                "date": "2024-01-01T18:58"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "6501594c5e32736dadf3cc01",
                "amount": 9500,
                "dis": "PhonePe ",
                "type": "IN",
                "date": "2024-01-14T18:59"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "6501594c5e32736dadf3cc01",
                "amount": -9460.55,
                "dis": "Ticket [BKN -> CNB]",
                "type": "OUT",
                "date": "2024-01-14T19:00"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "6501594c5e32736dadf3cc01",
                "amount": 15000,
                "dis": "CASH",
                "type": "IN",
                "date": "2024-01-14T20:20"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "6501594c5e32736dadf3cc01",
                "amount": -5000,
                "dis": "PhonePe ",
                "type": "OUT",
                "date": "2024-01-15T11:53"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "6501594c5e32736dadf3cc01",
                "amount": -1783.6,
                "dis": "NOK -> CNB [ 21-01-24 ]",
                "type": "OUT",
                "date": "2024-01-15T20:40"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "6501594c5e32736dadf3cc01",
                "amount": 1000,
                "dis": "PhonePe ",
                "type": "IN",
                "date": "2024-01-15T20:24"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "6501594c5e32736dadf3cc01",
                "amount": -1173.6,
                "dis": "TKT ",
                "type": "OUT",
                "date": "2024-01-21T12:40"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "6501594c5e32736dadf3cc01",
                "amount": -1173.6,
                "dis": "TKT manvi",
                "type": "OUT",
                "date": "2024-01-21T12:40"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "650e6d30632fa545fc7b4520",
                "amount": 3099,
                "dis": "SSD",
                "type": "IN",
                "date": "2023-09-14T10:14"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "650e6d30632fa545fc7b4520",
                "amount": -3100,
                "dis": "Ssd ",
                "type": "OUT",
                "date": "2023-10-29T22:25"
            },
            {
                "parentId": "6539413b5a365da982f26772",
                "clientId": "6539416e5a365da982f26776",
                "amount": 5000,
                "dis": "Testing ",
                "type": "IN",
                "date": "2023-10-02T22:08"
            },
            {
                "parentId": "6539413b5a365da982f26772",
                "clientId": "6539416e5a365da982f26776",
                "amount": -1000,
                "dis": "Testing out",
                "type": "OUT",
                "date": "2023-10-06T22:10"
            },
            {
                "parentId": "6539413b5a365da982f26772",
                "clientId": "6539416e5a365da982f26776",
                "amount": 4869,
                "dis": "Cash in",
                "type": "IN",
                "date": "2023-10-11T22:10"
            },
            {
                "parentId": "6539413b5a365da982f26772",
                "clientId": "6539416e5a365da982f26776",
                "amount": -8599.35,
                "dis": "Cash Out",
                "type": "OUT",
                "date": "2023-10-25T22:11"
            },
            {
                "parentId": "6539413b5a365da982f26772",
                "clientId": "6539416e5a365da982f26776",
                "amount": 9658.98,
                "dis": "Cash IN",
                "type": "IN",
                "date": "2023-10-25T22:24"
            },
            {
                "parentId": "6539413b5a365da982f26772",
                "clientId": "653941ac5a365da982f26779",
                "amount": 1505,
                "dis": "Random",
                "type": "IN",
                "date": "2024-02-13T02:53"
            },
            {
                "parentId": "6539413b5a365da982f26772",
                "clientId": "653941ac5a365da982f26779",
                "amount": -286848,
                "dis": "Testing",
                "type": "OUT",
                "date": "2024-02-13T02:54"
            },
            {
                "parentId": "6539413b5a365da982f26772",
                "clientId": "653941ac5a365da982f26779",
                "amount": 6555655557488848,
                "dis": "TESTING",
                "type": "IN",
                "date": "2024-02-13T02:54"
            },
            {
                "parentId": "65b764f39d0f68586212f07a",
                "clientId": "65b7651e9d0f68586212f07e",
                "amount": 3000,
                "dis": "Smmm",
                "type": "IN",
                "date": "2024-01-11T14:13"
            },
            {
                "parentId": "65b764f39d0f68586212f07a",
                "clientId": "65b7651e9d0f68586212f07e",
                "amount": 500,
                "dis": "Rj",
                "type": "IN",
                "date": "2024-01-17T14:14"
            },
            {
                "parentId": "65b764f39d0f68586212f07a",
                "clientId": "65b7651e9d0f68586212f07e",
                "amount": 4000,
                "dis": "Sb",
                "type": "IN",
                "date": "2024-01-16T14:20"
            },
            {
                "parentId": "65b764f39d0f68586212f07a",
                "clientId": "65b7651e9d0f68586212f07e",
                "amount": 5000,
                "dis": "Sb",
                "type": "IN",
                "date": "2024-01-27T14:20"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "65b8dddd2cf3851343022fc6",
                "amount": 17700,
                "dis": "A/C sorabh",
                "type": "IN",
                "date": "2023-12-16T16:00"
            },
            {
                "parentId": "64aa6c9529b8047ad9bd93a5",
                "clientId": "65b8dddd2cf3851343022fc6",
                "amount": 20000,
                "dis": "CASH",
                "type": "IN",
                "date": "2024-01-30T17:02"
            },
            {
                "parentId": "65b89f6c0d8aae52d5a6feec",
                "clientId": "65bfd9f3c73ec07c2b907f8d",
                "amount": 5662,
                "dis": "hjgy yug ",
                "type": "IN",
                "date": "2024-02-05T00:19"
            },
            {
                "parentId": "65b89f6c0d8aae52d5a6feec",
                "clientId": "65bfd9f3c73ec07c2b907f8d",
                "amount": 485654,
                "dis": "Tfdfd tyygt",
                "type": "IN",
                "date": "2024-02-05T00:19"
            },
            {
                "parentId": "65b89f6c0d8aae52d5a6feec",
                "clientId": "65bfd9f3c73ec07c2b907f8d",
                "amount": 564564,
                "dis": ",l;l;mmm",
                "type": "IN",
                "date": "2024-02-13T00:22"
            },
            {
                "parentId": "6539413b5a365da982f26772",
                "clientId": "65cb9f98a22817558272735f",
                "amount": 600,
                "dis": "Bh",
                "type": "IN",
                "date": "2024-02-13T22:28"
            },
            {
                "parentId": "6539413b5a365da982f26772",
                "clientId": "65cb9f98a22817558272735f",
                "amount": 33,
                "dis": "67",
                "type": "IN",
                "date": "2024-02-13T22:29"
            },
            {
                "parentId": "6539413b5a365da982f26772",
                "clientId": "65cb9f98a22817558272735f",
                "amount": -332,
                "dis": "67",
                "type": "OUT",
                "date": "2024-02-13T22:30"
            },
            {
                "parentId": "6539413b5a365da982f26772",
                "clientId": "65cb9f98a22817558272735f",
                "amount": 22,
                "dis": "77",
                "type": "IN",
                "date": "2024-02-13T22:31"
            },
            {
                "parentId": "6539413b5a365da982f26772",
                "clientId": "65cb9f98a22817558272735f",
                "amount": 22,
                "dis": "77",
                "type": "IN",
                "date": "2024-02-13T22:31"
            }
        ]




    const result = await Transaction.insertMany(data)
    res.json(result)
})

// Endpoint to add a new transaction for a client
app.post('/client/newTransaction', authy, async (req, res) => {
    // Extracting necessary data from request
    const parentId = req.body.user._id; // Assuming user ID is stored in _id field
    const clientId = req.headers.uid; // Assuming client ID is passed in headers as uid
    console.log("parentId: " + parentId)
    // Destructuring necessary fields from request body
    const { amount, date, dis, type } = req.body;

    // Check if all required fields are present, return warning if any is missing
    if (!parentId || !clientId || !amount || !date || !dis || !type) {
        return res.json({
            type: 'warning',
            message: "All fields are required"
        });
    }

    // If all fields are present, proceed to update client's transactions
    try {
        const result = await Transaction.create({
            clientId,
            parentId,
            amount,
            date,
            dis,
            type
        })

        console.log("add transaction result=>", result)
        // If transaction is successfully added, send success response
        if (result._id) {
            return res.json({ type: "success", message: 'Transaction saved!' });
        } else {
            return res.json({
                type: 'error',
                message: "Something went wrong!"
            });
        }
    } catch (error) {
        console.error("Error adding transaction:", error);
        return res.status(500).json({
            type: 'error',
            message: "Internal server error"
        });
    }
});

// Endpoint to get transaction detail using tId
app.get('/client/getTransactionDetail/:tId', authy, async (req, res) => {
    try {

        // console.log("Transaction=>", req.headers);
        const { tId } = req.params;
        const transactionDetail = await Transaction.findOne({ _id: tId }).select('-clientId -parentId -createdAt -updatedAt -__v')
        console.log("TransactionDetail=>", transactionDetail)

        res.json(
            {
                type: "success",
                isSuccess: true,
                isError: false,
                responseData: transactionDetail
            }
        )

        console.log("params=>", req.params);

    } catch (error) {
        console.error("getTransactionDetail Error=>", error.message);
        res.json({
            type: 'error',
            message: "internal server error",
            isSuccess: false,
            isError: true
        })
    }
})


// edit transaction 
app.put("client/editTransaction", authy, async (req, res) => {
    try {

    } catch (error) {
        console.log("client/editTransaction error =>", error.message);

    }
})
app.get("/allTransactions", async (req, res) => {
    const data = await clients.aggregate(
        [
            {
                $project: {
                    _id: 0,
                    name: 1,
                    clientId: "$_id",
                    parentId: 1,
                    transactions: 1

                }
            },
            {
                $unwind: {
                    path: "$transactions",

                }
            },
            {
                $addFields: {
                    amount: "$transactions.amount",
                    dis: "$transactions.dis",
                    type: "$transactions.type",
                    date: "$transactions.date"

                }
            },
            {
                $project: {
                    transactions: 0,
                    name: 0
                }
            }


        ]

    )
    res.json({ data })
});
// **************************************************  to fetch all transactions with a user
app.get('/client/transactions', authy, async (req, res) => {

    const clientId = req.headers.clientid
    const parentId = req.body.user._id;
    console.log("parent Id =>>", parentId)
    console.log("client Id =>>", clientId)
    if (!clientId || !parentId) {
        return res.json({
            type: 'error',
            message: "invalid user !"
        })
    }


    else {
        const result = await clients.aggregate(
            [
                {
                    $match: {
                        $and: [
                            { parentId },
                            { _id: mongoose.Types.ObjectId(clientId) }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: "transactions",
                        localField: "_id",
                        foreignField: "clientId",
                        as: "tDetails"
                    }
                },
                {
                    $unwind: {
                        path: "$tDetails",
                        preserveNullAndEmptyArrays: true // Preserve documents if no matching documents are found in transactions
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        doc: { $first: "$$ROOT" },
                        trns: { $push: "$tDetails" },
                        balance: { $sum: { $ifNull: ["$tDetails.amount", 0] } } // Use $ifNull to handle cases where there are no transactions
                    }
                },
                {
                    $project: {
                        _id: 0,
                        name: "$doc.name",
                        balance: 1,
                        trns: {
                            $map: {
                                input: "$trns",
                                as: "trans",
                                in: {
                                    amount: "$$trans.amount",
                                    tId: "$$trans._id",
                                    date: "$$trans.date",
                                    dis: "$$trans.dis",
                                    type: "$$trans.type"
                                }
                            }
                        }
                    }
                }
            ]

        )
        console.log("result: " + result)
        res.json({
            type: 'success',
            responseData: result[0]
        })
    }
})

app.post('/shareRequest', authy, async (req, res) => {
    try {
        /* --- Tasks ---
        1. all fiels are required >
        2. check if link is present with given parentId and expire time is greater than presentTime
        3. if link is present then send respose with existing link
        4. otherwise generate new link and send type
        5.
        */

        const { clientId } = req.body;

        const parentId = req.body.user._id;
        const currentTime = Date.now()
        const expireTime = Date.now() + 1 * 24 * 60 * 60 * 1000
        //  ------- check if any of field is empty   -------------
        console.log("expireTime: " + expireTime)
        if (!clientId || !clientId) {
            res.json({
                type: 'error',
                message: 'All Fields Are Required !',

            })
            return;
        }
        const linkAlReadyExists = await share.findOne(
            {
                $expr: {
                    $and: [
                        { parentId }, { clientId }, { $gt: ['$expireTime', currentTime] }
                    ]
                }
            })

        if (linkAlReadyExists != null) {
            res.json({
                "link exists": 'true',
                "message": 'share this link with your friend . this link will be invalid after 24 Hours ',
                "link": `https://creditc.vercel.app/share/${linkAlReadyExists._id}`
            })
            return
        }




        let clientName = await clients.find({ parentId, _id: clientId });
        clientName = clientName[0].name;


        const shareToken = await jwtGenetator({ Tn: expireTime + parentId })
        let result = await share.create({ clientId, shareToken, parentId, expireTime: Number(expireTime), clientName })

        // console.log(result)
        return res.json({
            "message": 'share this link with your friend . this link will be invalid after 24 Hours ',
            "link": `https://creditc.vercel.app/share/${result._id}`
        })
    } catch (error) {
        res.send(
            {
                type: 'error',
                message: 'something went wrong !',

            }
        )
    }


})



/* Route : to show the data at client  */
app.get('/share', async (req, res) => {
    try {
        const shareRequestId = req.headers.sharetoken;  /* id send by user */

        if (!shareRequestId) {
            return res.json({
                'type': 'error',
                'message': 'invalid Link !',


            })
        }
        if (shareRequestId.length > 9) {
            const shareIdResult = await share.find({ _id: shareRequestId }) /*indicates the document id inwhich token info is seved */

            // console.log("shareID", shareIdResult)


            if (shareIdResult.length > 0) {

                const { parentId, clientId, shareToken } = shareIdResult[0] /* parse parentId clinetId and ShareToken from the database find operation result */
                const tokenStatus = await jwtVerify(shareToken)  /* verify json tocken whick is seved in database */
                //  if JWT is expired
                console.log("tokenStatus", tokenStatus)
                if (tokenStatus === "jwt expired") {
                    return res.json({
                        'type': 'error',
                        'message': 'Expired link !',
                    })

                }

                const parentData = await user.find({ _id: parentId })
                const parentName = parentData[0].name
                let clientData = await clients.find({ parentId, _id: clientId })
                const { transactions, name } = clientData[0]
                //to change the value accordind to user and calcualte some of recived and sent money
                let totalSentAmount = 0
                let totalRecivedAmount = 0
                let changedTransactinFormat = transactions.map((data) => {
                    // in==send *-1 & out =recive
                    if (data.type == 'OUT') {
                        data.type = 'recived'
                        if (data.amount != 0) { data.amount = data.amount * -1 }
                        totalRecivedAmount += data.amount
                        return data
                    }
                    else if (data.type == 'IN') {
                        data.type = 'sent'
                        if (data.amount != 0) { data.amount = data.amount * -1 }
                        totalSentAmount += data.amount
                        return data
                    }
                    console.log(data.type)
                })
                const totalRemainingAmount = totalRecivedAmount - (totalSentAmount * -1)

                res.json({
                    type: 'success',
                    responseData: {
                        clientName: name,
                        parentName,
                        totalRecivedAmount,
                        totalSentAmount,
                        totalRemainingAmount,
                        transactions
                    }

                })
                return

            }
            else {
                res.json({
                    'type': 'Error',
                    'message': 'invalid Link ! 1',
                    'responseData': shareIdResult

                })
                return
            }



        }
        else {
            return res.json({
                'type': 'error',
                'message': 'invalid Link !',


            })

        }
        // console.log(req)

    } catch (error) {
        res.json({
            error: 'internal server Error',
            message: error.message
        })
    }
})

app.get('/userProfile', authy, async (req, res) => {
    const currentTime = Date.now()
    // requirements
    /*
    1. username
    2. associated cliets (all clients list)
    3. all share links generated by usser

    */
    try {
        const { _id } = req.body.user
        // console.log(`req recived  name=>${name} , _ID=>${_id} `)
        const { name } = await user.findOne({ _id })
        console.log("Name: " + name)
        const allClients = await clients.find({ parentId: _id }, { transactions: 0, parentId: 0 });
        let allSharedLinks = await share.find({ parentId: _id })

        allSharedLinks = allSharedLinks.map(({ shareToken, clientName, expireTime, _id }) => {
            return {
                linkId: _id,
                isActive: currentTime < expireTime,
                clientName, shareToken
            }

        })
        console.log("Name=>", name)
        return res.json({
            'status': 'ok',
            'name': name,
            'symbol': name.charAt(0),
            'id': _id,
            allClients,
            allSharedLinks
        })
    } catch (error) {
        console.log("EROOOOOO=>", error.message);
        return res.json({
            type: 'error',
            'message': 'Internal Server Error  !'
        })
    }
})

app.delete('/deleteSharedLink', authy, async (req, res) => {
    try {
        const { shareid } = req.headers
        console.log("Headers =>>>", req.headers)
        //*********** */ to find out that provided id is valid object Id or not********
        const isObjectId = mongoose.isValidObjectId(shareid)

        // ***************** if  not a valid object id **********************
        if (!isObjectId) {
            res.status(502).json(
                {
                    type: 'error',
                    message: 'Bad requiest !'
                }

            )
            return
        }
        // *********  valid object id ******
        else {
            //**********  find the record in database by provided id  ************
            const result = await share.findOne({ _id: shareid });

            // ******** if record  not not found 
            if (result == null) {
                res.status(502).json(
                    {
                        type: 'error',
                        message: 'invalid request !'
                    }

                )
                return
            }

            // **************   record (share link) found *****
            if (result.id === shareid) {

                // delete record from database
                const deleteResult = await share.deleteOne({ _id: shareid })

                // if record deleted successfully 
                if (deleteResult.deletedCount == 1) {
                    res.json({
                        type: 'success',
                        message: 'link deleted successfully !'

                    })
                    return
                }
                // if record is not deleted or any error at database
                else {
                    res.status(500).json({
                        type: 'error',
                        message: 'something went wrong'

                    })
                    return
                }
                return
            }

        }



    }
    catch (error) {

        res.status(500).json({
            type: 'error',
            message: 'internal server error !'
        })
    }

})

// app.('/changeUserName',authy,(req,res)=>{
//    
// })
app.delete('/deleteAccount', authy, (req, res) => {

})

app.listen(port, (err) => {
    if (err) throw err;
    console.log(`app is running on http://localhost:${port}`)
})









