const mongoose = require('mongoose')

const url = process.env.MONGO_URL
const connectionParams = {
    useNewUrlParser: true,
    useUnifiedTopology: true
}
mongoose.connect(url, connectionParams).then((e) => {
    // console.log(e)
}).catch((ee) => {
    console.info("ERR: ", ee)
})