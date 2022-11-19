var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var helper = require('../helper/utils');


var supplyRouter = (app, progressDao, rpc, config) => {
  router.use(bodyParser.urlencoded({ extended: true }));

  // The api to get total amount of Pando
  router.get("/supply/pando", (req, res) => {
    console.log('Querying the total amount of Pando.');
    const data = ({
      "total_supply": 1000000000,
      "circulation_supply": 1000000000
    });
    res.status(200).send(data);
  });

  // The api to get total amount of PTX
  router.get("/supply/PTX", (req, res) => {
    console.log('Querying the total amount of PTX.');
    if (config.blockchain.networkId !== 'main_net_chain') {
      const data = ({
        "total_supply": 5000000000,
        "circulation_supply": 5000000000
      });
      res.status(200).send(data);
      return;
    }
    progressDao.getProgressAsync(config.blockchain.networkId)
      .then(async progressInfo => {
        try {
          const height = progressInfo.height;
          let response = await rpc.getAccountAsync([{ 'address': '0x0' }]);
          let account = JSON.parse(response).result;
          const addressZeroBalance = account ? account.coins.PTXWei : 0;
          const feeInfo = await progressDao.getFeeAsync()
          const burntAmount = helper.sumCoin(addressZeroBalance, feeInfo.total_fee).toFixed();
          const supply = 5000000000 + ~~((10968061 - 4164982) / 100) * 4800 + ~~((height - 10968061) / 100) * 8600 - helper.formatCoin(burntAmount).toFixed(0);
          const data = ({
            "total_supply": supply,
            "circulation_supply": supply
          })
          res.status(200).send(data);
        } catch (err) {
          res.status(400).send(err.message);
          return;
        }
      }).catch(err => {
        res.status(400).send(err.message);
      })
  });

  router.get("/supply/PTX/burnt", async (req, res) => {
    console.log('Querying the total PTX burnt amount.');
    try {
      let response = await rpc.getAccountAsync([{ 'address': '0x0' }]);
      let account = JSON.parse(response).result;
      const addressZeroBalance = account ? account.coins.PTXWei : 0;
      const feeInfo = await progressDao.getFeeAsync()
      const burntAmount = helper.sumCoin(addressZeroBalance, feeInfo.total_fee).toFixed();
      const data = ({
        "address_zero_PTXWei_balance": addressZeroBalance,
        "total_PTXWei_burnt_as_transaction_fee": feeInfo.total_fee,
        "total_PTXWei_burnt": burntAmount,
      })
      res.status(200).send(data);
    } catch (err) {
      res.status(400).send(err.message);
    }
  })
  //the / route of router will get mapped to /api
  app.use('/api', router);
}

module.exports = supplyRouter;