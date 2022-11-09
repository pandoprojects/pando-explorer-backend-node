var path = require('path');

//------------------------------------------------------------------------------
//  DAO for transaction
//---------------------------------------------db---------------------------------

module.exports = class AccountDAO {

  constructor(execDir, client) {
    this.aerospike = require(path.join(execDir, 'node_modules', 'aerospike'));
    this.client = client;
    this.accountInfoSet = 'account';
    this.upsertPolicy = new this.aerospike.WritePolicy({
      exists: this.aerospike.policy.exists.CREATE_OR_REPLACE
    });
  }

  upsertAccount(accountInfo, callback) {
    let bins = {
      'address': accountInfo.address.toUpperCase(),
      'balance': accountInfo.balance,
      'sequence': accountInfo.sequence,
      'reserved_funds': accountInfo.reserved_funds === null ? 'null' : accountInfo.reserved_funds,
      //'lst_updt_blk': accountInfo.last_updated_block_height,
      'txs_hash_list': accountInfo.txs_hash_list
    }
    this.client.tryQuery(this.accountInfoSet, bins.address, bins, {}, this.upsertPolicy, callback, 'put');
  }
  checkAccount(pk, callback) {
    return this.client.tryQuery(this.accountInfoSet, pk.toUpperCase(), (err, res) => {
      callback(err, res)
    }, 'exists')
  }

  getAccountByPk(pk, callback) {
    this.client.tryQuery(this.accountInfoSet, pk.toUpperCase(), function (error, record) {
      if (error) {
        switch (error.code) {
          // Code 2 means AS_PROTO_RESULT_FAIL_NOTFOUND
          // No record is found with the specified namespace/set/key combination.
          case 2:
            console.log('NOT_FOUND -', pk)
            callback(error);
            break
          default:
            console.log('ERR - ', error, pk)
        }
      } else {
        var accountInfo = {};
        accountInfo.address = record.bins.address;
        accountInfo.balance = record.bins.balance;
        accountInfo.sequence = record.bins.sequence;
        accountInfo.reserved_funds = record.bins.reserved_funds;
        accountInfo.last_updated_block_height = record.bins.lst_updt_blk;
        accountInfo.txs_hash_list = record.bins.txs_hash_list;
        callback(error, accountInfo);
      }
    }, 'get');
  }

}