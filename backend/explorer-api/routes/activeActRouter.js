var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');

const { createModulerLogger } = require('../utilities/logger');
const loggers = createModulerLogger('Explorer_accountTx')
var activeActRouter = (app, activeActDao, rpc) => {
  router.use(bodyParser.urlencoded({ extended: true }));

  router.get("/activeAccount/latest", async (req, res) => {
    activeActDao.getLatestRecordsAsync(1)
      .then(infoList => {
        let body;
        if (Array.isArray(infoList) && infoList.length > 0) {
          body = infoList[0];
        }
        const data = ({
          type: 'active_account',
          body
        });
        loggers.info("activeAccount/latest", data)
        res.status(200).send(data);
      })
      .catch(error => {
        loggers.error("activeAccount/latest", error)
        // console.log('ERR - ', error.message)
        res.status(400).send(error.message);
      });
  });

  router.get("/activeAccount/dates", async (req, res) => {
    const { startDate = +new Date() - 24 * 60 * 60 * 1000 + '', endDate = +new Date() + '' } = req.query;
    activeActDao.getInfoListByTimeAsync(startDate, endDate)
      .then(infoList => {
        const data = ({
          type: 'active_accounts',
          body: infoList
        });
        loggers.info("activeAccount/dates", data)
        res.status(200).send(data);
      })
      .catch(error => {
        // console.log('ERR - ', error.message)
        loggers.error("activeAccount/dates", error)
        res.status(400).send(error.message);
      });
  });

  //the / route of router will get mapped to /api
  app.use('/api', router);
}

module.exports = activeActRouter;