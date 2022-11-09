var get = require('lodash/get');
var map = require('lodash/map');
var BigNumber = require('bignumber.js');
var Pando = require('../libs/Pando');
var PandoJS = require('../libs/pandojs.esm');
var smartContractApi = require('../api/smart-contract-api');
var { ZeroAddress, EventHashMap, CommonEventABIs } = require('./constants');
var { getHex } = require('./utils');
var { ethers } = require("ethers");
var Logger = require('./logger');

exports.updateToken = async function (tx, smartContractDao, tokenDao, tokenSummaryDao, tokenHolderDao) {
  let addressList = _getContractAddressSet(tx);
  if (addressList.length === 0) {
    return;
  }
  let infoMap = {};
  // Generate info map
  for (let address of addressList) {
    infoMap[`${address}`] = {};
    const abiRes = await smartContractDao.getAbiAsync(address);
    const abi = get(abiRes[0], 'abi');
    if (!abi) {
      infoMap[`${address}`].abi = [];
      infoMap[`${address}`].type = 'unknown';
    } else {
      infoMap[`${address}`].abi = abi;
      infoMap[`${address}`].type = _checkPNC721(abi) ? 'PNC-721' : _checkPNC20(abi) ? 'PNC-20' : 'unknown';
      const tokenInfo = await tokenSummaryDao.getInfoByAddressAsync(address);
      infoMap[`${address}`].tokenName = get(tokenInfo, 'tokenName');
    }
  }
  // console.log('Info map:------------>>>>>>>>', infoMap)
  Logger.log('Info map:', infoMap);
  let logs = get(tx, 'receipt.Logs');
  logs = JSON.parse(JSON.stringify(logs));
  logs = logs.map(obj => {
    obj.data = getHex(obj.data);
    return obj;
  })

  // console.log('logs in updateTokenNew:---->>>>>>>>', logs)

  Logger.log('logs in updateTokenNew:', logs)
  const tokenArr = [];
  logs = _decodeLogs(logs, infoMap);
  const insertList = [];
  for (let [i, log] of logs.entries()) {
    switch (get(log, 'topics[0]')) {
      case EventHashMap.PTX_SPLIT:
        if (typeof get(log, 'decode') !== "object") {
          log = decodeLogByAbiHash(log, EventHashMap.PTX_SPLIT);
          let sellerInfo = {
            _id: tx.hash.toLowerCase() + i + '_0',
            hash: tx.hash.toLowerCase(),
            from: get(tx, 'data.from.address').toLowerCase(),
            to: get(log, 'decode.result[0]').toLowerCase(),
            value: get(log, 'decode.result[1]'),
            type: 'PTX',
            timestamp: tx.timestamp,
          }
          let platformInfo = {
            _id: tx.hash.toLowerCase() + i + '_1',
            hash: tx.hash.toLowerCase(),
            from: get(tx, 'data.from.address').toLowerCase(),
            to: get(log, 'decode.result[2]').toLowerCase(),
            value: get(log, 'decode.result[3]'),
            type: 'PTX',
            timestamp: tx.timestamp,
          }
          tokenArr.push(sellerInfo, platformInfo);
          insertList.push(_checkAndInsertToken(sellerInfo, tokenDao), _checkAndInsertToken(platformInfo, tokenDao))
        }
        break;
      case EventHashMap.TRANSFER:
        const contractAddress = get(log, 'address');
        // If log.address === tx.receipt.ContractAddress, and the contract has not been verified
        // this record will be hanlded in the contract verification
        if (get(infoMap, `${contractAddress}.type`) === 'unknow' && contractAddress === get(tx, 'receipt.ContractAddress')) {
          continue;
        }
        const tokenId = get(log, 'decode.result.tokenId');
        const value = tokenId !== undefined ? 1 : get(log, 'decode.result[2]');
        const newToken = {
          _id: tx.hash.toLowerCase() + i,
          hash: tx.hash.toLowerCase(),
          from: (get(log, 'decode.result[0]') || '').toLowerCase(),
          to: (get(log, 'decode.result[1]') || '').toLowerCase(),
          token_id: tokenId,
          value,
          name: get(infoMap, `${contractAddress}.name`),
          type: get(infoMap, `${contractAddress}.type`),
          timestamp: tx.timestamp,
          contract_address: contractAddress
        }
        tokenArr.push(newToken);
        insertList.push(_checkAndInsertToken(newToken, tokenDao))
        break;
      default:
        break;
    }
  }
  Logger.log('tokenArr:', tokenArr);
  await updateTokenSummary(tokenArr, infoMap, tokenSummaryDao, tokenHolderDao);
  return Promise.all(insertList);
}

exports.updateTokenByTxs = async function (txs, smartContractDao, tokenDao, tokenSummaryDao, tokenHolderDao) {
  let addressList = _getContractAddressSetByTxs(txs);
  Logger.log('addressList.length:', addressList.length);
  if (addressList.length === 0) {
    return;
  }
  let infoMap = {};
  // Generate info map
  for (let address of addressList) {
    infoMap[`${address}`] = {};
    const abiRes = await smartContractDao.getAbiAsync(address);
    const abi = get(abiRes[0], 'abi');
    if (!abi) {
      infoMap[`${address}`].abi = [];
      infoMap[`${address}`].type = 'unknown';
    } else {
      infoMap[`${address}`].abi = abi;
      infoMap[`${address}`].type = _checkPNC721(abi) ? 'PNC-721' : _checkPNC20(abi) ? 'PNC-20' : 'unknown';
      const tokenInfo = await tokenSummaryDao.getInfoByAddressAsync(address);
      infoMap[`${address}`].tokenName = get(tokenInfo, 'tokenName');
    }
  }

  // console.log('infoMap---->>>>>>>>>>>>>>>>', infoMap)

  Logger.log('Info map keys length:', Object.keys(infoMap).length);
  const tokenArr = [];
  const insertList = [];
  for (let tx of txs) {
    let logs = get(tx, 'receipt.Logs');
    logs = JSON.parse(JSON.stringify(logs));
    logs = logs.map(obj => {
      obj.data = getHex(obj.data);
      return obj;
    })
    // console.log('logs in updateTokenNew:--------->>>>>>>>>> 11111', logs)

    Logger.log('logs in updateTokenNew:', logs)
    logs = _decodeLogs(logs, infoMap);
    // console.log(' decode logs:--------->>>>>>>>>> 22222', logs)

    for (let [i, log] of logs.entries()) {
      switch (get(log, 'topics[0]')) {
        case EventHashMap.PTX_SPLIT:
          if (typeof get(log, 'decode') !== "object") {
            log = decodeLogByAbiHash(log, EventHashMap.PTX_SPLIT);
            let sellerInfo = {
              _id: tx.hash.toLowerCase() + i + '_0',
              hash: tx.hash.toLowerCase(),
              from: get(tx, 'data.from.address').toLowerCase(),
              to: get(log, 'decode.result[0]').toLowerCase(),
              value: get(log, 'decode.result[1]'),
              type: 'PTX',
              timestamp: tx.timestamp,
            }
            let platformInfo = {
              _id: tx.hash.toLowerCase() + i + '_1',
              hash: tx.hash.toLowerCase(),
              from: get(tx, 'data.from.address').toLowerCase(),
              to: get(log, 'decode.result[2]').toLowerCase(),
              value: get(log, 'decode.result[3]'),
              type: 'PTX',
              timestamp: tx.timestamp,
            }
            tokenArr.push(sellerInfo, platformInfo);
        // console.log("------>>>>>>EventHashMap.PTX_SPLIT------>>>>>>", tokenArr);

            insertList.push(_checkAndInsertToken(sellerInfo, tokenDao), _checkAndInsertToken(platformInfo, tokenDao))
          }
          break;
        case EventHashMap.TRANSFER:
          const contractAddress = get(log, 'address');
          console.log("contractAddress--------->>>>>>>>>>>>>", contractAddress)
          // If log.address === tx.receipt.ContractAddress, and the contract has not been verified
          // this record will be hanlded in the contract verification
          if (get(infoMap, `${contractAddress}.type`) === 'unknow' && contractAddress === get(tx, 'receipt.ContractAddress')) {
            continue;
          }
          const tokenId = get(log, 'decode.result.tokenId');
          const value = tokenId !== undefined ? 1 : get(log, 'decode.result[2]');
          const newToken = {
            _id: tx.hash.toLowerCase() + i,
            hash: tx.hash.toLowerCase(),
            from: (get(log, 'decode.result[0]') || '').toLowerCase(),
            to: (get(log, 'decode.result[1]') || '').toLowerCase(),
            token_id: tokenId,
            value,
            name: get(infoMap, `${contractAddress}.name`),
            type: get(infoMap, `${contractAddress}.type`),
            timestamp: tx.timestamp,
            contract_address: contractAddress
          }
          tokenArr.push(newToken);
        // console.log("------>>>>>>tokenId------>>>>>>", tokenId, value);

        // console.log("------>>>>>>EventHashMap.TRANSFER------>>>>>>", newToken);

          insertList.push(_checkAndInsertToken(newToken, tokenDao))
          break;
        default:
          break;
      }
    }
  }
  Logger.log('tokenArr.length:', tokenArr.length);
  await updateTokenSummary(tokenArr, infoMap, tokenSummaryDao, tokenHolderDao);
  // console.log("---------updateTokenSummary----------", tokenArr);
  return Promise.all(insertList);
}

const _decodeLogs = function (logs, infoMap) {
  let ifaceMap = {};
  Object.keys(infoMap).forEach(k => ifaceMap[`${k}`] = new ethers.utils.Interface(infoMap[k].abi))
  return logs.map(log => {
    if (!infoMap[`${log.address}`]) {
      log.decode = 'No matched event or the smart contract source code has not been verified.';
      return log;
    }
    const iface = ifaceMap[`${log.address}`];
    const abi = infoMap[`${log.address}`].abi;
    try {
      let event = null;
      for (let i = 0; i < abi.length; i++) {
        let item = abi[i];
        if (item.type != "event") continue;
        const hash = iface.getEventTopic(item.name)
        if (hash == log.topics[0]) {
          event = item;
          break;
        }
      }
      if (event != null) {
        let bigNumberData = iface.decodeEventLog(event.name, log.data, log.topics);
        let data = {};
        Object.keys(bigNumberData).forEach(k => {
          data[k] = bigNumberData[k].toString();
        })
        log.decode = {
          result: data,
          eventName: event.name,
          event: event
        }
      } else {
        log.decode = 'No matched event or the smart contract source code has not been verified.';
      }
      return log;
    } catch (e) {
      log.decode = 'Something wrong while decoding, met error: ' + e;
      return log;
    }
  })
}
exports.decodeLogs = _decodeLogs;

const _checkPNC721 = function (abi) {
  const obj = {
    'balanceOf': { contains: false, type: 'function' },
    'ownerOf': { contains: false, type: 'function' },
    'safeTransferFrom': { contains: false, type: 'function' },
    'transferFrom': { contains: false, type: 'function' },
    'approve': { contains: false, type: 'function' },
    'setApprovalForAll': { contains: false, type: 'function' },
    'getApproved': { contains: false, type: 'function' },
    'isApprovedForAll': { contains: false, type: 'function' },
    'Transfer': { contains: false, type: 'event' },
    'Approval': { contains: false, type: 'event' },
    'ApprovalForAll': { contains: false, type: 'event' },
  }

  return _check(obj, abi);
}
exports.checkPNC721 = _checkPNC721;



const _checkPNC20 = function (abi) {
  const obj = {
    'name': { contains: false, type: 'function' },
    'symbol': { contains: false, type: 'function' },
    'decimals': { contains: false, type: 'function' },
    'totalSupply': { contains: false, type: 'function' },
    'balanceOf': { contains: false, type: 'function' },
    'transfer': { contains: false, type: 'function' },
    'transferFrom': { contains: false, type: 'function' },
    'approve': { contains: false, type: 'function' },
    'allowance': { contains: false, type: 'function' },
    'Transfer': { contains: false, type: 'event' },
    'Approval': { contains: false, type: 'event' },
  }

  return _check(obj, abi);
}
exports.checkPNC20 = _checkPNC20;


function _check(obj, abi) {
  abi.forEach(o => {
    if (obj[o.name] !== undefined) {
      if (obj[o.name].type === o.type) {
        obj[o.name].contains = true
      }
    }
  })
  let res = true;
  for (let key in obj) {
    res = res && obj[key].contains
  }
  return res;
}


const _checkAndInsertToken = async function (token, tokenDao) {
  let hasToken = await tokenDao.checkTokenAsync(token._id)
  if (hasToken) return;
  await tokenDao.insertAsync(token);
}
exports.checkAndInsertToken = _checkAndInsertToken;


async function updateTokenSummary(tokenArr, infoMap, tokenSummaryDao, tokenHolderDao) {
  Logger.log('In updateTokenSummary')
  const tokenSummaryMap = {};

  // Generate tokenSummaryMap
  for (let address of Object.keys(infoMap)) {
    try {
      const info = await tokenSummaryDao.getInfoByAddressAsync(address);
      if (!info) continue;
      tokenSummaryMap[`${address}`] = info;
      let totalSupply = await getMaxTotalSupply(address, infoMap[address].abi);
      if (totalSupply !== 0) {
        tokenSummaryMap[`${address}`].max_total_supply = totalSupply;
      }
    } catch (e) {
      Logger.log(`Error in get token summary by address: ${address}. Error:`, e.message);
    }
  }
  Logger.log('tokenSummaryMap:', tokenSummaryMap);

  // Collect balance changes and store in holderMap
  /* holderMap = {
    ${contract_address}: {
      // PNC-20
      PNC20: {
        ${account_address}: balance_change,
        ...
      }
      // PNC-721
      ${tokenId}: {
        ${account_address}: balance_change,
        ...
      },
      ...
    },
    ... 
  }*/
  const holderMap = {};
  for (let token of tokenArr) {
    // If no tokenSummary info means it's not verified, handled in verify function later
    if (!tokenSummaryMap[`${token.contract_address}`] || token.type === 'unknown') {
      continue;
    }

    // Handle verified token
    if (!holderMap[`${token.contract_address}`]) {
      holderMap[`${token.contract_address}`] = {};
    }
    let holders = holderMap[`${token.contract_address}`];
    let from = token.from.toLowerCase();
    let to = token.to.toLowerCase();
    const key = token.token_id != null ? token.token_id : 'PNC20';
    let value = token.value || 1;
    if (from !== ZeroAddress) {
      if (holders[key] === undefined) {
        holders[key] = { [from]: new BigNumber(0).minus(value).toFixed(0) }
      } else if (holders[key][from] === undefined) {
        holders[key][from] = new BigNumber(0).minus(value).toFixed(0);
      } else {
        holders[key][from] = new BigNumber(holders[key][from]).minus(value).toFixed(0);
      }
    }
    if (to !== ZeroAddress) {
      if (holders[key] === undefined) {
        holders[key] = { [to]: new BigNumber(value).toFixed(0) }
      } else if (holders[key][to] === undefined) {
        holders[key][to] = new BigNumber(value).toFixed(0);
      } else {
        holders[key][to] = new BigNumber(holders[key][to]).plus(value).toFixed(0);
      }
    }
    tokenSummaryMap[`${token.contract_address}`].total_transfers++;
  }
  const updateAsyncList = [];
  for (let address of Object.keys(holderMap)) {
    const holders = holderMap[`${address}`];
    for (let key of Object.keys(holders)) {
      const map = holders[`${key}`];
      const tokenId = key === 'PNC20' ? null : key;
      let holderList = Object.keys(map);
      const newHolderList = new Set(holderList);
      const removeList = [];  // contains zero balance holders
      let list = await tokenHolderDao.getInfoByAddressAndHolderListAsync(address, tokenId, holderList);
      // Handle all holders which has a record, update or remove
      list.forEach(info => {
        const newAmount = BigNumber.sum(new BigNumber(info.amount), new BigNumber(map[`${info.holder}`]));
        if (newAmount.eq(0)) {
          removeList.push(info.holder);
        } else {
          Logger.log('update holder info:', { ...info, amount: newAmount.toFixed(0) })
          updateAsyncList.push(tokenHolderDao.upsertAsync({ ...info, amount: newAmount.toFixed(0) }))
        }
        newHolderList.delete(info.holder);
      });
      // Insert new holders 
      [...newHolderList].forEach(account => {
        updateAsyncList.push(tokenHolderDao.insertAsync({
          contract_address: address,
          holder: account,
          amount: map[`${account}`],
          token_id: tokenId
        }))
      })
      // Remove zero balance holders in removeList
      updateAsyncList.push(tokenHolderDao.removeRecordByAdressAndHolderListAsync(address, tokenId, removeList));
      // Update token summary holders
      if (key === 'PNC20') {
        tokenSummaryMap[address].holders.total += newHolderList.size - removeList.length;
      } else {
        if (tokenSummaryMap[address].holders[tokenId] === undefined) {
          tokenSummaryMap[address].holders[tokenId] = 0;
        }
        if (Number.isNaN(tokenSummaryMap[address].holders[tokenId])) {
          tokenSummaryMap[address].holders[tokenId] = 1;
        }
        tokenSummaryMap[address].holders[tokenId] += newHolderList.size - removeList.length;
      }
    }
    updateAsyncList.push(tokenSummaryDao.upsertAsync({ ...tokenSummaryMap[address] }));
  }
  await Promise.all(updateAsyncList);
  const updateHoldersList = [];
  // Update tokenSummary.total for PNC-721 tokens
  for (let address of Object.keys(tokenSummaryMap)) {
    if (tokenSummaryMap[`${address}`].type !== 'PNC-721') {
      continue;
    }
    try {
      const holderList = await tokenHolderDao.getHolderListAsync(address, null);
      let holderSet = new Set(holderList.map(info => info.holder));
      tokenSummaryMap[`${address}`].holders.total = holderSet.size;
      updateHoldersList.push(tokenSummaryDao.upsertAsync({ ...tokenSummaryMap[`${address}`] }))
    } catch (e) {
      Logger.log('Error in update tokenSummary.total for PNC-721 tokens. Error:', e.message);
    }
  }
  return Promise.all(updateHoldersList);
}

function _getContractAddressSet(tx) {
  let logs = get(tx, 'receipt.Logs');
  if (!logs) return [];
  let set = new Set();
  logs.forEach(log => {
    if (get(log, 'topics[0]') === EventHashMap.TRANSFER) {
      const address = get(log, 'address');
      if (address !== undefined && address !== ZeroAddress) {
        set.add(get(log, 'address'))
      }
    }
  })
  return [...set];
}

function _getContractAddressSetByTxs(txs) {
  let set = new Set();
  for (let tx of txs) {
    let logs = get(tx, 'receipt.Logs');
    if (!logs) continue;
    logs.forEach(log => {
      if (get(log, 'topics[0]') === EventHashMap.TRANSFER) {
        const address = get(log, 'address');
        if (address !== undefined && address !== ZeroAddress) {
          set.add(get(log, 'address'))
        }
      }
    })
  }
  return [...set];
}

function decodeLogByAbiHash(log, abiHash) {
  const events = CommonEventABIs[abiHash];
  for (let event of events) {
    try {
      const ifaceTmp = new ethers.utils.Interface([event] || []);
      let bigNumberData = ifaceTmp.decodeEventLog(event.name, log.data, log.topics);
      let data = {};
      Object.keys(bigNumberData).forEach(k => {
        data[k] = bigNumberData[k].toString();
      })
      log.decode = {
        result: data,
        eventName: event.name,
        event: event
      }
      break;
    } catch (e) {
      continue;
    }
  }
  return log;
}

async function getMaxTotalSupply(address, abi) {
  const arr = abi.filter(obj => obj.name == "totalSupply" && obj.type === 'function');
  if (arr.length === 0) return 0;
  const functionData = arr[0];
  const inputValues = []

  const iface = new ethers.utils.Interface(abi || []);
  const senderSequence = 1;
  const functionInputs = get(functionData, ['inputs'], []);
  const functionOutputs = get(functionData, ['outputs'], []);
  const functionSignature = iface.getSighash(functionData.name)

  const inputTypes = map(functionInputs, ({ name, type }) => {
    return type;
  });
  try {
    var abiCoder = new ethers.utils.AbiCoder();
    var encodedParameters = abiCoder.encode(inputTypes, inputValues).slice(2);;
    const gasPrice = Pando.getTransactionFee(); //feeInPTXWei;
    const gasLimit = 1000000;
    const data = functionSignature + encodedParameters;
    const tx = Pando.unsignedSmartContractTx({
      from: address,
      to: address,
      data: data,
      value: 0,
      transactionFee: gasPrice,
      gasLimit: gasLimit
    }, senderSequence);
    const rawTxBytes = PandoJS.TxSigner.serializeTx(tx);
    const callResponse = await smartContractApi.callSmartContract({ data: rawTxBytes.toString('hex').slice(2) }, { network: Pando.chainId });
    const result = get(callResponse, 'data.result');
    let outputValues = get(result, 'vm_return');
    const outputTypes = map(functionOutputs, ({ name, type }) => {
      return type;
    });
    outputValues = /^0x/i.test(outputValues) ? outputValues : '0x' + outputValues;
    let max = abiCoder.decode(outputTypes, outputValues)[0];
    return max.toString();
  } catch (e) {
    Logger.log('error occurs:', e.message);
    return 0;
  }
}