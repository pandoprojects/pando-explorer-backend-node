
# Explorer application Backend

## About Explorer Application

The Pando Explorer project contains a backend api application to provide data to the frontend, and a blockchain data crawler to download data from the blockchain., please visit https://explorer.pandoproject.org/.


**URL of explorer frontend code is** : https://github.com/pandoprojects/pando-explorer-backend-node

## How to launch the project (Backend) on your local system

#### Take clone of this repo in your system and run following command

## Blockchain Data Crawler

### Setup
The job of blockchain data crawler is to download and convert the blockchain data to a format more friendly for blockchain data exploration. In our current implementation, it uses a NoSQL database MongoDB to store the converted data. Thus we need to install MongoDB first. Below is the instruction to install MongoDB on Ubuntu Linux. For more information on installing MongoDB on different systems, please [check here.](https://www.mongodb.com/docs/manual/administration/install-community/)

```

wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -

echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list

sudo apt-get update

sudo apt-get install -y mongodb-org
```

Start MongoDB, by using following command.

```
sudo systemctl start mongod
```

After starting MongoDB, we can setup the config for crawler with the following commands.
```
cd backend/crawler
npm install
mv config.cfg.template config.cfg
```

Now the config.cfg file is created, change **blockchain.startHeight** in config file to the snapshot height on the theta node. After setting the config file and start height, we can run crawler using this command.
```
node run.js

```

Now the crawler starts to read the data from blockchain, perform necessary transformation, and stores the converted data in the database. Next we can launch the backend API microservice, and the frontend application microservice following the procedure below.

## Backend API Application

### Setup
```
cd backend/explorer-api
npm install
mv config.cfg.template config.cfg
node run
```

Now the explorer API application is running at http://localhost:4022


## Now update the  project Database

address= localhost.

port=27017.

dbName: explorerDB.


For more detail about projects please go thourgh our [official Documenation](https://docs.pandoproject.org/)

## API Reference
This is the Explorer API reference link [Click here](https://chainapi.pandoproject.org/#b8aa0cf5-dd39-4cd3-985d-615d8ff1de49)

License
The Explorer backend application reference implementation is licensed under the [GNU License](https://github.com/pandoprojects/pando-explorer-backend-node/blob/main/LICENSE)
