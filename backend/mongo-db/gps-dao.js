
//------------------------------------------------------------------------------
//  DAO for account
//  Require index: `db.account.createIndex({"balance.PandoWei": -1})`
//  Require index: `db.account.createIndex({"balance.PTXWei": -1})`
//------------------------------------------------------------------------------

module.exports = class Gps {

    constructor(execDir, client) {
        this.client = client;
        this.gpsCollection = 'gps';
    }

    updateGpsColl(metaStake, callback) {

        const queryObject = {"_id": metaStake}

        // console.log("metaStake", queryObject);
        this.client.insert(this.gpsCollection, queryObject, callback);
    }

    getAllData(callback) {
        const queryObject = {};
        this.client.query(this.gpsCollection, queryObject, function (error, recordList) {
            if (error) {
                console.log('ERR - ', error);
                // callback(error);
            } else if (!recordList) {
                callback(Error('NOT_FOUND'));
            } else {
                callback(error, recordList)
            }
        })
    }

}