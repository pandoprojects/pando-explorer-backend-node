var BigNumber = require('bignumber.js');
var PandoJS = require('./pandojs.esm');
var _chainId = "testnet";

class Pando {

  static set chainId(chainId) {
    _chainId = chainId;
  }
  static get chainId() {
    return _chainId;
  }

  static getTransactionFee() {
    //10^12 PTXWei
    return 0.03;
  }

  static unsignedSmartContractTx(txData, sequence) {
    let { from, to, data, value, transactionFee, gasLimit } = txData;

    const ten18 = (new BigNumber(10)).pow(18); // 10^18, 1 PTX = 10^18 PTXWei, 1 Gamma = 10^ PTXWei
    const feeInPTXWei = (new BigNumber(transactionFee)).multipliedBy(ten18); // Any fee >= 10^12 PTXWei should work, higher fee yields higher priority
    const senderSequence = sequence;
    const gasPrice = feeInPTXWei;

    let tx = new PandoJS.SmartContractTx(from, to, gasLimit, gasPrice, data, value, senderSequence);

    return tx;
  }
}

module.exports = Pando;