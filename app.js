const express = require('express')
const app = express()
const print = console.log
// routes  ---Start
const register=require('./routes/register')
// routes  ---End

app.get('/', register=> {
    print("hii")
    
})

module.exports = app