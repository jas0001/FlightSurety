import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
let oracles = 20;
let registeredOracles = [];
let STATUS_CODES = [0, 10, 20, 30, 40, 50];

web3.eth.getAccounts((error, accounts) => {
  for(let i = 0; i < oracles; i++) {
    flightSuretyApp.methods.registerOracle()
    .send({from: accounts[i], value: web3.utils.toWei("1",'ether'), gas: 6721975}, (error, result) => {
      flightSuretyApp.methods.getMyIndexes().call({from: accounts[i]}, (error, result) => {
        let oracle = {
          address: accounts[i],
          index: result
        };
        registeredOracles.push(oracle);
        console.log("ORACLE REGISTERED: " + JSON.stringify(oracle));
      });
    });
  };
});

flightSuretyApp.events.OracleRequest({
  fromBlock: 0
}, function (error, event) {
    let index = event.returnValues.index;
    let airline = event.returnValues.airline;
    let flight = event.returnValues.flight;
    let timestamp = event.returnValues.timestamp;
    let statusCode = STATUS_CODES[Math.floor(Math.random() * STATUS_CODES.length)]
    
    for(let i = 0; i < registeredOracles.length; i++) {
      if(registeredOracles[i].index.includes(index)) {
        flightSuretyApp.methods.submitOracleResponse(index, airline, flight, timestamp, statusCode)
        .send({from: registeredOracles[i].address, gas: 6721975}, (error, result) => {
          console.log("FROM " + JSON.stringify(registeredOracles[i]) + "STATUS CODE: " + statusCode);
        });
      }
    }
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


