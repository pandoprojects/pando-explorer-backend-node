var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var helper = require('../helper/utils');
const axios = require('axios');
const { createModulerLogger } = require('../utilities/logger');

const logger = createModulerLogger('accounttxrouter');
// var logger = require('../helper/logger');
function orderTxs(txs, ids) {
  var hashOfResults = txs.reduce(function (prev, curr) {
    prev[curr._id] = curr;
    return prev;
  }, {});

  return ids.map(function (id) { return hashOfResults[id] });
}

var accountTxRouter = (app, accountDao, accountTxDao, transactionDao, gps, stakeDao, lBankDao, circulatingCurrDao) => {
  router.use(bodyParser.urlencoded({ extended: true }));


  router.get("/accountTx/history/:address", async (req, res) => {
    const address = helper.normalize(req.params.address.toLowerCase());
    if (!helper.validateHex(address, 40)) {
      res.status(400).send({ type: 'invalid_address' })
      return;
    }
    let { startDate, endDate } = req.query;
    const types = [0, 2, 5];
    const gap = 60 * 60 * 24 * 8;
    if (endDate - startDate > gap) {
      startDate = (endDate - gap).toString();
    }
    accountTxDao.getListByTimeAsync(address, startDate, endDate, types)
      .then(async txList => {
        let txHashes = [];
        let txs = [];
        for (let acctTx of txList) {
          txHashes.push(acctTx.hash);
        }

        txs = await transactionDao.getTransactionsByPkAsync(txHashes);
        txs = orderTxs(txs, txHashes);
        let records = txs.map(tx => {
          const data = tx.data;
          let obj = {
            'tx_hash': tx.hash,
            'timestamp': `"${new Date(tx.timestamp * 1000).toUTCString()}"`
          }
          switch (tx.type) {
            case 0:
              if (data.proposer.address !== address) {
                data.outputs.forEach(output => {
                  if (output.address === address) {
                    obj.tx_type = 'Receive';
                    obj.pando_amount = helper.formatCoin(output.coins.PandoWei);
                    obj.ptx_amount = helper.formatCoin(output.coins.PTXWei);
                    obj.from = '0x00000';
                    obj.to = address;
                  }
                })
              }
              break;
            case 2:
              if (data.inputs[0].address === address) {
                obj.tx_type = 'Send';
                obj.pando_amount = helper.formatCoin(data.inputs[0].coins.PandoWei);
                obj.ptx_amount = helper.formatCoin(data.inputs[0].coins.PTXWei);
                obj.from = address;
                let to = data.outputs.reduce((sum, output) => sum + output.address + ', ', '')
                obj.to = to.substring(0, to.length - 2)
              } else {
                data.outputs.forEach(output => {
                  if (output.address === address) {
                    obj.tx_type = 'Receive';
                    obj.pando_amount = helper.formatCoin(output.coins.PandoWei);
                    obj.ptx_amount = helper.formatCoin(output.coins.PTXWei);
                    obj.from = data.inputs[0].address;
                    obj.to = address;
                  }
                })
              }
              break;
            case 5:
              if (data.source.address === address) {
                obj.tx_type = 'Send';
                obj.pando_amount = helper.formatCoin(data.source.coins.PandoWei);
                obj.ptx_amount = helper.formatCoin(data.source.coins.PTXWei);
                obj.from = address;
                obj.to = data.target.address;
              } else if (data.target.address === address) {
                obj.tx_type = 'Receive';
                obj.pando_amount = helper.formatCoin(data.source.coins.PandoWei);
                obj.ptx_amount = helper.formatCoin(data.source.coins.PTXWei);
                obj.from = data.source.address;
                obj.to = address;
              }
              break;
            default:
              break;
          }
          return obj;

        })

        var data = ({

          type: 'account_tx_list',
          body: records
        });
        res.status(200).send(data);
      })
      .catch(error => {
        const err = ({
          type: 'error_not_found',
          error
        });
        res.status(200).send(err);
      });
  });

  router.get("/accountTx/:address", async (req, res) => {
    const address = helper.normalize(req.params.address.toLowerCase());
    if (!helper.validateHex(address, 40)) {
      res.status(400).send({ type: 'invalid_address' })
      return;
    }
    let { type = 2, isEqualType = 'true', pageNumber = 1, limitNumber = 100, types = null } = req.query;
    type = parseInt(type);
    if (types !== -1 && types !== null) {
      type = JSON.parse(types).map(c => parseInt(c))
    }
    pageNumber = parseInt(pageNumber);
    limitNumber = parseInt(limitNumber);
    let totalNumber = 0;
    let numPages = 0;
    let reverse = false;

    if (!isNaN(pageNumber) && !isNaN(limitNumber) && pageNumber > 0 && limitNumber > 0 && limitNumber < 101) {
      accountDao.getAccountByPkAsync(address)
        .then(accountInfo => {
          if (isEqualType === 'true') {
            totalNumber = Array.isArray(type) ? Object.keys(accountInfo.txs_counter)
              .reduce((total, key) => {
                key = parseInt(key)
                return type.indexOf(key) < 0 ? total : total + accountInfo.txs_counter[key]
              }, 0) : accountInfo.txs_counter[type] || 0;
          } else {
            if (accountInfo.txs_counter) {
              totalNumber = Object.keys(accountInfo.txs_counter).reduce((total, key) => {
                return key == type ? total : total + accountInfo.txs_counter[key]
              }, 0);
            }
          }
          numPages = Math.ceil(totalNumber / limitNumber);
          let page = pageNumber - 1;
          if (numPages > 200 && pageNumber > numPages / 2) {
            reverse = true;
            page = numPages - pageNumber;
          }

          return accountTxDao.getListAsync(address, type, isEqualType, page, limitNumber, reverse);
        })
        .then(async txList => {
          let txHashes = [];
          let txs = [];
          console.log(txList, 'ssasass')
          for (let acctTx of txList) {
            if (reverse) {
              txHashes.unshift(acctTx.hash);
            } else {
              txHashes.push(acctTx.hash);
            }
          }

          txs = await transactionDao.getTransactionsByPkAsync(txHashes);
          txs = orderTxs(txs, txHashes);

          var data = ({
            type: 'account_tx_list',
            body: txs,
            totalPageNumber: numPages,
            currentPageNumber: pageNumber
          });
          res.status(200).send(data);
        })
        .catch(error => {
          if (error.message.includes('NOT_FOUND')) {
            accountTxDao.getListAsync(address, type, isEqualType, pageNumber - 1, limitNumber, reverse)
              .then(async txList => {
                let txHashes = [];
                let txs = [];
                for (let acctTx of txList) {
                  if (reverse) {
                    txHashes.unshift(acctTx.hash);
                  } else {
                    txHashes.push(acctTx.hash);
                  }
                }

                txs = await transactionDao.getTransactionsByPkAsync(txHashes);
                txs = orderTxs(txs, txHashes);
                if (txs.length > 0) {
                  var data = ({
                    type: 'account_tx_list',
                    body: txs,
                    totalPageNumber: numPages,
                    currentPageNumber: pageNumber
                  });
                  res.status(200).send(data);
                } else {
                  const err = ({
                    type: 'error_not_found',
                  });
                  res.status(200).send(err);
                }
              }).catch(error => {
                const err = ({
                  type: 'error_not_found',
                  error
                });
                res.status(200).send(err);
              })
          } else {
            res.status(500).send(err);
          }
        });
    } else {
      res.status(400).send('Invalid parameter');
    }
  });

  router.get("/accountTx/latest/:address", async (req, res) => {
    const address = helper.normalize(req.params.address.toLowerCase());
    if (!helper.validateHex(address, 40)) {
      res.status(400).send({ type: 'invalid_address' })
      return;
    }
    let { startTime = 0 } = req.query;
    const endTime = Math.ceil(Date.now() / 1000).toString();
    const gap = 60 * 60 * 24 * 14;
    if (endTime - startTime > gap) {
      startTime = (endTime - gap).toString();
    }
    accountTxDao.getListByTimeAsync(address, startTime, endTime, null)
      .then(async txList => {
        let txHashes = [];
        let txs = [];
        for (let acctTx of txList) {
          txHashes.push(acctTx.hash);
        }

        txs = await transactionDao.getTransactionsByPkAsync(txHashes);
        txs = orderTxs(txs, txHashes);

        var data = ({
          type: 'account_tx_list',
          body: txs,
        });
        res.status(200).send(data);
      })
      .catch(error => {
        if (error.message.includes('NOT_FOUND')) {
          const err = ({
            type: 'error_not_found',
            error
          });

          res.status(200).send(err);
        } else {
          res.status(500).send(err);
        }
      });
  });




  router.get("/rewards/metatron", async (req, res) => {
    try {
      let metaSourceAddArr = [];
      let metaSourceData = [];
      let metaSourceData2 = [];
      let getTypeZeroList
      let gpsData = await gps.getAllDataAsync();
      // console.log("gpsData length", gpsData.length);

      for (i = 0; i < gpsData.length; i++) {

        metaSourceAddArr.push(gpsData[i]._id);

      }
      // console.log("metaSourceAddArr", metaSourceAddArr.length);

      for (k = 0; k < gpsData.length; k++) {

        getTypeZeroList = await transactionDao.getTypeZeroListAsync(metaSourceAddArr[k])

        if (getTypeZeroList.length > 0) {
          getTypeZeroList.forEach((data) => {
            if (metaSourceData.includes(metaSourceAddArr[k]) === false) {

              metaSourceData.push(metaSourceAddArr[k])
            }
          })
        }
      }

      // console.log("metaSourceData", metaSourceData.length);

      for (l = 0; l < metaSourceData.length; l++) {

        let stakeSourceData = await stakeDao.getAllStakesByTypes3Async(metaSourceData[l])
        stakeSourceData.forEach((data) => {

          metaSourceData2.push(data)

        })
      }
      // console.log("stakeSourceData", metaSourceData2.length);
      metaSourceData2.sort(function (a, b) {

        return parseFloat(b.FinalAmount) - parseFloat(a.FinalAmount);
      });
      // logger.info("rewards/metatron", data);
      res.status(200).send({ "data": metaSourceData2 });
    } catch (err) {

      // console.log("/rewards/metatron", err)
      // logger.error("rewards/metatron", err)
      res.status(500).send({ "Msg": "error" });

    }

  });
  router.get("/activeMetaCount", async (req, res) => {
    try {
      let metaSourceAddArr = [];
      let metaSourceData = [];
      let getTypeZeroList
      let sourceAdd = await stakeDao.getMetatronSourceAddAsync();
      // console.log("sourceAdd sourceAdd", sourceAdd);

      for (i = 0; i < sourceAdd.length; i++) {

        metaSourceAddArr.push(sourceAdd[i]._id);

      }
      // console.log("metaSourceAddArr", metaSourceAddArr.length);

      for (k = 0; k < metaSourceAddArr.length; k++) {

        getTypeZeroList = await transactionDao.getTypeZeroListAsync(metaSourceAddArr[k])

        if (getTypeZeroList.length > 0) {
          getTypeZeroList.forEach((data) => {
            if (metaSourceData.includes(metaSourceAddArr[k]) === false) {

              metaSourceData.push(metaSourceAddArr[k])
            }
          })
        }
      }

      // console.log("metaSourceData", metaSourceData.length);
      logger.info("activeMetaCount")
      res.status(200).send({ "activeMetaCount": metaSourceData.length });
    } catch (err) {

      // console.log("activeMetaCount", err)
      logger.error("activeMetaCount", err)
      res.status(500).send({ "Msg": "error" });

    }

  });
  router.get("/circulating/supply", async (req, res) => {
    try {
      let data = await circulatingCurrDao.getAllDataCirculatingAsync();
      if (data && data.length > 0) {


        logger.info("data377", data)
        console.log("378console", data)
        let TotalWalletBal = data[0].Total * 10e-19;
        console.log(TotalWalletBal);
        let totalStakeData = await stakeDao.getSumOfStakesAsync();
        logger.info(totalStakeData, "totalStakeData")
        let stakeBalance = totalStakeData[0].Total * 10e-19

        let finalWalletAmount = parseFloat(TotalWalletBal + stakeBalance).toFixed(4);
        console.log(finalWalletAmount, "circu");

        logger.info("circulating/supply385", { "CirculatingSupply": parseFloat(finalWalletAmount) });
        res.status(200).send({ "CirculatingSupply": parseFloat(finalWalletAmount) });
      } else {
        console.log("data is  empty");
        res.status(500).send({ "Msg": "data is empty" });
      }
    } catch (err) {

      // console.log("/circulating/supply", err)
      logger.error("circulating/supply389", { "Msg": "error" })
      console.log("err", err)
      res.status(500).send({ "Msg": "error" });

    }

  });


  router.get("/lbank/price", async (req, res) => {
    try {

      let data = await lBankDao.getDataLbankAsync();
      console.log("/lbank/price", data)
      // logger.info("lbank/price")
      res.status(200).send({ "lBankPrice": data });

    } catch (err) {

      console.log("/lbank/price", err)
      logger.error("lbank/price", err);
      res.status(500).send({ "Msg": "error" });

    }

  });

  router.get("/marketCap/price", async (req, res) => {
    try {
      let data = await circulatingCurrDao.getAllDataCirculatingAsync();
      console.log("data463", data)


      logger.info("data", data)
      console.log("cap", data)
      let TotalWalletBal = data[0].Total * 10e-19;
      let lbankPrice = await lBankDao.getDataLbankAsync();
      let price = parseFloat(lbankPrice[0].latestPrice);
      logger.info("price", price)



      axios.get('http://localhost:4022/api/stake/totalAmount')
        .then(async function (response) {
          console.log("response467", response)
          let stakeBalance = parseFloat(response.data.body.totalAmount) * 10e-19;
          logger.info("stakeBalance", stakeBalance)
          let finalWalletAmount = parseInt(TotalWalletBal + stakeBalance)
          console.log("stakeData", TotalWalletBal, stakeBalance, finalWalletAmount, price);
          logger.info("marketCap/price427", parseInt(finalWalletAmount * price))
          res.status(200).send({ "marketCap428": parseInt(finalWalletAmount * price) });
        })
        .catch(function (error) {
          // logger.error("marketCap/price", error)

          res.status(500).send({ "Msg": "error" });

        })


    } catch (err) {
      lBankDaoLib = {}

      console.log("err487", err)
      res.status(500).send({ "Msg": "error" });

    }

  });




  router.get("/rewards/:address", async (req, res) => {
    const address = helper.normalize(req.params.address.toLowerCase());
    if (!helper.validateHex(address, 40)) {
      logger.info("rewards/:address 222", { type: 'invalid_address' })
      res.status(400).send({ type: 'invalid_address' })
      return;
    }
    let { type = 0, isEqualType = 'true', pageNumber = 1, limitNumber = 100, types = null } = req.query;
    type = parseInt(type);
    if (types !== -1 && types !== null) {
      type = JSON.parse(types).map(c => parseInt(c))
    }
    pageNumber = parseInt(pageNumber);
    limitNumber = parseInt(limitNumber);
    let totalNumber = 0;
    let numPages = 0;
    let reverse = false;

    if (!isNaN(pageNumber) && !isNaN(limitNumber) && pageNumber > 0 && limitNumber > 0 && limitNumber < 101) {
      accountDao.getAccountByPkAsync(address)
        .then(accountInfo => {
          if (isEqualType === 'true') {
            totalNumber = Array.isArray(type) ? Object.keys(accountInfo.txs_counter)
              .reduce((total, key) => {
                key = parseInt(key)
                return type.indexOf(key) < 0 ? total : total + accountInfo.txs_counter[key]
              }, 0) : accountInfo.txs_counter[type] || 0;
          } else {
            if (accountInfo.txs_counter) {
              totalNumber = Object.keys(accountInfo.txs_counter).reduce((total, key) => {
                return key == type ? total : total + accountInfo.txs_counter[key]
              }, 0);
            }
          }
          numPages = Math.ceil(totalNumber / limitNumber);
          let page = pageNumber - 1;
          if (numPages > 200 && pageNumber > numPages / 2) {
            reverse = true;
            page = numPages - pageNumber;
          }

          return accountTxDao.getListAsync(address, type, isEqualType, page, limitNumber, reverse);
        })
        .then(async txList => {
          let txHashes = [];
          let txs = [];

          for (let acctTx of txList) {

            if (reverse) {
              txHashes.unshift(acctTx.hash);
            } else {
              txHashes.push(acctTx.hash);
            }

          }


          txs = await transactionDao.getTransactionsByPkAsync(txHashes);
          txs = orderTxs(txs, txHashes);

          var data = ({
            type: 'rewards',
            body: txs,
            totalPageNumber: numPages,
            currentPageNumber: pageNumber,
            total: totalNumber
          });

          res.status(200).send(data);
        })
        .catch(error => {
          if (error.message.includes('NOT_FOUND')) {
            accountTxDao.getListAsync(address, type, isEqualType, pageNumber - 1, limitNumber, reverse)
              .then(async txList => {
                let txHashes = [];
                let txs = [];
                for (let acctTx of txList) {

                  if (reverse) {
                    txHashes.unshift(acctTx.hash);
                  } else {
                    txHashes.push(acctTx.hash);
                  }

                }

                txs = await transactionDao.getTransactionsByPkAsync(txHashes);
                txs = orderTxs(txs, txHashes);
                if (txs.length > 0) {
                  var data = ({
                    type: 'rewards',
                    body: txs,
                    totalPageNumber: numPages,
                    currentPageNumber: pageNumber,
                    total: totalNumber

                  });

                  res.status(200).send(data);
                } else {
                  const err = ({
                    type: 'error_not_found',
                  });
                  res.status(200).send(err);
                }
              }).catch(error => {
                const err = ({
                  type: 'error_not_found',
                  error
                });
                console.log(err)
                res.status(200).send(err);
              })
          } else {
            const err = ({
              type: 'error_not_found'
            });
            console.log(err)
            // logger.error("rewards/address", err);
            res.status(500).send(err);
          }
        });
    } else {
      // logger.error("addressTx/address",data);
      res.status(400).send('Invalid parameter');
    }
  });





  router.get("/staketype/:address", async (req, res) => {
    const address = helper.normalize(req.params.address.toLowerCase());
    if (!helper.validateHex(address, 40)) {
      logger.info("staketype/:address 222", { type: 'invalid_address' })
      res.status(400).send({ type: 'invalid_address' })
      return;
    }
    let { type = 10, isEqualType = 'true', pageNumber = 1, limitNumber = 100, types = null } = req.query;
    type = parseInt(type);
    if (types !== -1 && types !== null) {
      type = JSON.parse(types).map(c => parseInt(c))
    }
    pageNumber = parseInt(pageNumber);
    limitNumber = parseInt(limitNumber);
    let totalNumber = 0;
    let numPages = 0;
    let reverse = false;

    if (!isNaN(pageNumber) && !isNaN(limitNumber) && pageNumber > 0 && limitNumber > 0 && limitNumber < 101) {
      accountDao.getAccountByPkAsync(address)
        .then(accountInfo => {
          if (isEqualType === 'true') {
            totalNumber = Array.isArray(type) ? Object.keys(accountInfo.txs_counter)
              .reduce((total, key) => {
                key = parseInt(key)
                return type.indexOf(key) < 0 ? total : total + accountInfo.txs_counter[key]
              }, 0) : accountInfo.txs_counter[type] || 8;
          } else {
            if (accountInfo.txs_counter) {
              totalNumber = Object.keys(accountInfo.txs_counter).reduce((total, key) => {
                return key == type ? total : total + accountInfo.txs_counter[key]
              }, 0);
            }
          }
          numPages = Math.ceil(totalNumber / limitNumber);
          let page = pageNumber - 1;
          if (numPages > 200 && pageNumber > numPages / 2) {
            reverse = true;
            page = numPages - pageNumber;
          }

          return accountTxDao.getListAsync(address, type, isEqualType, page, limitNumber, reverse);
        })
        .then(async txList => {
          let txHashes = [];
          let txs = [];

          for (let acctTx of txList) {

            if (reverse) {
              txHashes.unshift(acctTx.hash);
            } else {
              txHashes.push(acctTx.hash);
            }

          }


          txs = await transactionDao.getTransactionsByPkAsync(txHashes);
          txs = orderTxs(txs, txHashes);

          var data = ({
            type: 'staketype',
            body: txs,
            totalPageNumber: numPages,
            currentPageNumber: pageNumber,
            total: totalNumber
          });

          res.status(200).send(data);
        })
        .catch(error => {
          if (error.message.includes('NOT_FOUND')) {
            accountTxDao.getListAsync(address, type, isEqualType, pageNumber - 1, limitNumber, reverse)
              .then(async txList => {
                let txHashes = [];
                let txs = [];
                for (let acctTx of txList) {
                  if (reverse) {
                    txHashes.unshift(acctTx.hash);
                  } else {
                    txHashes.push(acctTx.hash);
                  }
                }

                txs = await transactionDao.getTransactionsByPkAsync(txHashes);
                txs = orderTxs(txs, txHashes);

                if (txs.length > 0) {
                  var data = ({
                    type: 'staketype',
                    body: txs,
                    totalPageNumber: numPages,
                    currentPageNumber: pageNumber,
                    total: totalNumber

                  });

                  res.status(200).send(data);
                } else {
                  const err = ({
                    type: 'error_not_found',
                  });
                  console.log(err)
                  res.status(200).send(err);
                }
              }).catch(error => {
                const err = ({
                  type: 'error_not_found',
                  error
                });
                console.log(err)
                res.status(200).send(err);
              })
          } else {

            const err = ({
              type: 'error_not_found'
            });
            console.log(err)
            //logger.error("staketype/address", err);
            res.status(500).send(err);
          }
        });
    } else {
      // logger.error("addressTx/address",data);
      res.status(400).send('Invalid parameter');
    }
  });



  app.use('/api', router);
}

module.exports = accountTxRouter;