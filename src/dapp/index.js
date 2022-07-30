
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });
        
        contract.airlines.forEach(airline => {
            var opt = document.createElement('option');
            opt.value = airline;
            opt.innerHTML = airline;
            DOM.elid('airline').appendChild(opt);
        });
        contract.passengers.forEach(passenger => {
            var opt = document.createElement('option');
            opt.value = passenger;
            opt.innerHTML = passenger;
            DOM.elid('passenger').appendChild(opt);
        });
        // User-submitted transaction
        DOM.elid('btn-submit-oracle').addEventListener('click', () => {            
            let flight = DOM.elid('flight').value;           
            // Write transaction
           contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })  
    });
    //Register airline
    DOM.elid('btn-register-airline').addEventListener('click', () => {
        let airline = DOM.elid('airline').value;
        let name = DOM.elid('name').value;
        contract.registerAirline(airline,name, (error, result) => {
            display('Airlines', 'Register airlines', [ { label: 'Airline Registration', error: error, value: result} ]);
        })
    });
     //Fund airline
     DOM.elid('btn-fund-airline').addEventListener('click', () => {
        let airline = DOM.elid('airline').value;
        contract.fundAirline(airline, (error, result) => {
            display('Airlines', 'Fund airlines', [ { label: 'Fund Registration', error: error, value: result} ]);
        })
    });
    //Register flight
    DOM.elid('btn-register-flight').addEventListener('click', () => {        
        let airline = DOM.elid('airline').value;
        let flight = DOM.elid('flight').value;
        let timestamp = 1649129486;
        contract.registerFlight(airline, flight, timestamp, (error, result) => {
            display('Flight', 'Register Flight', [ { label: 'Register Flight', error: error, value: result} ]);
        });
    });
    //Buy insurance
    DOM.elid('btn-buy-insurance').addEventListener('click', () => {
        let amount = DOM.elid('amount').value;
        let passenger = DOM.elid('passenger').value;
        let airline = DOM.elid('airline').value;
        let flight = DOM.elid('flight').value;
        let timestamp = 1649129486;
        contract.buy(airline, flight, timestamp, amount, passenger, (error, result) => {
            display('Insurance', 'Buy Insurance', [ { label: 'Buy Insurance', error: error, value: result} ]);
        });
    });

})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







