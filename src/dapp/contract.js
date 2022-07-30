import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.appAddress = config.appAddress; 
        this.dataAddress = config.dataAddress;       
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.initialize(callback);
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }            

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }    
    buy(airline, flight, timestamp, amount, passenger, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .buy(airline, flight, timestamp)
            .send({ from: passenger, gas: 6721900, value: this.web3.utils.toWei(amount, 'ether') }, callback);
    }    
    registerAirline(airline, name, callback) {
        let self = this;      
     
        self.flightSuretyApp.methods
            .registerAirline(airline, name, self.owner)
            .send({ from: self.owner , gas: 6721900}, callback);
    }
    fundAirline(airline, callback) {
        let self = this;      
        let fundAmount = this.web3.utils.toWei("10", "ether");    
        self.flightSuretyData.methods
            .fund(airline)
            .send({ from: airline , gas: 6721900, value: fundAmount}, callback);
    }
    registerFlight(airline, flight, timestamp, callback) {
        let self = this;
        self.flightSuretyData.methods
            .registerFlight(airline, flight, timestamp)
            .send({ from: airline, gas: 6721900}, callback);
    }
}