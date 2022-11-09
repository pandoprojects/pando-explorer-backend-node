module.exports = class circulatingCurr {

    constructor(execDir, client) {
        this.client = client;
        this.circulatingCollection = 'circulatingCurr';
    }
   
    updateCirculatingCurr(circulatingCurrency, callback) {
        console.log("circular ", circulatingCurrency);
        const newObject = {
            "type": "balanceSum",
            "Total": circulatingCurrency[0].Total
        }
        console.log("new object ", newObject);
        const queryObject = { "type": "balanceSum" };

      
        this.client.upsert(this.circulatingCollection, queryObject, newObject, callback);
    }
    
    getAllDataCirculating(callback) {
     

        const queryObject = {"type": "balanceSum"};
        
     this.client.query(this.circulatingCollection, queryObject, function (error, recordList) {
            console.log("data26",queryObject,recordList);
            if (error) {
                console.log('ERR - ', error);
                // callback(error);
            } else if (!recordList) {
                callback(Error('NOT_FOUND'));
            } else {
                console.log(recordList,"record");
                callback(error, recordList)
                
            }
        })
    }

}

