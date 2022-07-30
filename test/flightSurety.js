
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const Web3 = require('web3');

contract('Flight Surety Tests', async (accounts) => {
        const TEST_ORACLES_COUNT = 30;
        const STATUS_CODE_UNKNOWN = 0;
        const STATUS_CODE_ON_TIME = 10;
        const STATUS_CODE_LATE_AIRLINE = 20;
        const STATUS_CODE_LATE_WEATHER = 30;
        const STATUS_CODE_LATE_TECHNICAL = 40;
        const STATUS_CODE_LATE_OTHER = 50;
    var config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);   
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/  
    it(`(multiparty) has correct initial isOperational() value`, async function () {

        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();   
        assert.equal(status, true, "Incorrect initial operating status value");

    });
    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

        // Ensure that access is denied for non-Contract Owner account
        let accessDenied = false;
        try 
        {
            await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
        }
        catch(e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
    });

    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

        // Ensure that access is allowed for Contract Owner account
        let accessDenied = false;
        try 
        {
            await config.flightSuretyData.setOperatingStatus(false);
        }
        catch(e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
        
    });

    it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

        await config.flightSuretyData.setOperatingStatus(false);

        let reverted = false;
        try 
        {
            await config.flightSurety.setTestingMode(true);
        }
        catch(e) {
            reverted = true;
        }
        assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

        // Set it back for other tests to work
        await config.flightSuretyData.setOperatingStatus(true);

    });
    it('(airline) first airline is registered when deployed', async () => {
        let result = await config.flightSuretyData.isAirlineRegistered.call(accounts[0]);
        
        // ASSERT
        assert.equal(result, true, "First airline not registered when contract is deployed");
    });
    it('(flight) register flight for an airline', async () => {
        let result = await config.flightSuretyData.isFlightRegistered.call(
            await config.flightSuretyData.getFlightKey(accounts[0], "Flight 22",  1478431966 )); 
        // ASSERT    
        assert.equal(result, false, "Flight is already registered"); 

        // Register flight   
        await config.flightSuretyData.registerFlight(accounts[0], "Flight 22",  1478431966 );   
       
        let result2= await config.flightSuretyData.isFlightRegistered.call(
            await config.flightSuretyData.getFlightKey(accounts[0], "Flight 22",  1478431966 ));  
        // ASSERT    
        assert.equal(result2, true, "Flight is not registered");
    });
    it('(airline) register next 3 airlines by existing airlines (airline must be funded to register)', async () => {
        let fundAmount = new BigNumber(web3.utils.toWei("10", "ether"));    
        
        let result = false;
        let result1 = false;
        let result2 = false;
        // ACT       
        //Second airline is registered by first (default) airline 
        try{
            await config.flightSuretyData.registerAirline(accounts[1], "Airline 2",  accounts[0]);
        }catch (e) {
            result = true;
        }
        //Fund second airline  
        await config.flightSuretyData.fund(accounts[1],{value: fundAmount});
        //Third airline is registered by second airline 
        try{
            await config.flightSuretyData.registerAirline(accounts[2], "Airline 3",  accounts[1]);
        }catch (e) {
            result1 = true;
        }
        //Fund third airline  
        await config.flightSuretyData.fund(accounts[2],{value: fundAmount});
        //Fourth airline is registered by second airline 
        try{
            await config.flightSuretyData.registerAirline(accounts[3], "Airline 4",  accounts[1]);
        }catch (e) {
            result2 = true;
        }        
        
        // ASSERT    
        assert.equal(result, false, "Second airline is not registered by first (default) airline");
        assert.equal(result1, false, "Third airline is not registered by second airline");
        assert.equal(result2, false, "Fourth airline is not registered by third airline");
    });
    
    it('(airline) unfunded airline cannot register new airline', async () => {
        let result = false;
        // ACT       
        //Try to register airline by undfunded airline 
        try{
            await config.flightSuretyData.registerAirline(accounts[5], "Airline 5",  accounts[3]);
        }catch (e) {
            result = true;
        }        
        // ASSERT    
        assert.equal(result, true, "Unfunded airline can register new airline");
    });
    it('(airline) unregistered airline cannot register new airline', async () => {
        let result = false;
        // ACT       
        //Try to register airline by unregistered airline 
        try{
            await config.flightSuretyData.registerAirline(accounts[5], "Airline 6",  accounts[6]);
        }catch (e) {
            result = true;
        }        
        // ASSERT    
        assert.equal(result, true, "Unregistered airline can register new airline");
    });
   
    it('(airline) Fifth airline cannot be registered without multi-party consensus', async () => { 
       
        // ACT  
        //Try to register fifth airline without mulit-party consensus 
        await config.flightSuretyData.registerAirline(accounts[4], "Airline 5", accounts[0]);
        
        let result= await config.flightSuretyData.isAirlineRegistered.call(accounts[4]);
        // ASSERT          
        assert.equal(result, false, "Fifth airline can be registered without mulit-party consensus");
    });
    it('(airline) Fifth airline can be registered with multi-party consensus', async () => {   
        //let calls=  await config.flightSuretyData.numOfCalls.call(accounts[27]);
        //console.log(calls);
        //let airlines=  await config.flightSuretyData.numOfAirlines();
        //console.log(airlines);         
       //Third airline has not yet called registerAirline 
        await config.flightSuretyData.registerAirline(accounts[4], "Airline 5", accounts[2]);  
        let result= await config.flightSuretyData.isAirlineRegistered.call(accounts[4]);     
        // ASSERT          
        assert.equal(result, true, "Fifth airline cannot be registered with mulit-party consensus");
    }); 
    it('(passenger) Can buy insurance once for each flight for value of up to 1 ether ', async()=>{
        let passenger1 = accounts[25];
        let passenger2 = accounts[21];

        let value1 = web3.utils.toWei('2', "ether");
        let value2 = web3.utils.toWei('1', "ether");
        let key=await config.flightSuretyData.getFlightKey(accounts[0], "Flight 22",  1478431966);
        let result=false;
        let result1=false;
        let result2=false;
        //ACT
        try {
            await config.flightSuretyData.buy(accounts[0],key, {from: passenger1, value: value2});
        }catch (e) {
            result = true;
        }
        try {
            await config.flightSuretyData.buy(accounts[0],key, {from: passenger2, value: value1});
        }catch (e) {
            result1 = true;
        }
        try {
            await config.flightSuretyData.buy(accounts[0],key, {from: passenger1, value: value2});
        }catch (e) {
            result2 = true;
        }
        // ASSERT
        assert.equal(result, false, "Unable to buy insurance");
        assert.equal(result1, true, "Can buy insurance for more than 1 ether");    
        assert.equal(result2, true, "Can buy insurance twice for same flight");
    });
    it('(passenger) credit and pay insured passengers ', async()=>{
        let passenger1 = accounts[6];
        let passenger2 = accounts[7];

        let value1 = web3.utils.toWei('0.5', "ether");
        let value2 = web3.utils.toWei('1', "ether");
        let key=await config.flightSuretyData.getFlightKey(accounts[0], "Flight 22",  1478431966);
        let result=false;
        let result1=false;
        let result2=false;
        let result5=false;
        //Check balance before buy insurance
        let balance = await web3.eth.getBalance(passenger1);
        console.log("Balance before buy passenger1: " + balance);
        //ACT
        //Buy insurance
        try {
            await config.flightSuretyData.buy(accounts[0],key, {from: passenger1, value: value2});
        }catch (e) {
            result = true;
        }
        try {
            await config.flightSuretyData.buy(accounts[0],key, {from: passenger2, value: value1});
        }catch (e) {
            result1 = true;
        }
        let balance1 = await web3.eth.getBalance(passenger1);
        console.log("Balance after buy passenger1: " + balance1); 
        //Credit passengers
        try {
            await config.flightSuretyData.creditInsurees(key);
        }catch (e) {
            result2 = true;
        }
        //Confirm credited
        let result3 = await config.flightSuretyData.checkIsCredited(key,passenger1);
        let result4 = await config.flightSuretyData.checkIsCredited(key,passenger2);
        console.log("Passenger1 has been credited: " + result3);
        console.log("Passenger2 has been credited: " + result4);
        //Check balance before payout
        let balance2 = await web3.eth.getBalance(passenger1);
        console.log("Balance after credited passenger1: " + balance2);    
        //pay passenger1
        try {
            await config.flightSuretyData.pay(key, passenger1,{from: passenger1});
        }catch (e) {
            result5 = true;
        }
        let balance3 = await web3.eth.getBalance(passenger1);
        console.log("Balance after pay passenger1: " + balance3);
        // ASSERT
        assert.equal(result, false, "Unable to buy insurance");
        assert.equal(result1, false, "Unable to buy insurance"); 
        assert.equal(result2, false, "Cannot credit insurees");
        assert.equal(result5, false, "Cannot pay insurees");
    });
});
