/*=========================================================
BIST AI Tracker
API Engine v3.1 — CORS Proxy destekli
Developer: Ahmet Eymen Bakraç
=========================================================*/

const API = {

    VERSION: "3.1.0",

    APP_NAME: "BIST AI Tracker",

    BASE: {
        YAHOO: "https://query1.finance.yahoo.com",
        FINNHUB: "https://finnhub.io/api/v1"
    },

    KEY: {
        FINNHUB: "",
        NEWS: ""
    },

    TIMEOUT: 12000,

    CACHE_TIME: 30000,

    cache: new Map(),

    /* CORS proxy listesi (sırayla dener) */
    PROXIES: [
        function(url) {
            return "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
        },
        function(url) {
            return "https://corsproxy.io/?" + encodeURIComponent(url);
        }
    ],

    /* Tek fetch denemesi */
    async _fetchOnce(url, options, timeoutMs) {
        const controller = new AbortController();
        const timeout = setTimeout(function() {
            controller.abort();
        }, timeoutMs || API.TIMEOUT);

        try {
            const response = await fetch(url, Object.assign({}, options || {}, {
                signal: controller.signal
            }));
            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error("HTTP " + response.status);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeout);
            throw error;
        }
    },

    /**
     * Ana istek metodu
     * 1) Doğrudan URL
     * 2) CORS proxy yedekleri
     */
    async request(url, options) {
        options = options || {};

        /* 1 — Doğrudan */
        try {
            return await this._fetchOnce(url, options, this.TIMEOUT);
        } catch (e1) {
            console.warn("API direct failed:", e1 && e1.message);
        }

        /* 2 — Proxy yedekleri */
        for (var i = 0; i < this.PROXIES.length; i++) {
            try {
                var proxyUrl = this.PROXIES[i](url);
                return await this._fetchOnce(proxyUrl, options, this.TIMEOUT);
            } catch (e2) {
                console.warn("API proxy " + i + " failed:", e2 && e2.message);
            }
        }

        console.error("API Request Error: all methods failed for", url);
        throw new Error("Veri alınamadı (CORS / ağ hatası)");
    }

};

window.API = API;

/*=========================================================
BÖLÜM 2 — Yahoo Finance API
=========================================================*/

API.getQuote = async function(symbol) {
    symbol = Market.normalize(symbol);
    var url = this.BASE.YAHOO + "/v8/finance/chart/" + symbol + ".IS?interval=1m&range=1d";
    return await this.request(url);
};

API.getHistory = async function(symbol, range, interval) {
    range = range || "6mo";
    interval = interval || "1d";
    symbol = Market.normalize(symbol);
    var url = this.BASE.YAHOO + "/v8/finance/chart/" + symbol + ".IS?range=" + range + "&interval=" + interval;
    return await this.request(url);
};

API.getCompany = async function(symbol) {
    symbol = Market.normalize(symbol);
    var url = this.BASE.YAHOO + "/v10/finance/quoteSummary/" + symbol + ".IS?modules=price,summaryProfile,assetProfile";
    return await this.request(url);
};

API.getStatistics = async function(symbol) {
    symbol = Market.normalize(symbol);
    var url = this.BASE.YAHOO + "/v10/finance/quoteSummary/" + symbol + ".IS?modules=defaultKeyStatistics,financialData";
    return await this.request(url);
};

API.getRecommendations = async function(symbol) {
    symbol = Market.normalize(symbol);
    var url = this.BASE.YAHOO + "/v10/finance/quoteSummary/" + symbol + ".IS?modules=recommendationTrend";
    return await this.request(url);
};

/*=========================================================
BÖLÜM 3 — Finnhub API
=========================================================*/

API.setFinnhubKey = function(key) {
    this.KEY.FINNHUB = key;
};

API.getCompanyNews = async function(symbol, from, to) {
    symbol = Market.normalize(symbol);
    var url = this.BASE.FINNHUB + "/company-news?symbol=" + symbol + "&from=" + from + "&to=" + to + "&token=" + this.KEY.FINNHUB;
    return await this.request(url);
};

API.getBasicFinancials = async function(symbol) {
    symbol = Market.normalize(symbol);
    var url = this.BASE.FINNHUB + "/stock/metric?symbol=" + symbol + "&metric=all&token=" + this.KEY.FINNHUB;
    return await this.request(url);
};

API.getPriceTarget = async function(symbol) {
    symbol = Market.normalize(symbol);
    var url = this.BASE.FINNHUB + "/stock/price-target?symbol=" + symbol + "&token=" + this.KEY.FINNHUB;
    return await this.request(url);
};

API.getRecommendation = async function(symbol) {
    symbol = Market.normalize(symbol);
    var url = this.BASE.FINNHUB + "/stock/recommendation?symbol=" + symbol + "&token=" + this.KEY.FINNHUB;
    return await this.request(url);
};

API.getInsiderTransactions = async function(symbol) {
    symbol = Market.normalize(symbol);
    var url = this.BASE.FINNHUB + "/stock/insider-transactions?symbol=" + symbol + "&token=" + this.KEY.FINNHUB;
    return await this.request(url);
};

API.getEarnings = async function(symbol) {
    symbol = Market.normalize(symbol);
    var url = this.BASE.FINNHUB + "/stock/earnings?symbol=" + symbol + "&token=" + this.KEY.FINNHUB;
    return await this.request(url);
};

/*=========================================================
BÖLÜM 4 — Finansal Veriler
=========================================================*/

API.getIncomeStatement = async function(symbol) {
    symbol = Market.normalize(symbol);
    var url = this.BASE.YAHOO + "/v10/finance/quoteSummary/" + symbol + ".IS?modules=incomeStatementHistory";
    return await this.request(url);
};

API.getBalanceSheet = async function(symbol) {
    symbol = Market.normalize(symbol);
    var url = this.BASE.YAHOO + "/v10/finance/quoteSummary/" + symbol + ".IS?modules=balanceSheetHistory";
    return await this.request(url);
};

API.getCashFlow = async function(symbol) {
    symbol = Market.normalize(symbol);
    var url = this.BASE.YAHOO + "/v10/finance/quoteSummary/" + symbol + ".IS?modules=cashflowStatementHistory";
    return await this.request(url);
};

API.getFinancialData = async function(symbol) {
    symbol = Market.normalize(symbol);
    var url = this.BASE.YAHOO + "/v10/finance/quoteSummary/" + symbol + ".IS?modules=financialData";
    return await this.request(url);
};

API.getValuation = async function(symbol) {
    symbol = Market.normalize(symbol);
    var url = this.BASE.YAHOO + "/v10/finance/quoteSummary/" + symbol + ".IS?modules=defaultKeyStatistics";
    return await this.request(url);
};

API.getDividendHistory = async function(symbol) {
    symbol = Market.normalize(symbol);
    var url = this.BASE.YAHOO + "/v8/finance/chart/" + symbol + ".IS?events=div";
    return await this.request(url);
};

API.getSplitHistory = async function(symbol) {
    symbol = Market.normalize(symbol);
    var url = this.BASE.YAHOO + "/v8/finance/chart/" + symbol + ".IS?events=split";
    return await this.request(url);
};

/*=========================================================
BÖLÜM 5 — Global Markets
=========================================================*/

API.getCurrency = async function(pair) {
    pair = pair || "TRY=X";
    var url = this.BASE.YAHOO + "/v8/finance/chart/" + pair + "?interval=1m&range=1d";
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
    var results = await Promise.all([
        this.getCurrency("TRY=X"),
        this.getCurrency("EURTRY=X"),
        this.getGold(),
        this.getBrentOil(),
        this.getNASDAQ(),
        this.getSP500(),
        this.getBitcoin()
    ]);
    return {
        usd: results[0],
        eur: results[1],
        gold: results[2],
        brent: results[3],
        nasdaq: results[4],
        sp500: results[5],
        bitcoin: results[6]
    };
};

/*=========================================================
BÖLÜM 6 — News
=========================================================*/

API.getKAPNews = async function(symbol) {
    symbol = Market.normalize(symbol);
    return await News.get(symbol);
};

API.getMarketNews = async function(symbol) {
    symbol = Market.normalize(symbol);
    var today = new Date();
    var from = new Date();
    from.setDate(today.getDate() - 7);
    var format = function(d) {
        return d.toISOString().split("T")[0];
    };
    return await this.getCompanyNews(symbol, format(from), format(today));
};

API.getEconomicNews = async function() {
    return await this.request(
        this.BASE.FINNHUB + "/news?category=general&token=" + this.KEY.FINNHUB
    );
};

API.getCryptoNews = async function() {
    return await this.request(
        this.BASE.FINNHUB + "/news?category=crypto&token=" + this.KEY.FINNHUB
    );
};

API.getForexNews = async function() {
    return await this.request(
        this.BASE.FINNHUB + "/news?category=forex&token=" + this.KEY.FINNHUB
    );
};

API.getNewsCenter = async function(symbol) {
    var results = await Promise.all([
        this.getMarketNews(symbol),
        this.getEconomicNews(),
        this.getCryptoNews(),
        this.getForexNews()
    ]);
    return {
        company: results[0],
        economy: results[1],
        crypto: results[2],
        forex: results[3]
    };
};

/*=========================================================
BÖLÜM 7 — Smart Cache
=========================================================*/

API.Cache = {
    storage: new Map(),
    defaultTTL: 30000,

    set: function(key, value, ttl) {
        this.storage.set(key, {
            value: value,
            expires: Date.now() + (ttl || this.defaultTTL)
        });
    },

    get: function(key) {
        var item = this.storage.get(key);
        if (!item) return null;
        if (Date.now() > item.expires) {
            this.storage.delete(key);
            return null;
        }
        return item.value;
    },

    has: function(key) {
        return this.get(key) !== null;
    },

    remove: function(key) {
        this.storage.delete(key);
    },

    clear: function() {
        this.storage.clear();
    },

    size: function() {
        return this.storage.size;
    }
};

API.cachedRequest = async function(url, ttl) {
    ttl = ttl || 30000;
    var cached = this.Cache.get(url);
    if (cached) return cached;
    var data = await this.request(url);
    this.Cache.set(url, data, ttl);
    return data;
};

console.log("API Engine v" + API.VERSION + " ready (CORS proxy enabled)");
