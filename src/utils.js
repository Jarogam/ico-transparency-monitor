import {getWeb3, getSmartContract} from './utils/web3';
import jQuery from "jquery";
import {default as config} from './config.js';
import {store} from "./index";

const moment = require('moment');

export const toPromise = func => (...args) =>
    new Promise((resolve, reject) =>
        func(...args, (error, result) => (error ? reject(new Error(error.message)) : resolve(result)))
    );

export const formateDate = (datetime , fullFormat = true) => {
    console.log(fullFormat);
    return fullFormat?moment.utc(datetime).format("YYYY-MM-DD HH:mm:ss"):moment.utc(datetime).format("YYYY-MM-DD");

};

export const formatNumber = (number) => {
    if (isNaN(number) || number == undefined)
        return "Not Available";
    if (number === undefined || !number || typeof number !== "number")
        return number;
    return number.toFixed(2).replace(/./g, function (c, i, a) {
        return i && c !== "." && ((a.length - i) % 3 === 0) ? ',' + c : c;
    });
};

export const decisionMatrix = (matrix) => {
    let nonTransparent = [];
    let transparentWithIssues = [];
    matrix.map((question,index)=>{
        // question is important.
        if(question.required && question.notApplicable === false && question.answer === false)
            nonTransparent.push(index);
        else if(question.required === false && question.notApplicable === false && question.answer === false){
            transparentWithIssues.push(index);
        }
    });

    if (nonTransparent.length === 0 && transparentWithIssues.length === 0)
        return ["Transparent" , []];

    else if (nonTransparent.length !== 0)
        return ["Non Transparent", nonTransparent];

    else if (transparentWithIssues.length !== 0)
        return ["With issues", transparentWithIssues];
    else
        return [];
};

Date.prototype.yyyymmdd = function() {
    const mm = this.getMonth() +1;
    const dd = this.getDate();

    return [this.getFullYear(),
        (mm > 9 ? '' : '0') + mm,
        (dd > 9 ? '' : '0') + dd
    ].join('-');
};

export const getEtherPerCurrency = (callback ,currency = "ETH-EUR", date=new Date().yyyymmdd()) => {
    jQuery.ajax({
        url : `https://api.coinbase.com/v2/prices/${currency}/spot?date=${date}`,
        success: function (result) {
            console.log(result);
            callback(result.data.amount , null)
        },
        error: function (err, message) {
            callback(null , err)
        }
    });
};

export const getICOs = ()=>{
    let icos = [];
    const icosObject = config['ICOS'];
    Object.keys(icosObject).map((icoKey) => {
            const ico = icosObject[icoKey]['summary'];
            ico['name'] = icoKey;
            ico['matrix'] = icosObject[icoKey]['matrix'];
            icos.push(ico);
        }
    );
    return icos;

};

const cache = (key , value) => {
  localStorage.setItem(key , JSON.stringify(value));
};

export const getValueOrNotAvailable = (object,input) => {
    return object&&object[input]?object[input]:"Not Available";
};

//TODO: Required Data must be validate.
export const getICOLogs = async(icoName , callback) => {

    if(localStorage.getItem(icoName)){
        console.log(`${icoName} cached already.`);
        return callback(null, JSON.parse(localStorage.getItem(icoName)));
    }

    const ICO = config.ICOS[icoName];

    const customArgs = ICO['event'].hasOwnProperty('customArgs') ? ICO['event'].customArgs : {};

    const address = ICO.address;

    /**
     * Zero index for the smart contract, One index for the constants
     */
    let smartContract = null;
    let event = null;
    try{
        smartContract = getSmartContract(icoName)[0];
        event = smartContract[ICO.event.name](customArgs, {fromBlock: 0, toBlock: 'latest'});

    }catch(error){
        store.dispatch({ type: 'SHOW_MODAL_ERROR',message :`Cant read smart Contract for ${icoName} from RPC Host url ${config.rpcHost}.` })
        return;
    }

    jQuery.ajax({
        type: "POST",
        url: config.rpcHost,
        Accept: "application/json",
        contentType: "application/json",
        data: JSON.stringify({
            "id": 1497353430507566,
            "jsonrpc": "2.0",
            "params": [{
                "fromBlock": event.options.fromBlock, "toBlock": event.options.toBlock,
                "address": address,
                "topics": event.options.topics
            }]
            , "method": "eth_getLogsDetails"
        }),
        success: (e) => {
            let res = e.result;
            if(res.length === 0) {
                store.dispatch({type: 'SHOW_MODAL_MESSAGE', message: `Empty result`})
                callback('Empty result', res);
            }else{
                const logsFormated = res.map(function (log) {
                    return event.formatter ? event.formatter(log) : log;
                });
                console.log(logsFormated)
                // cache(icoName,logsFormated);
                callback(null, logsFormated);

            }
        },
        error:(status, error)=>{
            store.dispatch({ type: 'SHOW_MODAL_ERROR',message :`Error ${status}` })
        },
        dataType: 'json'
    });
};

export const initStatistics = () => {
    return {
        general: {
            transactionsCount: 0
        },
        time: {
            startDate: null,
            endDate: null
        },
        investors: {
            numberInvestorsMoreThanOne100kEuro: 0,
            numberInvestorsBetween5to100kEruo: 0,
            numberInvestorsLessThan500K: 0,
            numberInvestorsWhoInvestedMoreThanOnce: 0,
            maxInvestmentsMoney: 0,
            maxInvestmentsTokens: 0,
            minInvestments: Number.MAX_SAFE_INTEGER,
            senders: {}
        },
        money: {
            tokenIssued: 0,
            totalETH: 0,
        },
        charts: {
            tokensCount: null,
            tokensAmount: null,
            invetorsDistribution: null,
            investmentDistribution: null,
        }
    };
};

export const prepareStatsInvestment = (senders , currencyPerEther) => {

    let investors = initStatistics().investors;
    investors.senders = senders;

    for (let [key, value] of Object.entries(senders)) {

        let currencyValue = value['ETH'] * parseFloat(currencyPerEther);
        if (currencyValue > 100000)
            investors.numberInvestorsMoreThanOne100kEuro += 1;
        if (currencyValue > 5000 && currencyValue < 100000)
            investors.numberInvestorsBetween5to100kEruo += 1;
        if (currencyValue < 5000)
            investors.numberInvestorsLessThan500K += 1;
        if (value['times'] > 1)
            investors.numberInvestorsWhoInvestedMoreThanOnce += 1;

        if (currencyValue > investors.maxInvestmentsMoney) {
            investors.maxInvestmentsMoney = currencyValue;
            investors.maxInvestmentsTokens = value['tokens']
        }

        if (value['ETH'] < investors.minInvestments)
            investors.minInvestments = value['ETH'];
    }
    return investors;
};

const calculateTicks = (max) =>{
    let tick = 0.001;
    let ticks = [];
    ticks.push(tick);
    while (tick < max) {
        tick *= 10;
        ticks.push(tick);
    }

    return ticks;
};

export const kFormatter= (num) => {
    const ranges = [
        { divider: 1e18 , suffix: 'P' },
        { divider: 1e15 , suffix: 'E' },
        { divider: 1e12 , suffix: 'T' },
        { divider: 1e9 , suffix: 'G' },
        { divider: 1e6 , suffix: 'M' },
        { divider: 1e3 , suffix: 'k' }
    ];

    for (let i = 0; i < ranges.length; i++) {
        if (num >= ranges[i].divider) {
            return (num / ranges[i].divider).toString() + ranges[i].suffix;
        }
    }
    return num.toString();

};

export const getDistributedDataFromDataset = (ethersDataset = [] , currencyPerEther = 1)=>{
    let min = Number.MAX_SAFE_INTEGER;
    let max = 0;

    //investors
    let chartInvetorsDistibution = [];

    //investment
    let chartInvestmentDistibution = [];

    ethersDataset.map((item , index)=>{
        item = item*currencyPerEther;
        if (item > max) max = item;
    });
    const ticks = calculateTicks(max);

    ticks.map((tick)=> {
        if(tick !== 0) chartInvetorsDistibution.push({name:`x<${kFormatter(tick)}`,Investors:0 , key:tick })
        if(tick !== 0) chartInvestmentDistibution.push({name:`x<${kFormatter(tick)}`,Investments:0 , key:tick })
    });

    for (let i = 0 ; i < ethersDataset.length ; i++){
        const money = ethersDataset[i]*currencyPerEther;
        for(let j =0 ; j < chartInvetorsDistibution.length ;j++){
            if ( money < chartInvetorsDistibution[j].key){
                chartInvetorsDistibution[j].Investors+= 1;
                break;
            }
        }
    }
    for (let i = 0 ; i < ethersDataset.length ; i++){
        const money = ethersDataset[i]*currencyPerEther;
        for(let j =0 ; j < chartInvestmentDistibution.length ;j++){
            if ( (ethersDataset[i]*currencyPerEther) < chartInvestmentDistibution[j].key){
                chartInvestmentDistibution[j].Investments+=parseFloat(money.toFixed(2));
                break;
            }
        }
    }


    return [ chartInvetorsDistibution , chartInvestmentDistibution];
};

const getFilterFormat = (startTimestamp , endTimestamp) => (event) => {

    const duration = moment.duration(moment(new Date(endTimestamp *1000)).diff(moment(new Date(startTimestamp *1000))));
    const daysNumber = duration._data.days;

    if (daysNumber === 0)
        return event.blockNumber;

    else if (daysNumber === 1) {
        const datetime = new Date(event.timestamp * 1000);
        return formateDate(datetime , false)//`${datetime.getHours()} ${datetime.getDate()}/${datetime.getMonth() + 1}/${datetime.getFullYear()}`;

    }else if (daysNumber > 1) {
        const datetime = new Date(event.timestamp * 1000);
        return formateDate(datetime , false)//`${datetime.getDate()}/${datetime.getMonth() + 1}/${datetime.getFullYear()}`;
    }

};

export const getStatistics = (selectedICO ,events, statisticsICO, currencyPerEther) => {
    const web3 = getWeb3();
    const factor = selectedICO.hasOwnProperty('decimal') ? 10 ** selectedICO['decimal'] : 10 ** config['defaultDecimal'];

    statisticsICO.general.transactionsCount = this.length;

    let chartAmountTemp = {};
    let chartTokenCountTemp = {};

    let ethersDataset =[];

    const format = getFilterFormat(events[0].timestamp , events[events.length -1].timestamp);

    events.map((item) => {

        const tokenValue = item.args[selectedICO.event.args.tokens].valueOf() / factor;
        let etherValue = web3.fromWei(item.value, "ether").valueOf();

        const investor = item.args[selectedICO.event.args.sender];

        let blockDate = format(item);

        if (chartTokenCountTemp[blockDate] == undefined)
            chartTokenCountTemp[blockDate] = 0;

        chartTokenCountTemp[blockDate] += 1;

        if (chartAmountTemp[blockDate] == undefined)
            chartAmountTemp[blockDate] = 0;


        chartAmountTemp[blockDate] += tokenValue;

        let senders = statisticsICO.investors.senders;

        if (senders[investor] == undefined)
            senders[investor] = {tokens: 0, ETH: 0 , times: 0};

        senders[investor]['ETH'] += parseFloat(etherValue);
        senders[investor]['tokens'] += parseFloat(tokenValue);
        senders[investor]['times'] += parseFloat(etherValue) >1?+1:+0;
        ethersDataset.push(parseFloat(etherValue));

        statisticsICO.money.totalETH += parseFloat(etherValue);
        statisticsICO.money.tokenIssued += parseFloat(tokenValue);
    });

    statisticsICO.charts.tokensAmount= [];
    statisticsICO.charts.tokensCount= [];

    Object.keys(chartAmountTemp).map((key)=> {
        statisticsICO.charts.tokensAmount.push({
            name: key,
            'Tokens/Time': parseFloat(chartAmountTemp[key].toFixed(2)),
            amt: chartAmountTemp[key]
        })
    });

    Object.keys(chartAmountTemp).map((key)=>statisticsICO.charts.tokensCount.push({name: key, 'Transactions/Time': parseFloat(chartTokenCountTemp[key].toFixed(2)), amt: chartTokenCountTemp[key]}));

    statisticsICO.investors = prepareStatsInvestment(statisticsICO.investors.senders , currencyPerEther);


    const startTime = new Date(events[0].timestamp*1000);
    statisticsICO.time.startDate = formateDate(startTime);

    const endTime = new Date(events[events.length-1].timestamp*1000);
    statisticsICO.time.endDate = formateDate(endTime );
    const duration = moment.duration(moment(endTime).diff(moment(startTime)));

    statisticsICO.time.durationDays=duration.get("days");
    statisticsICO.time.duration=
            `
            ${duration.get("years") >0 ? duration.get("years") + " Years":""}
            ${duration.get("months") >0 ? duration.get("months") + " Months":""}
            ${duration.get("days") >0 ? duration.get("days") + " Days":""}

            ${duration.get("hours") >0 ? duration.get("hours") + " Hours":""}
            ${duration.get("minutes") >0 ? duration.get("minutes") + " Minutes":""}
            ${duration.get("seconds") >0 ? duration.get("seconds") + " Seconds":""}`;

    //Initialize the chart of investors by ether value
    statisticsICO.etherDataset = ethersDataset;
    const distribution = getDistributedDataFromDataset(ethersDataset);
    statisticsICO.charts.invetorsDistribution = distribution[0];
    statisticsICO.charts.investmentDistribution = distribution[1];
    return statisticsICO;
};
