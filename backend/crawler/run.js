var schedule = require('node-schedule-tz');
var bluebird = require("bluebird");
var fs = require('fs');
var rpc = require('./api/rpc.js');
var Logger = require('./helper/logger');
var mongoClient = require('../mongo-db/mongo-client.js')
var progressDaoLib = require('../mongo-db/progress-dao.js');
var blockDaoLib = require('../mongo-db/block-dao.js');
var transactionDaoLib = require('../mongo-db/transaction-dao.js');
var accountDaoLib = require('../mongo-db/account-dao.js');
var accountTxDaoLib = require('../mongo-db/account-tx-dao.js');
var stakeDaoLib = require('../mongo-db/stake-dao.js');
var txHistoryDaoLib = require('../mongo-db/tx-history-dao.js');
var accountingDaoLib = require('../mongo-db/accounting-dao.js');
var checkpointDaoLib = require('../mongo-db/checkpoint-dao.js');
var smartContractDaoLib = require('../mongo-db/smart-contract-dao.js')
var activeAccountDaoLib = require('../mongo-db/active-account-dao')
var totalAccountDaoLib = require('../mongo-db/total-account-dao')
var dailyAccountDaoLib = require('../mongo-db/daily-account-dao.js')
var tokenDaoLib = require('../mongo-db/token-dao.js')
var tokenSummaryDaoLib = require('../mongo-db/token-summary-dao.js')
var tokenHolderDaoLib = require('../mongo-db/token-holder-dao.js')
var rewardDistributionDaoLib = require('../mongo-db/reward-distribution-dao.js')

var Redis = require("ioredis");
var redis = null;
var redisConfig = null;
var cacheConfig = null; // node local cache configuration
var cacheEnabled = false;

var readBlockCronJob = require('./jobs/read-block.js');
var readPreFeeCronJob = require('./jobs/read-previous-fee.js');
var readTxHistoryJob = require('./jobs/read-tx-history.js');
var accountingJob = require('./jobs/accounting.js');
var accountJob = require('./jobs/read-accounts.js');
var express = require('express');
var app = express();
var cors = require('cors')

//------------------------------------------------------------------------------
//  Global variables
//------------------------------------------------------------------------------
var config = null;
var configFileName = 'config.cfg'
var blockDao = null;

//------------------------------------------------------------------------------
//  Start from here
//------------------------------------------------------------------------------
main();

//------------------------------------------------------------------------------
//  All the implementation goes below
//------------------------------------------------------------------------------

function main() {
  Logger.initialize()
  // load config
  Logger.log('Loading config file: ' + configFileName)
  try {
    config = JSON.parse(fs.readFileSync(configFileName));
  } catch (err) {
    Logger.log('Error: unable to load ' + configFileName);
    Logger.log(err);
    process.exit(1);
  }
  const network_id = config.blockchain.network_id;
  rpc.setConfig(config);
  bluebird.promisifyAll(rpc);

  redisConfig = config.redis;
  Logger.log("redisConfig:", redisConfig)
  cacheEnabled = config.nodeCache && config.nodeCache.enabled;
  Logger.log('cacheEnabled:', cacheEnabled);
  if (redisConfig && redisConfig.enabled) {
    redis = redisConfig.isCluster ? new Redis.Cluster([
      {
        host: redisConfig.host,
        port: redisConfig.port,
      },
    ], {
      redisOptions: {
        password: redisConfig.password,
      }
    }) : new Redis(redisConfig);
    bluebird.promisifyAll(redis);
    redis.on("connect", () => {
      Logger.log('connected to Redis');
    });
  }

  // connect to mongoDB
  mongoClient.init(__dirname, config.mongo.address, config.mongo.port, config.mongo.dbName);
  mongoClient.connect(config.mongo.uri, function (error) {
    if (error) {
      Logger.log('Mongo DB connection failed with err: ', error);
      process.exit();
    } else {
      Logger.log('Mongo DB connection succeeded');
      setupGetBlockCronJob(mongoClient, network_id);
    }
  });

  app.use(cors());
  app.get('/ping', function (req, res) {
    Logger.log('Receive healthcheck /ping from ELB - ' + req.connection.remoteAddress);
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Content-Length': 2
    });
    res.write('OK');
    res.end();
  });
  var http = require('http').createServer(app);
  http.listen('8080', () => {
    Logger.log("rest api running on port. 8080");
  });
}

// function setupGetBlockCronJob(aerospikeClient) {
//   // initialize DAOs
//   progressDao = new progressDaoLib(__dirname, aerospikeClient);
//   bluebird.promisifyAll(progressDao);

//   blockDao = new blockDaoLib(__dirname, aerospikeClient);
//   bluebird.promisifyAll(blockDao);

//   transactionDao = new transactionDaoLib(__dirname, aerospikeClient);
//   bluebird.promisifyAll(transactionDao);

//   accountDao = new accountDaoLib(__dirname, aerospikeClient);
//   bluebird.promisifyAll(accountDao);

//   readBlockCronJob.Initialize(progressDao, blockDao, transactionDao, accountDao);
//   schedule.scheduleJob('* * * * * *', readBlockCronJob.Execute);
// }

function setupGetBlockCronJob(mongoClient, network_id) {
  // initialize DAOs
  progressDao = new progressDaoLib(__dirname, mongoClient, redis);
  bluebird.promisifyAll(progressDao);

  blockDao = new blockDaoLib(__dirname, mongoClient, redis);
  bluebird.promisifyAll(blockDao);

  transactionDao = new transactionDaoLib(__dirname, mongoClient, redis);
  bluebird.promisifyAll(transactionDao);

  accountDao = new accountDaoLib(__dirname, mongoClient);
  bluebird.promisifyAll(accountDao);

  accountTxDao = new accountTxDaoLib(__dirname, mongoClient);
  bluebird.promisifyAll(accountTxDao);

  stakeDao = new stakeDaoLib(__dirname, mongoClient, redis);
  bluebird.promisifyAll(stakeDao);

  txHistoryDao = new txHistoryDaoLib(__dirname, mongoClient);
  bluebird.promisifyAll(txHistoryDao);

  accountingDao = new accountingDaoLib(__dirname, mongoClient);
  bluebird.promisifyAll(accountingDao);

  checkpointDao = new checkpointDaoLib(__dirname, mongoClient);
  bluebird.promisifyAll(checkpointDao);

  smartContractDao = new smartContractDaoLib(__dirname, mongoClient);
  bluebird.promisifyAll(smartContractDao);

  activeAccountDao = new activeAccountDaoLib(__dirname, mongoClient);
  bluebird.promisifyAll(activeAccountDao);

  totalAccountDao = new totalAccountDaoLib(__dirname, mongoClient);
  bluebird.promisifyAll(totalAccountDao);

  dailyAccountDao = new dailyAccountDaoLib(__dirname, mongoClient);
  bluebird.promisifyAll(dailyAccountDao);

  tokenDao = new tokenDaoLib(__dirname, mongoClient);
  bluebird.promisifyAll(tokenDao);
  
  rewardDistributionDao = new rewardDistributionDaoLib(__dirname, mongoClient);
  bluebird.promisifyAll(rewardDistributionDao);

  tokenSummaryDao = new tokenSummaryDaoLib(__dirname, mongoClient);
  bluebird.promisifyAll(tokenSummaryDao);

  tokenHolderDao = new tokenHolderDaoLib(__dirname, mongoClient);
  bluebird.promisifyAll(tokenHolderDao);


  readPreFeeCronJob.Initialize(progressDao, blockDao, transactionDao);
  let readPreFeeTimer;
  readPreFeeTimer = setInterval(async function () {
    await readPreFeeCronJob.Execute(network_id, readPreFeeTimer);
  }, 1000);

  readBlockCronJob.Initialize(progressDao, blockDao, transactionDao, accountDao, accountTxDao,
    stakeDao, rewardDistributionDao, checkpointDao, smartContractDao, dailyAccountDao,tokenDao, tokenSummaryDao, tokenHolderDao, cacheEnabled, config.maxBlockPerCrawl);
  setTimeout(async function run() {
    await readBlockCronJob.Execute(network_id);
    setTimeout(run, 1000);
  }, 1000);

  readTxHistoryJob.Initialize(transactionDao, txHistoryDao);
  schedule.scheduleJob('Record Transaction History', '0 0 0 * * *', 'America/Tijuana', readTxHistoryJob.Execute);

  accountingJob.InitializeForPTXPrice(accountingDao, config.accounting.coinbase_api_key, config.accounting.wallet_addresses);
  schedule.scheduleJob('Record PTX Price', '0 0 0 * * *', 'Etc/GMT', accountingJob.RecordPTXPrice); // GMT mid-night

  accountingJob.InitializeForPTXEarning(transactionDao, accountTxDao, accountingDao, config.accounting.wallet_addresses);
  schedule.scheduleJob('Record PTX Earning', '0 0 0 * * *', 'America/Tijuana', accountingJob.RecordPTXEarning); // PST mid-night

  accountJob.Initialize(dailyAccountDao, activeAccountDao, totalAccountDao, accountDao);
  activeAccountDao.getLatestRecordsAsync(1)
    .then(() => { }).catch(err => {
      if (err.message.includes('NO_RECORD')) {
        accountJob.Execute();
      }
    })
  schedule.scheduleJob('Record active accounts', '0 0 0 * * *', 'America/Tijuana', accountJob.Execute); // PST mid-night
}






