db.clients.aggregate([
    {"$match":{name:"kamal"}},
    {"$project":{
        "name":1,
        "totalAmount":{
            "$add":"$transactions.amount"
        },
        
    }}
    ])

    //
    aggregate([
        {"$match":{name:"kamal"}},
        {"$project":{
            "name":1,
            "totalAmount":{
                "$SUM":"$transactions.amount"
            },
            
        }}
        ])

        db.clients.updateOne({"name":"kamal"},{
            "$push": {
                "transactions":{"amount":5000,"date":"12-09-2022","dis":"by shell","type":"IN"}
            }
        })