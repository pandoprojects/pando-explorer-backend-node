var Logger = require('../helper/logger');

const BigNumber = require('bignumber.js');
const rp = require('request-promise');
const COINBASE = 0;
const WEI = 1000000000000000000;
const PTX_ID = '3601';

BigNumber.config({ EXPONENTIAL_AT: 1e+9 });

let txDao = null;
let acctTxDao = null;
let accountingDao = null;
let coinbaseApiKey = null;
let walletAddrs = null;

exports.InitializeForPTXPrice = function (accountingDaoInstance, coinbaseApiKeyStr, walletAddresses) {
    accountingDao = accountingDaoInstance;
    coinbaseApiKey = coinbaseApiKeyStr;
    walletAddrs = walletAddresses;
}

exports.RecordPTXPrice = async function () {
    // let PTXPrice = await getCoinbasePrice();
    let PTXPrice = '0.01';
    let [startTime] = getDayTimes();

    for (let addr of walletAddrs) {
        const data = { date: startTime, addr: addr, price: PTXPrice };
        accountingDao.insertAsync(data);
    }
}

exports.InitializeForPTXEarning = function (transactionDaoInstance, accountTransactionDaoInstance, accountingDaoInstance, walletAddresses) {
    txDao = transactionDaoInstance;
    acctTxDao = accountTransactionDaoInstance;
    accountingDao = accountingDaoInstance;
    walletAddrs = walletAddresses;
}

exports.RecordPTXEarning = async function () {
    let [startTime, endTime] = getDayTimes();
    for (let addr of walletAddrs) {
        processEarning(addr, startTime, endTime);
    }
}

function getDayTimes() {
    var date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    var endTime = date.getTime() / 1000;
    date.setDate(date.getDate() - 1);
    var startTime = date.getTime() / 1000;
    return [startTime, endTime];
}

async function processEarning(address, startTime, endTime) {
    let txHashes = await acctTxDao.getTxHashesAsync(address, startTime.toString(), endTime.toString(), COINBASE);
    let hashes = [];
    txHashes.forEach(function (txHash) {
        hashes.push(txHash.hash);
    });

    let txs = await txDao.getTransactionsByPkAsync(hashes);
    let totalPTX = new BigNumber(0);
    for (let tx of txs) {
        for (let output of tx.data.outputs) {
            if (output.address === address) {
                totalPTX = new BigNumber.sum(totalPTX, new BigNumber(output.coins.PTXWei));
                break;
            }
        }
    }

    const queryObj = { addr: address, date: startTime };
    const updateObj = { qty: Number(totalPTX.dividedBy(WEI).toFixed(2)) };
    accountingDao.upsertAsync(queryObj, updateObj);
}

