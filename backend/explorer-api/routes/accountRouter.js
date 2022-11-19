var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var helper = require('../helper/utils');

const { createModulerLogger } = require('../utilities/logger');
const loggers = createModulerLogger('Explorer_accountTx')
var accountRouter = (app, accountDao, tokenDao, rpc) => {
  router.use(bodyParser.urlencoded({ extended: true }));

  router.get("/account/:address", async (req, res) => {
    let address = helper.normalize(req.params.address.toLowerCase());
    if (!helper.validateHex(address, 40)) {
      loggers.info("account/:address", { type: 'invalid_address' });
      res.status(400).send({ type: 'invalid_address' })
      return;
    }
    // console.log('Querying one account by using Id: ' + address);
    accountDao.getAccountByPkAsync(address)
      .then(accountInfo => {
        const data = ({
          type: 'account',
          body: accountInfo,
        });
        loggers.info("account/:address", data);
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
          loggers.error("account/:address", error)
          // console.log('ERR - ', error)
        }
      });
  });

  router.get("/account/update/:address", async (req, res) => {
    let address = helper.normalize(req.params.address.toLowerCase());
    // console.log('Updating one account by Id:', address);
    if (!helper.validateHex(address, 40)) {
      res.status(400).send({ type: 'invalid_address' })
      return;
    }
    rpc.getAccountAsync([{ 'address': address }])
      .then(async function (data) {
        let tmp = JSON.parse(data);
    
        if (tmp.result) {
          const isExist = await accountDao.checkAccountAsync(address);
          const accountInfo = isExist ? await accountDao.getAccountByPkAsync(address) : null;
          const txs_counter = accountInfo ? accountInfo.txs_counter : {};
          const newInfo = {
            address,
            'balance': tmp.result.coins,
            'sequence': tmp.result.sequence,
            'reserved_funds': tmp.result.reserved_funds,
            'txs_counter': txs_counter,
            'code': tmp.result.code
          }
          await accountDao.upsertAccountAsync(newInfo);
          const data = ({
            type: 'account',
            body: newInfo,
          });
          res.status(200).send(data);
        } else {
          const isExist = await accountDao.checkAccountAsync(address);
          if (isExist) {
            const accountInfo = await accountDao.getAccountByPkAsync(address);
            const txs_counter = accountInfo ? accountInfo.txs_counter : {};
            const newInfo = {
              address,
              'balance': accountInfo.balance,
              'sequence': accountInfo.sequence,
              'reserved_funds': accountInfo.reserved_funds,
              'txs_counter': txs_counter,
              'code': accountInfo.code
            }
            const data = ({
              type: 'account',
              body: newInfo,
            });
            res.status(200).send(data);
            return;
          }
          const err = ({
            type: 'error_not_found'
          });
          res.status(200).send(err);
        }
      })
  });

  router.get("/account/total/number", async (req, res) => {
    const { startDate, endDate } = req.query;
    if (startDate && endDate) {
      console.log('Querying the total number of accounts with dates');
      activeActDao.getInfoListByTimeAsync(startDate, endDate)
        .then(infoList => {
          infoList = infoList.map(info => ({
            "total_number_account": info.amount,
            "timestamp": info.timestamp
          }))
          const data = ({
            type: 'active_accounts',
            body: infoList
          });
          res.status(200).send(data);
        })
        .catch(error => {
          loggers.info("account/total/number", error)
          // console.log('ERR - ', error.message)
          res.status(400).send(error.message);
        });
      return;
    }
    console.log('Querying the total number of accounts');
    accountDao.getTotalNumberAsync()
      .then(number => {
        const data = ({
          'total_number_account': number,
        });
        res.status(200).send(data);
      })
      .catch(error => {
        if (error.message.includes('NOT_FOUND')) {
          const err = ({
            type: 'error_not_found',
            error
          });
          loggers.info("account/total/number 200", err);
          res.status(200).send(err);
        } else {
          // console.log('ERR - ', error)
          loggers.error("account/total/number", error);
        }
      });
  });

  router.get("/account/top/:tokenType/:limit", async (req, res) => {
    const limitNumber = parseInt(req.params.limit);
    const tokenType = req.params.tokenType;
    if (!isNaN(limitNumber) && limitNumber > 0 && limitNumber < 1001 && (tokenType === 'pando' || tokenType === 'PTX')) {
      console.log(`Querying the top ${limitNumber} ${tokenType} holders`);
      accountDao.getTopAccountsAsync(tokenType + 'wei', limitNumber)
        .then(accountInfoList => {
          var data = ({
            type: 'account_list',
            body: accountInfoList,
          });
          loggers.info("account/top/:tokenType/:limit", data)
          res.status(200).send(data);
        })
        .catch(error => {
          if (error.message.includes('NOT_FOUND')) {
            const err = ({
              type: 'error_not_found',
              error
            });
            loggers.error("account/top/:tokenType/:limit", error)
            res.status(200).send(err);
          } else {
            loggers.error("account/top/:tokenType/:limit", error);
            // console.log('ERR - ', error)
          }
        });
    } else {

      res.status(400).send('Wrong parameter.');
    }
  });

  router.get("/account/tokenTxNum/:address", (req, res) => {
    let address = helper.normalize(req.params.address.toLowerCase());
    if (!helper.validateHex(address, 40)) {
      loggers.info("account/tokenTxNum/:address", { type: 'invalid_address' });

      res.status(400).send({ type: 'invalid_address' })
      return;
    }
    const { type } = req.query;
    tokenDao.getRecordsNumberByAccountAndTypeAsync(address, type)
      .then(totalNumber => {
        loggers.info("account/tokenTxNum/:address", {
          type: "token_tx_number",
          body: { total_number: totalNumber }
        })
        res.status(200).send({
          type: "token_tx_number",
          body: { total_number: totalNumber }
        });
      })
  })

  router.get("/account/tokenTx/:address", (req, res) => {
    let address = helper.normalize(req.params.address.toLowerCase());
    if (!helper.validateHex(address, 40)) {
      loggers.info("account/tokenTx/:address", { type: 'invalid_address' });
      res.status(400).send({ type: 'invalid_address' })
      return;
    }
    let totalPageNumber = 0;
    let { type, pageNumber = 1, limit = 10 } = req.query;
    tokenDao.getRecordsNumberByAccountAndTypeAsync(address, type)
      .then(totalNumber => {
        if (totalNumber === 0) {
          res.status(400).send('No Related Record.');
          return;
        }
        pageNumber = parseInt(pageNumber);
        limit = parseInt(limit);
        totalPageNumber = Math.ceil(totalNumber / limit);
        if (!isNaN(pageNumber) && !isNaN(limit) && pageNumber > 0 && pageNumber <= totalPageNumber && limit > 0 && limit < 101) {
          return tokenDao.getInfoListByAccountAndTypeAsync(address, type, pageNumber - 1, limit)
        } else {
          res.status(400).send('Wrong parameter.');
          return;
        }
      })
      .then(info => {
        if (!info) return;
        const data = ({
          "type": "token_txs",
          body: info,
          totalPageNumber,
          currentPageNumber: pageNumber
        })
        loggers.info("account/tokenTx/:address", data);
        res.status(200).send(data);
      })
  });

  router.get("/account/tokenTxByDays/:address", (req, res) => {
    let address = helper.normalize(req.params.address.toLowerCase());
    if (!helper.validateHex(address, 40)) {
      loggers.info("account/tokenTxByDays/:address", { type: 'invalid_address' });
      res.status(400).send({ type: 'invalid_address' });
      return;
    }
    let { tokenType = 'PNC-20', days = 30, target = 'in' } = req.query;
    days = Number(days);
    tokenDao.getInfoListByDaysAsync(address, tokenType, target, days)
      .then(infoList => {
        const data = ({
          "type": "token_txs",
          body: infoList
        })
        loggers.info("account/tokenTxByDays/:address", data)
        res.status(200).send(data);
      })
  });

  // router.get("/account/update2/:address", async (req, res) => {
  //   let address = helper.normalize(req.params.address.toLowerCase());
  //   // console.log('Updating one account by Id:', address);
  //   if (!helper.validateHex(address, 40)) {
  //     res.status(200).send({ type: 'invalid_address' })
  //     return;
  //   }
  //   rpc.getAccountAsync([{ 'address': address }])
  //     .then(async function (data) {
  //       let tmp = JSON.parse(data);
  //       if (tmp.result) {
  //         const isExist = await accountDao.checkAccountAsync(address);
  //         const accountInfo = isExist ? await accountDao.getAccountByPkAsync(address) : null;
  //         const txs_counter = accountInfo ? accountInfo.txs_counter : {};
  //         const newInfo = {
  //           address,
  //           'balance': tmp.result.coins,
  //           'sequence': tmp.result.sequence,
  //           'reserved_funds': tmp.result.reserved_funds,
  //           'txs_counter': txs_counter,
  //           'code': tmp.result.code
  //         }
  //         await accountDao.upsertAccountAsync(newInfo);
  //         const data = ({
  //           type: 'account',
  //           body: newInfo,
  //         });
  //         res.status(200).send(data);
  //       } else {
  //         const isExist = await accountDao.checkAccountAsync(address);
  //         if (isExist) {
  //           const accountInfo = await accountDao.getAccountByPkAsync(address);
  //           const txs_counter = accountInfo ? accountInfo.txs_counter : {};
  //           const newInfo = {
  //             address,
  //             'balance': accountInfo.balance,
  //             'sequence': accountInfo.sequence,
  //             'reserved_funds': accountInfo.reserved_funds,
  //             'txs_counter': txs_counter,
  //             'code': accountInfo.code
  //           }
  //           const data = ({
  //             type: 'account',
  //             body: newInfo,
  //           });
  //           res.status(200).send(data);
  //           return;
  //         }
  //         const err = ({
  //           type: 'error_not_found'
  //         });
  //         res.status(200).send(err);
  //       }
  //     })
  // });



  //the / route of router will get mapped to /api
  app.use('/api', router);
}

module.exports = accountRouter;