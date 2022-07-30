// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address payable contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    //Number of required keys   
    uint constant M = 4;
    //For multiparty consensus 
    uint counterForM = 0;
    //Counter for number of calls to register airline
    uint counterForCalls = 0;
    //N should be 50% of number of registred keys   
    uint256 constant PERCENTAGE_OF_N = 50; 
    //Funding of airline participants should be 10 ether
    uint256 constant REGISTRATION_FEE = 10 ether;
   
    //Struct for airline
    struct Airline{
        string airlineName;
        address airline;
        bool isRegistered;
        bool isFunded;
    }  
    //Struct for flight
    struct Flight {
        string flight;
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
    }
    struct Insurance{    
        bytes32 flightKey;
        address payable passenger;
        uint insuranceValue;       
        bool isCredited;
        bool isPayed;
    } 
    //Struct for mulit-consensus votes
    struct Caller{
        address callerAirline;
        address airlineToRegister;
        bool hasCalled;
    }
    //Bool for if a passenger has bought incurance for a flight or not
    bool private isInsured = false; 
    
     //Mapping for registered airlines     
     mapping(address => Airline) private registeredAirlines;

     //Mapping for registered flights     
     mapping(bytes32 => Flight) private registeredFlights;

     //Mapping for purchased insurances     
     mapping(bytes32 => Insurance[]) private registeredInsurances;
    
     //Authorized contracts     
     mapping(address => uint256) private authorizedContracts;

     //Mapping for registered airlines     
     mapping(address => Caller[]) private callerAirlines;
   
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor(address _airline) public 
    {
        contractOwner = payable(_airline);  
        //First airline registration
         registeredAirlines[_airline] = Airline({
            airlineName: "Airline1",
            airline: _airline,
            isRegistered: true,   
            isFunded: true
         });
        //Increment counter for num of registred airlines
         counterForM = counterForM.add(1);
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }
    /*modifier requireAuthorizeCaller()
    {
        require(authorizedContracts[msg.sender] == 1, "Caller is not authorized contract");
        _;
    }*/
   
    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/
    /**
    * @dev Check if an airline is registered
    *
    * @return A bool that indicates if the airline is registered
    */   
    function isAirlineRegistered(address _airline ) external view returns(bool)
    {
        return registeredAirlines[_airline].isRegistered;
    }
    /**
    * @dev Check if an airline is funded
    *
    * @return A bool that indicates if the airline is funded
    */   
    function isAirlineFunded(address _airline ) external view returns(bool)
    {
        return registeredAirlines[_airline].isFunded;
    }
     /**
    * @dev Check if a flight is registered
    *
    * @return A bool that indicates if the flight is registered
    */   
    function isFlightRegistered(bytes32 _flight ) external view returns(bool)
    {
        return registeredFlights[_flight].isRegistered;

    }    
    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() public view returns(bool) 
    {
        return operational;
    }   

    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus(bool mode) external
                            requireContractOwner 
    {
        operational = mode;
    }

      /**
    * @dev Authorize a contract to make calls
    *
    * 
    */      
    function authorizeCaller(address authorizedContract) requireContractOwner external
    {
        authorizedContracts[authorizedContract] = 1;
    }

    /**
    * @dev De-authorize a contract to make calls
    *
    * 
    */      
    function deauthorizeCaller(address deauthorizedContract) requireContractOwner external
    {
        delete authorizedContracts[deauthorizedContract];
    }
    /**
    * @dev Get number of calls for register airline
    *
    * @return number of calls to register airline 
    */      
    function numOfAirlines() public view returns(uint) 
    {
        return counterForM;
    }   
   /**
    * @dev Get number of calls for register airline
    *
    * @return number of calls to register a specific airline
    */      
    function numOfCalls(address _airline) public view returns(uint) 
    {
        uint counter=0;
        for (uint i=0; i < callerAirlines[_airline].length; i++) {
            if(callerAirlines[_airline][i].hasCalled == true)
                counter=counter.add(1);
         }    
         return counter;
    }       
    /**
    * @dev Get number of calls for register airline
    *
    * @return number of calls to register a specific airline
    */      
    function callerHasCalled(address _airline, address _caller) public view returns(bool) 
    {
        for (uint i=0; i < callerAirlines[_airline].length; i++) {
            if(callerAirlines[_airline][i].hasCalled == true && callerAirlines[_airline][i].callerAirline == _caller)
                return true;
         }    
         return false;
    }       
    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *  
    */   
    function registerAirline(address _airline, string memory _name, address _origin) 
    external 
    requireIsOperational 
    returns (bool toReturn)
    {
        //Check if airline is alredy registred
        require(!registeredAirlines[_airline].isRegistered, "Airline is already registered.");
        //Caller must be registred airline
        require(registeredAirlines[_origin].isRegistered, "Caller is not a registred airline.");
        //Caller must be funded
        require(registeredAirlines[_origin].isFunded, "Caller is not a funded.");
        
        if(counterForM < M){        
            //Ok to register the new airline
            registeredAirlines[_airline] = Airline({
                airline: _airline,
                airlineName:_name,
                isRegistered: true,
                isFunded: false
            });   
             //Increment counter for num of registred airlines
            counterForM = counterForM.add(1);
            toReturn = true;
        }       
        else if(counterForM >= M){
             //Mulit-party consensus required
             //Caller cannot already have called this function for this airline
             require(!callerHasCalled(_airline, _origin), "Caller has already called this function.");  
            //Calling airline has now called the function           
            //Add calling airline to Caller
            callerAirlines[_airline].push(Caller({
                callerAirline: _origin,
                airlineToRegister: _airline,
                hasCalled: true
            }));  
            
            counterForCalls = numOfCalls(_airline);

            //Check if enough calls to register airline
            if(counterForCalls >= counterForM.mul(PERCENTAGE_OF_N).div(100)){
                  //Ok to register the new airline
                    registeredAirlines[_airline] = Airline({
                        airline: _airline,
                        airlineName:_name,
                        isRegistered: true,
                        isFunded: false
                    });
                     //Increment counter for num of registred airlines
                    counterForM = counterForM.add(1);  
                    //When the airline has been registered 
                    //Reset hasCalled for this airline      
                    for (uint i=0; i < callerAirlines[_airline].length; i++) {
                         callerAirlines[_airline][i].hasCalled=false;
                    }    
                }  
                   
                    toReturn = true;
            }
            else
                 toReturn = false;
    return toReturn;
    }     
       
    /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight(address _airline, string memory _flight, uint256 _timestamp) external 
    returns(bool)
    {
        require(registeredAirlines[_airline].isRegistered, "Airline is not registered."); 
        bytes32 flightKey = getFlightKey(_airline, _flight, _timestamp);
        require(!registeredFlights[flightKey].isRegistered, "Flight is already registered.");   
        //Airline must be funded
        require(registeredAirlines[_airline].isFunded, "Airline is not a funded.");

        registeredFlights[flightKey] = Flight({
            flight: _flight,
            isRegistered: true,
            statusCode: 0,
            updatedTimestamp: block.timestamp,
            airline: _airline
        });    

        return true; 
    }
    /**
    * @dev Update statuscode for flight
    *
    */  
    function updateStatusCodeFlight(address _airline, bytes32 _key, uint8 _code) external     
    {
        require(registeredAirlines[_airline].isRegistered, "Airline is not registered.");         
        require(registeredFlights[_key].isRegistered, "Flight is not registered.");   

        registeredFlights[_key].statusCode = _code;  
    }    
   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy(address _airline, bytes32 _flightKey) external payable
    requireIsOperational
    returns(bool)
    {
        require(registeredAirlines[_airline].isRegistered, "Airline is not registered.");  
        require(registeredFlights[_flightKey].isRegistered, "Flight is not registered.");         
        require(msg.value <= 1 ether, "Insurance value cannot exeed 1 ether");
        setIsInsured(_airline, _flightKey, tx.origin);//msg.sender);
        require(!isInsured, "Passenger has already bought insurance for this flight");
        
            registeredInsurances[_flightKey].push(Insurance({
                flightKey: _flightKey,
                passenger: payable(tx.origin),
                insuranceValue: msg.value,
                isCredited: false,
                isPayed: false
            }));   

            return true;
    }
    /**
    * @dev Check if passenger has bought insurance for a specific flight
    *
    */   
    function getIsInsured(address _airline, bytes32 _flightKey, address _passenger) internal view 
            requireIsOperational
    returns(bool)
    {
            require(registeredAirlines[_airline].isRegistered, "Airline is not registered.");  
            require(registeredFlights[_flightKey].isRegistered, "Flight is not registered.");        
            /*Check if passenger already has bought insurance for this flight */
            for (uint i=0; i < registeredInsurances[_flightKey].length; i++) {
                if (_passenger == registeredInsurances[_flightKey][i].passenger) {
                    return true;
                }    
            }
            return false;
    }
    /**
    * @dev Set isInsured
    *
    */   
     function setIsInsured(address _airline, bytes32 _flightKey, address _passenger) internal  
            requireIsOperational    
    {
        
            require(registeredAirlines[_airline].isRegistered, "Airline is not registered.");  
            require(registeredFlights[_flightKey].isRegistered, "Flight is not registered.");        
            isInsured=getIsInsured(_airline, _flightKey, _passenger);
    }
    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees(bytes32 _flightKey) external 
    requireIsOperational
    {
        require(registeredInsurances[_flightKey].length > 0, "No existing insurances for this flight");

        for (uint i=0; i < registeredInsurances[_flightKey].length; i++) {
            registeredInsurances[_flightKey][i].isCredited = true;
        }
    }
    /**
     *  @dev Credits payouts to insurees
    */
    function checkIsCredited(bytes32 _flightKey, address _passenger) external view
    requireIsOperational
    returns(bool)
    {
        require(registeredInsurances[_flightKey].length > 0, "No existing insurances for this flight");

        for (uint i=0; i < registeredInsurances[_flightKey].length; i++) {
          if (_passenger == registeredInsurances[_flightKey][i].passenger &&
            registeredInsurances[_flightKey][i].isCredited == true) {  
                    return true;
                }    
            }
            return false;
    }
   
    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay(bytes32 _flightKey, address _passenger) external 
        requireIsOperational  
        returns(bool)  
    {
     require(registeredInsurances[_flightKey].length > 0, "No existing insurances for this flight");
       
      
        for (uint i=0; i < registeredInsurances[_flightKey].length; i++) {
            if (_passenger == registeredInsurances[_flightKey][i].passenger && 
                !registeredInsurances[_flightKey][i].isPayed && 
                registeredInsurances[_flightKey][i].isCredited){
                uint amountToPay = registeredInsurances[_flightKey][i].insuranceValue.div(2);
                amountToPay = amountToPay.add(registeredInsurances[_flightKey][i].insuranceValue);
                registeredInsurances[_flightKey][i].isPayed = true;
                registeredInsurances[_flightKey][i].passenger.transfer(amountToPay);
                return true;
            }                 
        }      
        return false;  
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund(address _airlineToFund) public payable requireIsOperational    
    {
        //Check if airline is registred
        require(registeredAirlines[_airlineToFund].isRegistered, "Airline must first be registred");       
        //Check if airline is registred
        require(!registeredAirlines[_airlineToFund].isFunded, "Airline is already funded");  
        require(msg.value >= REGISTRATION_FEE, "Not enough ether recieved");
        contractOwner.transfer(REGISTRATION_FEE);
        //Set airline to funded
        registeredAirlines[_airlineToFund].isFunded = true;
    }

    function getFlightKey(address airline, string memory flight, uint256 timestamp)
                        public
                        pure                        
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    fallback() external payable {}
    receive() external payable {}

}

