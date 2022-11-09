var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var helper = require('../helper/utils');
var axios = require("axios").default;
let startTime = { pando: +new Date(), PTX: +new Date() };
const cachePeriod = 6 * 1000 // 6 seconds
let cacheData = { pando: undefined, PTX: undefined };
var stakeRouter = (app, stakeDao, blockDao, accountDao, progressDao, config) => {
  router.use(bodyParser.urlencoded({ extended: true }));
  router.use(bodyParser.json());




  router.get("/stake/all", (req, res) => {
    console.log('Querying all stake.');
    let { types = ['vcp', 'gcp', 'rametronenterprisep'] } = req.query;
    stakeDao.getAllStakesByTypesAsync(types)
      .then(stakeListInfo => {
        const data = ({
          type: 'stake',
          body: stakeListInfo,
        });
        //   const pageCount = Math.ceil(stakeListInfo.length / 10);
        // let page = parseInt(req.query.pages);
        // if (!page) { page = 1; }
        // if (page > pageCount) {
        //   page = pageCount
        // }
        // res.json({
        //   "page": page,
        //   "pageCount": pageCount,
        //   "data": stakeListInfo.slice(page * 10 - 10, page * 10)
        // });
        console.log(stakeListInfo.length);
        res.status(200).send(data);
      })
      .catch(error => {
        if (error.message.includes('NOT_FOUND')) {
          const err = ({
            type: 'error_not_found',
            error
          });
          res.status(404).send(err);
        } else {
          console.log('ERR - ', error)
        }
      });
  });

  router.get("/stake/totalMetatron", (req, res) => {
    console.log('Querying all stake.');
    let { types = ['gcp'] } = req.query;
    stakeDao.getAllStakesByTypesAsync(types)
      .then(stakeListInfo => {
        const data = ({
          type: 'stake',
          body: stakeListInfo,
        });

        const totalStakeAmount = data.body.reduce((total, stake) => {

          let stakeAmount = parseInt(stake.amount);
          total += stakeAmount

          return total
        }, 0);

        // let dollarUSLocale = Intl.NumberFormat('en-US');
        totalMetatron = totalStakeAmount * 10e-19;
        // console.log("totalMetatron", totalMetatron)
        res.status(200).send({ "totalMetatron": totalMetatron.toFixed(4) });
      })
      .catch(error => {
        if (error.message.includes('NOT_FOUND')) {
          const err = ({
            type: 'error_not_found',
            error
          });
          res.status(404).send(err);
        } else {
          console.log('ERR - ', error)
        }
      });
  });

  router.get("/stake/totalRametron", (req, res) => {
    console.log('Querying all stake.');
    let { types = ['rametronenterprisep'] } = req.query;
    stakeDao.getAllStakesByTypesAsync(types)
      .then(stakeListInfo => {
        const data = ({
          type: 'stake',
          body: stakeListInfo,
        });

        const totalStakeAmount = data.body.reduce((total, stake) => {

          let stakeAmount = parseInt(stake.amount);
          total += stakeAmount

          return total
        }, 0);

        // let dollarUSLocale = Intl.NumberFormat('en-US');
        totalMetatron = totalStakeAmount * 10e-19;

        res.status(200).send({ "totalRametron": totalMetatron.toFixed(4) });
      })
      .catch(error => {
        if (error.message.includes('NOT_FOUND')) {
          const err = ({
            type: 'error_not_found',
            error
          });
          res.status(404).send(err);
        } else {
          console.log('ERR - ', error)
        }
      });
  });

  router.get("/stake/totalzytatron", (req, res) => {
    console.log('Querying all stake.');
    let { types = ['vcp'] } = req.query;
    stakeDao.getAllStakesByTypesAsync(types)
      .then(stakeListInfo => {
        const data = ({
          type: 'stake',
          body: stakeListInfo,
        });

        const totalStakeAmount = data.body.reduce((total, stake) => {

          let stakeAmount = parseInt(stake.amount);
          total += stakeAmount

          return total
        }, 0);

        // let dollarUSLocale = Intl.NumberFormat('en-US');
        totalMetatron = totalStakeAmount * 10e-19;

        res.status(200).send({ "totalZytatron": totalMetatron.toFixed(4) });
      })
      .catch(error => {
        if (error.message.includes('NOT_FOUND')) {
          const err = ({
            type: 'error_not_found',
            error
          });
          res.status(404).send(err);
        } else {
          console.log('ERR - ', error)
        }
      });
  });



  router.get("/stake/allZyta", (req, res) => {
    console.log('Querying all stake.');
    let { types = ['vcp'] } = req.query;
    stakeDao.getAllStakesByTypesAsync(types)
      .then(stakeListInfo => {
        const data = ({
          type: 'stake',
          body: stakeListInfo,
        });
        res.status(200).send(data);
      })
      .catch(error => {
        if (error.message.includes('NOT_FOUND')) {
          const err = ({
            type: 'error_not_found',
            error
          });
          res.status(404).send(err);
        } else {
          console.log('ERR - ', error)
        }
      });
  });

  router.get("/stake/allMeta", async (req, res) => {
    console.log('Querying all stake.');
    let { types = ['gcp'] } = req.query;
    stakeDao.getAllStakesByTypes2Async(types)
      .then(stakeListInfo => {
        const data = stakeListInfo;
        res.status(200).send({ data: data });
      })
      .catch(error => {
        if (error.message.includes('NOT_FOUND')) {
          const err = ({
            type: 'error_not_found',
            error
          });
          res.status(404).send(err);
        } else {
          console.log('ERR - ', error)
        }
      });
  });




  router.get("/stake/allRametron", async (req, res) => {
    console.log('Querying all stake.');
    let { types = ['rametronenterprisep'] } = req.query;


    stakeDao.getAllStakesByTypesRametronAsync(types)
      .then(stakeListInfo => {
        const data = stakeListInfo;
        console.log("stake207", data)
        // const pageCount = Math.ceil(data.length / 10);
        // let page = parseInt(req.query.pages);
        // if (!page) { page = 1; }
        // if (page > pageCount) {
        //   page = pageCount
        // }
        // res.json({
        //   "page": page,
        //   "pageCount": pageCount,
        //   "data": data.slice(page * 10 - 10, page * 10)
        // });
        res.status(200).send({ data: data });
      })
      .catch(error => {
        if (error.message.includes('NOT_FOUND')) {
          const err = ({
            type: 'error_not_found',
            error
          });
          res.status(404).send(err);
        } else {
          console.log('ERR - ', error)
        }
      });
  });

  //------------------------------------------------stake/metaCount  Api s------------------------
  router.get("/stake/metaCount", async (req, res) => {
    console.log('Querying all stake.');
    stakeDao.getMetatronCountAsync()
      .then(stakeListInfo => {
        const data = stakeListInfo[0];
        res.status(200).send({ data });
      })
      .catch(error => {
        if (error.message.includes('NOT_FOUND')) {
          const err = ({
            type: 'error_not_found',
            error
          });
          res.status(404).send(err);
        } else {
          console.log('ERR - ', error)
        }
      });
  });
  //---------------------------------- stake/RametronmetaCount------------------------------------------------------
  router.get("/stake/RametronCount", async (req, res) => {
    console.log('Querying all stake.');
    stakeDao.getRametronCountAsync()
      .then(stakeListInfo => {
        const data = stakeListInfo[0];
        res.status(200).send({ data });
      })
      .catch(error => {
        if (error.message.includes('NOT_FOUND')) {
          const err = ({
            type: 'error_not_found',
            error
          });
          res.status(404).send(err);
        } else {
          console.log('ERR - ', error)
        }
      });
  });




  router.get("/stake/totalAmount", (req, res) => {
    let { type = 'pando' } = req.query;

    if (type !== 'pando' && type !== 'PTX') {
      res.status(400).send('Wrong parameter.');
      return;
    }
    let cur = +new Date();
    if (cur - startTime[type] < cachePeriod && cacheData && cacheData[type]) {
      const data = cacheData[type];
      if (data.type === 'stakeTotalAmout') {
        res.status(200).send(data);
      } else if (data.type === 'error_not_found') {
        res.status(404).send(data);
      }
      return;
    }
    startTime[type] = cur;
    progressDao.getStakeProgressAsync(type)
      .then(info => {
        const data = ({
          type: 'stakeTotalAmout',
          body: { totalAmount: info.total_amount, totalNodes: info.holder_num, type: info.type },
        });
        cacheData[type] = data;
        res.status(200).send(data);
      })
      .catch(error => {
        if (error.message.includes('NOT_FOUND')) {
          const err = ({
            type: 'error_not_found',
            error
          });
          cacheData[type] = err;
          res.status(404).send(err);
        } else {
          console.log('ERR - ', error)
        }
      });
  });



  router.get("/stake/:id", (req, res) => {
    console.log('Querying stake by address.');
    let { hasBalance = false, types = ['vcp', 'gcp', 'rametronenterprisep'] } = req.query;
    const address = helper.normalize(req.params.id.toLowerCase());
    //TODO: Remove isChromeExt related after review
    const origin = req.headers.origin;
    const regex = /^chrome-extension:.*$/;
    const isChromeExt = origin && regex.test(origin);
    if (!helper.validateHex(address, 40)) {
      res.status(400).send({ type: 'invalid_address' })
      return;
    }
    stakeDao.getStakeByAddressAsync(address, types)
      .then(async stakeListInfo => {
        // TODO: Remove retry after fix the stake issue
        if (stakeListInfo.holderRecords.length === 0 && stakeListInfo.sourceRecords.length === 0) {
          stakeListInfo = await stakeDao.getStakeByAddressAsync(address, types);
        }
        if (hasBalance === 'true') {
          for (let i = 0; i < stakeListInfo.holderRecords.length; i++) {
            if (stakeListInfo.holderRecords[i].type === 'gcp') {
              const accInfo = await accountDao.getAccountByPkAsync(stakeListInfo.holderRecords[i].source);
              stakeListInfo.holderRecords[i].source_PTXWei_balance = accInfo.balance.PTXWei;
            }
          }
        }
        //TODO: Remove isChromeExt related after review
        if (isChromeExt) {
          const stakes = JSON.parse(JSON.stringify(stakeListInfo));
          stakeListInfo.stakes = stakes;
        }

        const data = ({
          type: 'stake',
          body: stakeListInfo,
        });
        res.status(200).send(data);
      })
      .catch(error => {
        if (error.message.includes('NOT_FOUND')) {
          const err = ({
            type: 'error_not_found',
            error
          });
          res.status(404).send(err);
        } else {
          console.log('ERR - ', error)
        }
      });
  });


  router.post("/stake/node-status", (req, res) => {
    req.setTimeout(3000);
    const reqbody =
    {
      jsonrpc: "2.0",
      method: "pando.GetStatus",
      params: [],
      id: 1
    }
    axios.post(`http://${req.body.ip}:16888/rpc`, reqbody).then((resp) => {
      console.log(resp.data);
      if (resp.data.result) {
        res.status(200).send(resp.data);
      } else {
        res.status(400).send(resp.data.error.message);
      }
    }).catch((err) => {
      res.status(400).send(err);

    })


  })

  //querying using source address in stake collection

  router.get("/stakeMeta/:address", async (req, res) => {
    console.log('Querying stake by address.');
    const address = helper.normalize(req.params.address.toLowerCase());
    if (!helper.validateHex(address, 40)) {
      res.status(400).send({ type: 'invalid_address' })
      return;
    }
    try {

      let stakeSourceData = await stakeDao.getTotalMetaStakeByAddAsync(address)
      if (stakeSourceData.length > 0) {
        res.status(200).send(stakeSourceData);
      } else {
        res.status(200).send(stakeSourceData);
      }
    } catch (err) {
      res.status(500).send({ "Msg": "Error" });
    }

  });
  //the / route of router will get mapped to /api
  app.use('/api', router);
}

module.exports = stakeRouter;