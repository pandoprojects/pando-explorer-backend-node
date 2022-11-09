//------------------------------------------------------------------------------
//  DAO for lbank
//------------------------------------------------------------------------------

module.exports = class lbank {

    constructor(execDir, client) {
        this.client = client;
        this.lbankCollection = 'lbank';
    }

    upsertCollGps(data, callback) {
        // console.log('accountInfo in upsert:', accountInfo)
        const newObject = {
            "symbol": data.symbol,
            "latestPrice": data.ticker.latest
        }
        const queryObject = { "symbol": "ptx_usdt" };

        // console.log("query lbank  ", queryObject, newObject);

        this.client.upsert(this.lbankCollection, queryObject, newObject, callback);
    }



      getDataLbank(callback) {
        const queryObject = {
            "symbol": "ptx_usdt"
        };
        // console.log('query object 2', queryObject);
     
        return this.client.query(this.lbankCollection, queryObject, function (err, res) {
            if (err) {
                console.log('error : ', err);
                callback(err);
            }
            callback(err, res);
        });


    }
}
