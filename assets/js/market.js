/* ==========================================================
   NEXORA AI
   MARKET ENGINE
   Version 1.0.0
   ========================================================== */

import client from "./client.js";
import {
    API_PRIORITY,
    MARKETS,
    DEFAULT_MARKET
} from "./config.js";

/* ==========================================================
   MARKET ENGINE
   ========================================================== */

class MarketEngine {

    constructor(){

        this.defaultMarket = DEFAULT_MARKET;

        this.currentMarket = DEFAULT_MARKET;

        this.marketStatus = new Map();

        this.symbolCache = new Map();

        this.companyCache = new Map();

    }

    /* ==========================================
       ACTIVE MARKET
    ========================================== */

    setMarket(market){

        if(!MARKETS[market]){

            throw new Error(

                `Unknown market : ${market}`

            );

        }

        this.currentMarket = market;

    }

    getMarket(){

        return this.currentMarket;

    }

    /* ==========================================
       MARKET INFORMATION
    ========================================== */

    marketInfo(market = this.currentMarket){

        return MARKETS[market];

    }

    /* ==========================================
       SYMBOL FORMATTER
    ========================================== */

    normalizeSymbol(

        symbol,

        market = this.currentMarket

    ){

        symbol = symbol.trim().toUpperCase();

        switch(market){

            case "BIST":

                if(!symbol.endsWith(".IS")){

                    return `${symbol}.IS`;

                }

                return symbol;

            case "NASDAQ":

            case "NYSE":

            case "AMEX":

            case "OTC":

                return symbol.replace(".IS","");

            default:

                return symbol;

        }

    }

    /* ==========================================
       COMPANY CACHE
    ========================================== */

    saveCompany(

        symbol,

        data

    ){

        this.companyCache.set(

            symbol,

            data

        );

    }

    company(

        symbol

    ){

        return this.companyCache.get(

            symbol

        );

    }

    /* ==========================================
       MARKET STATUS
    ========================================== */

    setStatus(

        market,

        status

    ){

        this.marketStatus.set(

            market,

            status

        );

    }

    status(

        market = this.currentMarket

    ){

        return this.marketStatus.get(

            market

        ) || "UNKNOWN";

    }

    /* ==========================================
       API PROVIDER
    ========================================== */

    provider(service = "stocks") {

    return API_PRIORITY[service];

}

nextProvider(service = "stocks") {

    return client.nextProvider(service);

}

}

/* ==========================================================
   SINGLETON
   ========================================================== */

const market = new MarketEngine();

export default market;

/* ==========================================================
   END OF PART 1
   ========================================================== */

   /* ==========================================================
   LIVE MARKET DATA
   PART 2
   ========================================================== */

/* ==========================================
   LIVE QUOTE
========================================== */

MarketEngine.prototype.quote = async function (

    symbol,

    market = this.currentMarket

){

    symbol = this.normalizeSymbol(symbol, market);

    const provider = this.provider("stocks");

    const provider = this.nextProvider("stocks");

    switch(provider){

        case "finnhub":

            return await client.smartGet(

                "finnhub",

                "/quote",

                {

                    symbol

                },

                30000

            );

        case "twelveData":

            return await client.smartGet(

                "twelveData",

                "/price",

                {

                    symbol

                },

                30000

            );

        default:

            throw new Error(

                "No stock provider found."

            );

    }

};

/* ==========================================
   COMPANY PROFILE
========================================== */

MarketEngine.prototype.profile = async function (

    symbol,

    market = this.currentMarket

){

    symbol = this.normalizeSymbol(symbol, market);

    return await client.smartGet(

        "finnhub",

        "/stock/profile2",

        {

            symbol

        },

        86400000

    );

};

/* ==========================================
   COMPANY NEWS
========================================== */

MarketEngine.prototype.companyNews = async function (

    symbol,

    from,

    to

){

    symbol = this.normalizeSymbol(symbol);

    return await client.smartGet(

        "finnhub",

        "/company-news",

        {

            symbol,

            from,

            to

        },

        300000

    );

};

/* ==========================================
   COMPANY METRICS
========================================== */

MarketEngine.prototype.metrics = async function (

    symbol

){

    symbol = this.normalizeSymbol(symbol);

    return await client.smartGet(

        "finnhub",

        "/stock/metric",

        {

            symbol,

            metric:"all"

        },

        86400000

    );

};

/* ==========================================
   MARKET OPEN?
========================================== */

MarketEngine.prototype.isOpen = function (

    market = this.currentMarket

){

    const info = MARKETS[market];

    return {

        market,

        timezone: info.timezone,

        status: this.status(market)

    };

};

/* ==========================================================
   END OF PART 2
   ========================================================== */

   /* ==========================================================
   MARKET SCREENER & INDEXES
   PART 3
   ========================================================== */

/* ==========================================
   TOP GAINERS
========================================== */

MarketEngine.prototype.topGainers = async function () {

    return await client.smartGet(
        "financialModelingPrep",
        "/v3/stock_market/gainers",
        {},
        60000
    );

};

/* ==========================================
   TOP LOSERS
========================================== */

MarketEngine.prototype.topLosers = async function () {

    return await client.smartGet(
        "financialModelingPrep",
        "/v3/stock_market/losers",
        {},
        60000
    );

};

/* ==========================================
   MOST ACTIVE
========================================== */

MarketEngine.prototype.mostActive = async function () {

    return await client.smartGet(
        "financialModelingPrep",
        "/v3/stock_market/actives",
        {},
        60000
    );

};

/* ==========================================
   MAJOR INDEXES
========================================== */

MarketEngine.prototype.indexes = async function () {

    return {

        bist100: await this.quote("XU100"),

        sp500: await this.quote("^GSPC"),

        nasdaq: await this.quote("^IXIC"),

        dowJones: await this.quote("^DJI"),

        russell2000: await this.quote("^RUT")

    };

};

/* ==========================================
   CRYPTO MARKET
========================================== */

MarketEngine.prototype.crypto = async function () {

    return await client.smartGet(

        "coinGecko",

        "/coins/markets",

        {

            vs_currency: "usd",

            order: "market_cap_desc",

            per_page: 100,

            page: 1

        },

        30000

    );

};

/* ==========================================
   FOREX MARKET
========================================== */

MarketEngine.prototype.forex = async function (

    base = "USD",

    target = "TRY"

){

    return await client.smartGet(

        "twelveData",

        "/exchange_rate",

        {

            symbol: `${base}/${target}`

        },

        30000

    );

};

/* ==========================================
   COMMODITIES
========================================== */

MarketEngine.prototype.commodities = async function () {

    return {

        gold: await this.quote("XAUUSD"),

        silver: await this.quote("XAGUSD"),

        brent: await this.quote("BZ"),

        wti: await this.quote("CL")

    };

};

/* ==========================================
   MARKET OVERVIEW
========================================== */

MarketEngine.prototype.overview = async function () {

    const [

        gainers,

        losers,

        active,

        indexes

    ] = await Promise.all([

        this.topGainers(),

        this.topLosers(),

        this.mostActive(),

        this.indexes()

    ]);

    return {

        gainers,

        losers,

        active,

        indexes

    };

};

/* ==========================================================
   END OF PART 3
   ========================================================== */

   /* ==========================================================
   SEARCH • WATCHLIST • PORTFOLIO
   PART 4
   ========================================================== */

/* ==========================================
   SEARCH SYMBOL
========================================== */

MarketEngine.prototype.search = async function (

    query

){

    return await client.smartGet(

        "finnhub",

        "/search",

        {

            q: query

        },

        60000

    );

};

/* ==========================================
   MARKET STATUS
========================================== */

MarketEngine.prototype.marketStatus = async function(){

    return {

        market: this.currentMarket,

        timezone: this.marketInfo().timezone,

        exchange: this.marketInfo().name,

        status: this.status()

    };

};

/* ==========================================
   WATCHLIST DATA
========================================== */

MarketEngine.prototype.watchlist = async function(

    symbols=[]

){

    const requests = symbols.map(symbol=>{

        return this.quote(symbol);

    });

    return await Promise.all(requests);

};

/* ==========================================
   PORTFOLIO DATA
========================================== */

MarketEngine.prototype.portfolio = async function(

    positions=[]

){

    const portfolio=[];

    for(const item of positions){

        const quote=await this.quote(item.symbol);

        portfolio.push({

            symbol:item.symbol,

            quantity:item.quantity,

            buyPrice:item.buyPrice,

            quote

        });

    }

    return portfolio;

};

/* ==========================================
   AUTOCOMPLETE
========================================== */

MarketEngine.prototype.autocomplete = async function(

    text

){

    return await this.search(text);

};

/* ==========================================
   MARKET SUMMARY
========================================== */

MarketEngine.prototype.summary = async function(){

    const [

        overview,

        crypto,

        forex

    ]=await Promise.all([

        this.overview(),

        this.crypto(),

        this.forex()

    ]);

    return{

        overview,

        crypto,

        forex

    };

};

/* ==========================================
   EXPORT
========================================== */

export {

    market

};

export const quote=market.quote.bind(market);

export const profile=market.profile.bind(market);

export const companyNews=market.companyNews.bind(market);

export const metrics=market.metrics.bind(market);

export const search=market.search.bind(market);

export const watchlist=market.watchlist.bind(market);

export const portfolio=market.portfolio.bind(market);

export const overview=market.overview.bind(market);

export const summary=market.summary.bind(market);

export const crypto=market.crypto.bind(market);

export const forex=market.forex.bind(market);

/* ==========================================================
   END OF MARKET.JS
   ========================================================== */