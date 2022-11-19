
//------------------------------------------------------------------------------
//  DAO for account
//  Require index: `db.account.createIndex({"balance.PandoWei": -1})`
//  Require index: `db.account.createIndex({"balance.PTXWei": -1})`
//------------------------------------------------------------------------------

const logger = require("../crawler/helper/logger");

module.exports = class AccountDAO {

  constructor(execDir, client) {
    this.client = client;
    this.accountInfoCollection = 'account';
  }

  upsertAccount(accountInfo, callback) {
    console.log('accountInfo in upsert:', accountInfo)
    const newObject = {
      'address': accountInfo.address,
      'balance': accountInfo.balance,
      'sequence': accountInfo.sequence,
      'reserved_funds': accountInfo.reserved_funds === null ? 'null' : accountInfo.reserved_funds,
      'lst_updt_blk': accountInfo.last_updated_block_height,
      'txs_counter': accountInfo.txs_counter,
      'code': accountInfo.code
    }
    const queryObject = { '_id': newObject.address };
    this.client.upsert(this.accountInfoCollection, queryObject, newObject, callback);
  }
  checkAccount(address, callback) {
    const queryObject = { '_id': address };
    console.log( "queryObject",queryObject);
    return this.client.exist(this.accountInfoCollection, queryObject, function (err, res) {
      if (err) {
        console.log('error in checkAccount: ', err);
        callback(err);
      }
      callback(err, res);
    });
  }
  getTotalNumber(callback) {
    this.client.getTotal(this.accountInfoCollection, null, function (error, record) {
      if (error) {
        console.log('Account getTotalNumber ERR - ', error);
        callback(error);
      } else {
        callback(error, record);
      }
    });
  }
  getTopAccounts(tokenType, limitNumber, callback) {
    const key = "balance." + tokenType;
    const queryObject = { [key]: -1 };
    this.client.getTopRecords(this.accountInfoCollection, queryObject, limitNumber, function (error, recordList) {
      var accountInfoList = []
      for (var i = 0; i < recordList.length; i++) {
        var accountInfo = {};
        accountInfo.address = recordList[i].address;
        accountInfo.balance = recordList[i].balance;
        accountInfo.sequence = recordList[i].sequence;
        accountInfo.reserved_funds = recordList[i].reserved_funds;
        accountInfo.txs_counter = recordList[i].txs_counter;
        accountInfo.code = recordList[i].code;
        accountInfoList.push(accountInfo)
      }
      callback(error, accountInfoList)
    })
  }
  getAccountByPk(address, callback) {
    const queryObject = { '_id': address };
    this.client.findOne(this.accountInfoCollection, queryObject, function (error, record) {
      if (error) {
        console.log('Account getAccountByPk ERR - ', error, address);
        callback(error);
      } else if (!record) {
        callback(Error('NOT_FOUND - ' + address));
      } else {
        // console.log('account info in record: ', record)
        var accountInfo = {};
        accountInfo.address = record.address;
        accountInfo.balance = record.balance;
        accountInfo.sequence = record.sequence;
        accountInfo.reserved_funds = record.reserved_funds;
        accountInfo.txs_counter = record.txs_counter;
        accountInfo.code = record.code;
        callback(error, accountInfo);
      }
    })
  }

  getTotalAccountBalance(callback) {
    // const queryObject = { 'type': { $in: types } };
    const queryObject = [{
      $match: {
        address: { $nin: ["0xdf1f3d3ee9430db3a44ae6b80eb3e23352bb785e", "0x99eac60c09e1443c147ed3bea20c11643f257a2c", "0xcb4f90af1cccc8e5ad7a8282573a21713767f213"] }
      //  address: { $nin: ["0x74173e92cb56548563a4213E330D7522dD04013A", "0x4EF6B65d557Fe88DC86eAF96E830d9A4e2fCaBfB", "0x81bccc41c146f7a2f28ee58ef6c4f7d23dad1d43","0x64600792D03E51a44fFb568760669cc03Ce4947a"] }
    //address: { $nin: ["0x2e833968e5bb786ae419c4d13189fb081cc43bab", "0x1df9F811E2b3bBdfE6Af5eD167A3A21583A06ca8"] }
      }
    },
    {
      $group: {
        _id: "null",
        Total: {
          $sum: {
            "$toDouble": "$balance.PTXWei"
          }
        }
      }
    }];

    this.client.aggregateQuery(this.accountInfoCollection, queryObject, function (error, recordList) {
      if (error) {
        console.log('ERR - ', error);
        // callback(error);
      } else if (!recordList) {
        callback(Error('NOT_FOUND - All Stakes'));
      } else {
        callback(error, recordList)
      }
    })
  }


}