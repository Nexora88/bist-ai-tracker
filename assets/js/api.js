/*=========================================================
BIST AI Tracker
API Engine v3.0
Developer: Ahmet Eymen Bakraç
=========================================================*/

const API = {

    VERSION: "3.0.0",

    APP_NAME: "BIST AI Tracker",

    BASE: {

        YAHOO: "https://query1.finance.yahoo.com",

        FINNHUB: "https://finnhub.io/api/v1"

    },

    KEY: {

        FINNHUB: "",

        NEWS: ""

    },

    TIMEOUT: 10000,

    CACHE_TIME: 30000,

    cache: new Map(),

    async request(url, options = {}) {

        const controller = new AbortController();

        const timeout = setTimeout(() => {

            controller.abort();

        }, this.TIMEOUT);

        try {

            const response = await fetch(url, {

                ...options,

                signal: controller.signal

            });

            clearTimeout(timeout);

            if (!response.ok) {

                throw new Error(

                    `HTTP ${response.status}`

                );

            }

            return await response.json();

        }

        catch(error) {

            clearTimeout(timeout);

            console.error(

                "API Request Error:",

                error

            );

            throw error;

        }

    }

};

window.API = API;

/*=========================================================
BÖLÜM 2
Yahoo Finance API
=========================================================*/

API.getQuote = async function(symbol) {

    symbol = Market.normalize(symbol);

    const url =

        `${this.BASE.YAHOO}/v8/finance/chart/${symbol}.IS?interval=1m&range=1d`;

    return await this.request(url);

};

API.getHistory = async function(

    symbol,

    range = "6mo",

    interval = "1d"

) {

    symbol = Market.normalize(symbol);

    const url =

        `${this.BASE.YAHOO}/v8/finance/chart/${symbol}.IS?range=${range}&interval=${interval}`;

    return await this.request(url);

};

API.getCompany = async function(symbol) {

    symbol = Market.normalize(symbol);

    const url =

        `${this.BASE.YAHOO}/v10/finance/quoteSummary/${symbol}.IS?modules=price,summaryProfile,assetProfile`;

    return await this.request(url);

};

API.getStatistics = async function(symbol) {

    symbol = Market.normalize(symbol);

    const url =

        `${this.BASE.YAHOO}/v10/finance/quoteSummary/${symbol}.IS?modules=defaultKeyStatistics,financialData`;

    return await this.request(url);

};

API.getRecommendations = async function(symbol) {

    symbol = Market.normalize(symbol);

    const url =

        `${this.BASE.YAHOO}/v10/finance/quoteSummary/${symbol}.IS?modules=recommendationTrend`;

    return await this.request(url);

};

/*=========================================================
BÖLÜM 3
Finnhub API
=========================================================*/

API.setFinnhubKey = function(key) {

    this.KEY.FINNHUB = key;

};

API.getCompanyNews = async function(

    symbol,

    from,

    to

) {

    symbol = Market.normalize(symbol);

    const url =

        `${this.BASE.FINNHUB}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${this.KEY.FINNHUB}`;

    return await this.request(url);

};

API.getBasicFinancials = async function(symbol) {

    symbol = Market.normalize(symbol);

    const url =

        `${this.BASE.FINNHUB}/stock/metric?symbol=${symbol}&metric=all&token=${this.KEY.FINNHUB}`;

    return await this.request(url);

};

API.getPriceTarget = async function(symbol) {

    symbol = Market.normalize(symbol);

    const url =

        `${this.BASE.FINNHUB}/stock/price-target?symbol=${symbol}&token=${this.KEY.FINNHUB}`;

    return await this.request(url);

};

API.getRecommendation = async function(symbol) {

    symbol = Market.normalize(symbol);

    const url =

        `${this.BASE.FINNHUB}/stock/recommendation?symbol=${symbol}&token=${this.KEY.FINNHUB}`;

    return await this.request(url);

};

API.getInsiderTransactions = async function(symbol) {

    symbol = Market.normalize(symbol);

    const url =

        `${this.BASE.FINNHUB}/stock/insider-transactions?symbol=${symbol}&token=${this.KEY.FINNHUB}`;

    return await this.request(url);

};

API.getEarnings = async function(symbol) {

    symbol = Market.normalize(symbol);

    const url =

        `${this.BASE.FINNHUB}/stock/earnings?symbol=${symbol}&token=${this.KEY.FINNHUB}`;

    return await this.request(url);

};

/*=========================================================
BÖLÜM 4
Finansal Veriler
=========================================================*/

API.getIncomeStatement = async function(symbol) {

    symbol = Market.normalize(symbol);

    const url =

        `${this.BASE.YAHOO}/v10/finance/quoteSummary/${symbol}.IS?modules=incomeStatementHistory`;

    return await this.request(url);

};

API.getBalanceSheet = async function(symbol) {

    symbol = Market.normalize(symbol);

    const url =

        `${this.BASE.YAHOO}/v10/finance/quoteSummary/${symbol}.IS?modules=balanceSheetHistory`;

    return await this.request(url);

};

API.getCashFlow = async function(symbol) {

    symbol = Market.normalize(symbol);

    const url =

        `${this.BASE.YAHOO}/v10/finance/quoteSummary/${symbol}.IS?modules=cashflowStatementHistory`;

    return await this.request(url);

};

API.getFinancialData = async function(symbol) {

    symbol = Market.normalize(symbol);

    const url =

        `${this.BASE.YAHOO}/v10/finance/quoteSummary/${symbol}.IS?modules=financialData`;

    return await this.request(url);

};

API.getValuation = async function(symbol) {

    symbol = Market.normalize(symbol);

    const url =

        `${this.BASE.YAHOO}/v10/finance/quoteSummary/${symbol}.IS?modules=defaultKeyStatistics`;

    return await this.request(url);

};

API.getDividendHistory = async function(symbol) {

    symbol = Market.normalize(symbol);

    const url =

        `${this.BASE.YAHOO}/v8/finance/chart/${symbol}.IS?events=div`;

    return await this.request(url);

};

API.getSplitHistory = async function(symbol) {

    symbol = Market.normalize(symbol);

    const url =

        `${this.BASE.YAHOO}/v8/finance/chart/${symbol}.IS?events=split`;

    return await this.request(url);

};

/*=========================================================
BÖLÜM 5
Global Markets API
=========================================================*/

API.getCurrency = async function(pair = "TRY=X") {

    const url =

        `${this.BASE.YAHOO}/v8/finance/chart/${pair}?interval=1m&range=1d`;

    return await this.request(url);

};

API.getGold = async function() {

    return await this.getCurrency("GC=F");

};

API.getSilver = async function() {

    return await this.getCurrency("SI=F");

};

API.getBrentOil = async function() {

    return await this.getCurrency("BZ=F");

};

API.getNaturalGas = async function() {

    return await this.getCurrency("NG=F");

};

API.getNASDAQ = async function() {

    return await this.getCurrency("^IXIC");

};

API.getSP500 = async function() {

    return await this.getCurrency("^GSPC");

};

API.getDowJones = async function() {

    return await this.getCurrency("^DJI");

};

API.getDAX = async function() {

    return await this.getCurrency("^GDAXI");

};

API.getBitcoin = async function() {

    return await this.getCurrency("BTC-USD");

};

API.getEthereum = async function() {

    return await this.getCurrency("ETH-USD");

};

API.getMarketOverview = async function() {

    const [

        usd,

        eur,

        gold,

        brent,

        nasdaq,

        sp500,

        bitcoin

    ] = await Promise.all([

        this.getCurrency("TRY=X"),

        this.getCurrency("EURTRY=X"),

        this.getGold(),

        this.getBrentOil(),

        this.getNASDAQ(),

        this.getSP500(),

        this.getBitcoin()

    ]);

    return {

        usd,

        eur,

        gold,

        brent,

        nasdaq,

        sp500,

        bitcoin

    };

};

/*=========================================================
BÖLÜM 6
News API Center
=========================================================*/

API.getKAPNews = async function(symbol) {

    symbol = Market.normalize(symbol);

    return await News.get(symbol);

};

API.getMarketNews = async function(symbol) {

    symbol = Market.normalize(symbol);

    const today = new Date();

    const from = new Date();

    from.setDate(today.getDate() - 7);

    const format = d => d.toISOString().split("T")[0];

    return await this.getCompanyNews(

        symbol,

        format(from),

        format(today)

    );

};

API.getEconomicNews = async function() {

    return await this.request(

        `${this.BASE.FINNHUB}/news?category=general&token=${this.KEY.FINNHUB}`

    );

};

API.getCryptoNews = async function() {

    return await this.request(

        `${this.BASE.FINNHUB}/news?category=crypto&token=${this.KEY.FINNHUB}`

    );

};

API.getForexNews = async function() {

    return await this.request(

        `${this.BASE.FINNHUB}/news?category=forex&token=${this.KEY.FINNHUB}`

    );

};

API.getNewsCenter = async function(symbol) {

    const [

        company,

        economy,

        crypto,

        forex

    ] = await Promise.all([

        this.getMarketNews(symbol),

        this.getEconomicNews(),

        this.getCryptoNews(),

        this.getForexNews()

    ]);

    return {

        company,

        economy,

        crypto,

        forex

    };

};

/*=========================================================
BÖLÜM 7
Smart Cache System
=========================================================*/

API.Cache = {

    storage: new Map(),

    defaultTTL: 30000,

    set(key, value, ttl = null) {

        this.storage.set(key, {

            value,

            expires:

                Date.now() +

                (ttl || this.defaultTTL)

        });

    },

    get(key) {

        const item = this.storage.get(key);

        if (!item) {

            return null;

        }

        if (Date.now() > item.expires) {

            this.storage.delete(key);

            return null;

        }

        return item.value;

    },

    has(key) {

        return this.get(key) !== null;

    },

    remove(key) {

        this.storage.delete(key);

    },

    clear() {

        this.storage.clear();

    },

    size() {

        return this.storage.size;

    }

};

API.cachedRequest = async function(url, ttl = 30000) {

    const cached = this.Cache.get(url);

    if (cached) {

        return cached;

    }

    const data = await this.request(url);

    this.Cache.set(url, data, ttl);

    return data;

};

/*=========================================================
BÖLÜM 8
Error Manager
=========================================================*/

API.Errors = {

    history: [],

    maxHistory: 100,

    add(type, message, url = "") {

        this.history.unshift({

            type,

            message,

            url,

            date: new Date().toISOString()

        });

        if (this.history.length > this.maxHistory) {

            this.history.pop();

        }

    },

    last() {

        return this.history[0] || null;

    },

    clear() {

        this.history = [];

    }

};

API.safeRequest = async function(url, options = {}) {

    try {

        return await this.cachedRequest(url);

    }

    catch(error) {

        this.Errors.add(

            "REQUEST_ERROR",

            error.message,

            url

        );

        console.error(

            "[API]",

            error.message

        );

        return null;

    }

};

API.isAvailable = async function() {

    try {

        await fetch(

            "https://query1.finance.yahoo.com",

            {

                method: "HEAD",

                mode: "no-cors"

            }

        );

        return true;

    }

    catch {

        return false;

    }

};

API.getLastError = function() {

    return this.Errors.last();

};

/*=========================================================
BÖLÜM 9
Rate Limit & Performance
=========================================================*/

API.Performance = {

    requests: 0,

    failed: 0,

    successful: 0,

    lastRequest: null,

    startTime: Date.now()

};

API.beforeRequest = function() {

    this.Performance.requests++;

    this.Performance.lastRequest = Date.now();

};

API.afterSuccess = function() {

    this.Performance.successful++;

};

API.afterFail = function() {

    this.Performance.failed++;

};

API.delay = function(ms) {

    return new Promise(resolve =>

        setTimeout(resolve, ms)

    );

};

API.requestWithRetry = async function(

    url,

    retry = 3

) {

    this.beforeRequest();

    for(let i = 0; i < retry; i++) {

        try {

            const data =

                await this.cachedRequest(url);

            this.afterSuccess();

            return data;

        }

        catch(error) {

            this.afterFail();

            if(i === retry - 1) {

                throw error;

            }

            await this.delay(

                1000 * (i + 1)

            );

        }

    }

};

API.getPerformance = function() {

    return {

        ...this.Performance,

        uptime:

            Date.now() -

            this.Performance.startTime

    };

};

/*=========================================================
BÖLÜM 10
API Final
=========================================================*/

API.AUTHOR = "Ahmet Eymen Bakraç";

API.VERSION = "3.0.0";

API.APP_NAME = "BIST AI Tracker";

API.COPYRIGHT =
"© 2026 Ahmet Eymen Bakraç. Tüm Hakları Saklıdır.";

API.DISCLAIMER =
"Bu uygulama yalnızca eğitim ve bilgilendirme amacıyla geliştirilmiştir. Uygulamada sunulan fiyatlar, haberler, yapay zekâ analizleri, grafikler ve finansal veriler yatırım tavsiyesi değildir. Kullanıcılar yatırım kararlarını kendi araştırmaları doğrultusunda vermelidir.";

API.about = function () {

    return {

        application: this.APP_NAME,

        version: this.VERSION,

        author: this.AUTHOR,

        copyright: this.COPYRIGHT,

        disclaimer: this.DISCLAIMER,

        cacheItems: this.Cache.size(),

        requests: this.Performance.requests,

        successful: this.Performance.successful,

        failed: this.Performance.failed

    };

};

API.reset = function() {

    this.Cache.clear();

    this.Errors.clear();

    this.Performance.requests = 0;

    this.Performance.successful = 0;

    this.Performance.failed = 0;

    this.Performance.lastRequest = null;

};

API.destroy = function() {

    this.reset();

    console.log(

        `${this.APP_NAME} API Engine kapatıldı.`

    );

};

Object.freeze(API);

console.log(

`%c${API.APP_NAME} API Engine v${API.VERSION} Hazır`,

"color:#0ea5e9;font-size:15px;font-weight:bold;"

);