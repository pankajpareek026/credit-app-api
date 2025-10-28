const mongoose = require('mongoose')

const url = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/credit-app'
const connectionParams = {
    useNewUrlParser: true,
    useUnifiedTopology: true
}
mongoose.connect(url, connectionParams).then((e) => {
    // console.log(e)
}).catch((ee) => {
    console.info("ERR: ", ee)
})