var helper = require('./utils');
var Logger = require('./logger');
var get = require('lodash/get');

var stakesCache = {
  vcp: new Map(),
  gcp: new Map(),
  rametronenterprisep: new Map()
}
var stakeKeysCache = {
  vcp: new Set(),
  gcp: new Set(),
  rametronenterprisep: new Set()
}

function shallowEqual(object1, object2) {
  const keys1 = Object.keys(object1);
  const keys2 = Object.keys(object2);
  if (keys1.length !== keys2.length) {
    return false;
  }
  for (let key of keys1) {
    if (object1[key] !== object2[key]) {
      return false;
    }
  }
  return true;
}
async function updateStakeWithCache(candidateList, type, stakeDao) {
  let cacheKeyRef = stakeKeysCache[`${type}`];
  let cacheRef = stakesCache[`${type}`];
  if (cacheKeyRef.size === 0) {
    await stakeDao.removeRecordsAsync(type);
  }
  let updateStakeList = [];
  let existKeys = new Set(cacheKeyRef);
  for (let candidate of candidateList) {
    const holder = candidate.Holder;
    const stakes = candidate.Stakes;
    for (let stake of stakes) {
      const id = `${type}_${holder}_${stake.source}`;
      const stakeInfo = {
        '_id': id,
        'type': type,
        'holder': holder,
        'source': stake.source,
        'amount': stake.amount,
        'withdrawn': stake.withdrawn,
        'return_height': stake.return_height,
      }
      if (existKeys.has(id)) {
        existKeys.delete(id);
        if (!shallowEqual(cacheRef.get(id), stakeInfo)) {
          updateStakeList.push(stakeInfo);
          cacheRef.set(id, stakeInfo);
        }
      } else {
        updateStakeList.push(stakeInfo);
        cacheKeyRef.add(id);
        cacheRef.set(id, stakeInfo);
      }
    };
  }
  let deleteKeys = [...existKeys];
  for (let stake of updateStakeList) {
    await stakeDao.insertAsync(stake);
  }
  Logger.log('updateStakeList length:', updateStakeList.length, 'type:', type)
  Logger.log('delete keys length:', deleteKeys.length, 'type:', type);
  await stakeDao.removeRecordsByIdAsync(type, deleteKeys, false);
  for (let key of deleteKeys) {
    cacheRef.delete(key);
    cacheKeyRef.delete(key);
  }
}

exports.updateStake = async function (candidate, type, stakeDao) {
  const holder = candidate.Holder;
  const stakes = candidate.Stakes;
  let insertList = [];
  stakes.forEach(stake => {
    const stakeInfo = {
      '_id': `${type}_${holder}_${stake.source}`,
      'type': type,
      'holder': holder,
      'source': stake.source,
      'amount': stake.amount,
      'withdrawn': stake.withdrawn,
      'return_height': stake.return_height,
    }
    insertList.push(stakeDao.insertAsync(stakeInfo));
  });
  Logger.log('update stake list', type, 'length:', insertList.length)
  await Promise.all(insertList);
}
exports.updateStakes = async function (candidateList, type, stakeDao, cacheEnabled) {
  // Logger.log('before update stakes:', type)
  // await stakeDao.updateStakesAsync(candidateList, type);
  // Logger.log('after update stakes:', type)
  if (cacheEnabled) {
    await updateStakeWithCache(candidateList, type, stakeDao);
    return;
  }
  await stakeDao.updateStakesAsync(candidateList, type);
}
exports.updateTotalStake = function (totalStake, progressDao) {
  let totalPando = 0, totalPTX = 0;
  let pandoHolders = new Set(), ptxHolders = new Set();
  totalStake.vcp && totalStake.vcp.forEach(vcpPair => {
    vcpPair.Vcp.SortedCandidates.forEach(candidate => {
      pandoHolders.add(candidate.Holder)
      candidate.Stakes.forEach(stake => {
        totalPando = helper.sumCoin(totalPando, stake.withdrawn ? 0 : stake.amount)
      })
    })
  })
  totalStake.gcp && totalStake.gcp.forEach(gcpPair => {
    gcpPair.Gcp.SortedGuardians.forEach(candidate => {
      pandoHolders.add(candidate.Holder)
      candidate.Stakes.forEach(stake => {
        totalPando = helper.sumCoin(totalPando, stake.withdrawn ? 0 : stake.amount)
      })
    })
  })
  totalStake.rametronenterprisep && totalStake.rametronenterprisep.forEach(rametronenterprisepPair => {
    rametronenterprisepPair.Rametronenterprises.forEach(candidate => {
      ptxHolders.add(candidate.Holder);
      candidate.Stakes.forEach(stake => {
        totalPTX = helper.sumCoin(totalPTX, stake.withdrawn ? 0 : stake.amount);
      })
    })
  })

  if (totalPando.toFixed() != 0) {
    progressDao.upsertStakeProgressAsync('pando', totalPando.toFixed(), pandoHolders.size);
  }
  if (totalPTX.toFixed() != 0) {
    progressDao.upsertStakeProgressAsync('PTX', totalPTX.toFixed(), ptxHolders.size);
  }
}

exports.insertStakePairs = async function (paris, type, blockHeight, timestamp, stakeHistoryDao) {
  Logger.log('In sert stake pairs', type)
  const insertList = []
  paris.forEach(pair => {
    get(pair, pathMap[type]).forEach(candidate => {
      const holder = candidate.Holder;
      candidate.Stakes.forEach(stake => {
        insertList.push(stakeHistoryDao.insertAsync({
          'type': type,
          'holder': holder,
          'source': stake.source,
          'amount': stake.amount,
          'withdrawn': stake.withdrawn,
          'return_height': stake.return_height,
          'height': blockHeight,
          'timestamp': timestamp
        }))
      })
    })
  })
  Logger.log('insertList', type, 'length:', insertList.length)
  await Promise.all(insertList);
}

const pathMap = {
  'vcp': 'Vcp.SortedCandidates',
  'gcp': 'Gcp.SortedGuardians',
  'rametronenterprisep': 'Rametronenterprises'
}