/*
========================================
BIST AI Tracker
News Engine v3
========================================
*/

const News = {

    VERSION: "3.0.0",

    CACHE_TIME: 60000,

    cache: {},

    async get(symbol) {

        symbol = Market.normalize(symbol);

        const cacheKey = symbol;

        const cached = this.getCache(cacheKey);

        if (cached) {

            return cached;

        }

        const news = await this.fetchYahoo(symbol);

        this.setCache(cacheKey, news);

        return news;

    },

    getCache(key) {

        const item = this.cache[key];

        if (!item) {

            return null;

        }

        if (Date.now() - item.time > this.CACHE_TIME) {

            delete this.cache[key];

            return null;

        }

        return item.data;

    },

    setCache(key, data) {

        this.cache[key] = {

            time: Date.now(),

            data

        };

    },

    clearCache() {

        this.cache = {};

    }

};

window.News = News;

/*=========================================================
BÖLÜM 2
Yahoo Finance Haber Servisi
=========================================================*/

News.fetchYahoo = async function(symbol) {

    try {

        const url =
            `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}.IS`;

        const response = await fetch(url, {

            cache: "no-store"

        });

        if (!response.ok) {

            throw new Error("Yahoo API Hatası");

        }

        const json = await response.json();

        if (!json.news) {

            return [];

        }

        return json.news.map(item => ({

            source: "Yahoo Finance",

            title: item.title || "",

            description: item.summary || "",

            url: item.link || "#",

            image: item.thumbnail?.resolutions?.[0]?.url || "",

            publisher: item.publisher || "Yahoo",

            published:

                item.providerPublishTime

                    ? new Date(

                        item.providerPublishTime * 1000

                    ).toLocaleString("tr-TR")

                    : "",

            sentiment: "Nötr"

        }));

    }

    catch(error) {

        console.error(

            "Yahoo Haber Hatası:",

            error

        );

        return [];

    }

};

/*=========================================================
BÖLÜM 3
Finnhub Haber Servisi
=========================================================*/

News.API = {

    FINNHUB_KEY: "d92gf21r01qraam0tf4gd92gf21r01qraam0tf50"

};

News.fetchFinnhub = async function(symbol) {

    try {

        const today = new Date();

        const from = new Date();

        from.setDate(today.getDate() - 30);

        const format = date => date.toISOString().split("T")[0];

        const url =
            `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${format(from)}&to=${format(today)}&token=${News.API.FINNHUB_KEY}`;

        const response = await fetch(url);

        if (!response.ok) {

            throw new Error("Finnhub API Hatası");

        }

        const json = await response.json();

        if (!Array.isArray(json)) {

            return [];

        }

        return json.map(item => ({

            source: "Finnhub",

            title: item.headline || "",

            description: item.summary || "",

            url: item.url || "#",

            image: item.image || "",

            publisher: item.source || "Finnhub",

            published: item.datetime
                ? new Date(item.datetime * 1000).toLocaleString("tr-TR")
                : "",

            sentiment: "Nötr"

        }));

    }

    catch(error) {

        console.error(

            "Finnhub Haber Hatası:",

            error

        );

        return [];

    }

};

/*=========================================================
BÖLÜM 4
RSS Haber Servisi
=========================================================*/

News.fetchRSS = async function(symbol) {

    try {

        const feeds = [

            `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${symbol}.IS&region=US&lang=en-US`

        ];

        const news = [];

        for (const feed of feeds) {

            try {

                const response = await fetch(

                    `https://api.allorigins.win/raw?url=${encodeURIComponent(feed)}`

                );

                if (!response.ok)
                    continue;

                const xml = await response.text();

                const parser = new DOMParser();

                const doc = parser.parseFromString(

                    xml,

                    "text/xml"

                );

                const items = doc.querySelectorAll("item");

                items.forEach(item => {

                    news.push({

                        source: "RSS",

                        title:

                            item.querySelector("title")?.textContent || "",

                        description:

                            item.querySelector("description")?.textContent || "",

                        url:

                            item.querySelector("link")?.textContent || "#",

                        image: "",

                        publisher: "RSS",

                        published:

                            item.querySelector("pubDate")?.textContent || "",

                        sentiment: "Nötr"

                    });

                });

            }

            catch(e) {

                console.warn(

                    "RSS okunamadı.",

                    e

                );

            }

        }

        return news;

    }

    catch(error) {

        console.error(

            "RSS Hatası:",

            error

        );

        return [];

    }

};

/*=========================================================
BÖLÜM 5
Haber Birleştirme Motoru
=========================================================*/

News.collect = async function(symbol) {

    symbol = Market.normalize(symbol);

    let news = [];

    try {

        const yahoo = await this.fetchYahoo(symbol);

        if (Array.isArray(yahoo)) {

            news.push(...yahoo);

        }

    } catch(e) {

        console.warn("Yahoo haberleri alınamadı.");

    }

    try {

        const finnhub = await this.fetchFinnhub(symbol);

        if (Array.isArray(finnhub)) {

            news.push(...finnhub);

        }

    } catch(e) {

        console.warn("Finnhub haberleri alınamadı.");

    }

    try {

        const rss = await this.fetchRSS(symbol);

        if (Array.isArray(rss)) {

            news.push(...rss);

        }

    } catch(e) {

        console.warn("RSS haberleri alınamadı.");

    }

    const seen = new Set();

    news = news.filter(item => {

        const key = (item.title || "").trim().toLowerCase();

        if (!key)
            return false;

        if (seen.has(key))
            return false;

        seen.add(key);

        return true;

    });

    news.sort((a, b) => {

        const dateA = new Date(a.published).getTime() || 0;

        const dateB = new Date(b.published).getTime() || 0;

        return dateB - dateA;

    });

    return news.slice(0, 50);

};

News.get = async function(symbol) {

    symbol = Market.normalize(symbol);

    const cached = this.getCache(symbol);

    if (cached) {

        return cached;

    }

    const news = await this.collect(symbol);

    this.setCache(symbol, news);

    return news;

};

/*=========================================================
BÖLÜM 6
Haber Kartları
=========================================================*/

News.render = function(news, containerId) {

    const container = document.getElementById(containerId);

    if (!container)
        return;

    container.innerHTML = "";

    if (!news || news.length === 0) {

        container.innerHTML = `

            <div class="news-empty">

                <h3>📰 Haber Bulunamadı</h3>

                <p>Bu hisse için güncel haber bulunamadı.</p>

            </div>

        `;

        return;

    }

    news.forEach(item => {

        const card = document.createElement("div");

        card.className = "news-card";

        card.innerHTML = `

            <div class="news-header">

                <span class="news-source">

                    ${item.source}

                </span>

                <span class="news-date">

                    ${item.published}

                </span>

            </div>

            <h3 class="news-title">

                ${item.title}

            </h3>

            <p class="news-description">

                ${item.description || ""}

            </p>

            <div class="news-footer">

                <span>

                    ${item.publisher}

                </span>

                <a href="${item.url}"

                   target="_blank"

                   rel="noopener">

                   Haberi Oku →

                </a>

            </div>

        `;

        container.appendChild(card);

    });

};

/*=========================================================
BÖLÜM 7
Haber Arama ve Filtreleme
=========================================================*/

News.search = function(news, keyword) {

    if (!Array.isArray(news))
        return [];

    if (!keyword)
        return news;

    keyword = keyword.toLowerCase().trim();

    return news.filter(item => {

        const title =
            (item.title || "").toLowerCase();

        const description =
            (item.description || "").toLowerCase();

        const publisher =
            (item.publisher || "").toLowerCase();

        return (

            title.includes(keyword) ||

            description.includes(keyword) ||

            publisher.includes(keyword)

        );

    });

};

News.filterBySource = function(news, source) {

    if (!Array.isArray(news))
        return [];

    if (!source)
        return news;

    return news.filter(item =>

        item.source === source

    );

};

News.filterToday = function(news) {

    const today = new Date().toDateString();

    return news.filter(item => {

        if (!item.published)
            return false;

        return new Date(item.published)
            .toDateString() === today;

    });

};

News.sortNewest = function(news) {

    return [...news].sort((a, b) => {

        return new Date(b.published) -

               new Date(a.published);

    });

};

News.sortOldest = function(news) {

    return [...news].sort((a, b) => {

        return new Date(a.published) -

               new Date(b.published);

    });

};

/*=========================================================
BÖLÜM 8
AI Haber Skoru
=========================================================*/

News.Score = {

    POSITIVE: [

        "kar",
        "büyüme",
        "rekor",
        "yatırım",
        "anlaşma",
        "ihale",
        "temettü",
        "onay",
        "ihracat",
        "kapasite",
        "güçlü",
        "yükseldi",
        "artış",
        "kazanç",
        "başarı",
        "satın alma"

    ],

    NEGATIVE: [

        "zarar",
        "ceza",
        "düşüş",
        "borç",
        "iflas",
        "kriz",
        "iptal",
        "uyarı",
        "dava",
        "geri çağırma",
        "azalış",
        "şüpheli",
        "satış",
        "enflasyon",
        "faiz",
        "risk"

    ],

    analyze(news) {

        if (!Array.isArray(news))
            return [];

        return news.map(item => {

            let score = 50;

            const text = (

                (item.title || "") +

                " " +

                (item.description || "")

            ).toLowerCase();

            this.POSITIVE.forEach(word => {

                if (text.includes(word))
                    score += 5;

            });

            this.NEGATIVE.forEach(word => {

                if (text.includes(word))
                    score -= 5;

            });

            score = Math.max(0, Math.min(100, score));

            let sentiment = "Nötr";

            if (score >= 70)
                sentiment = "Pozitif";

            else if (score <= 35)
                sentiment = "Negatif";

            return {

                ...item,

                aiScore: score,

                sentiment

            };

        });

    },

    average(news) {

        if (!news.length)
            return 50;

        const total = news.reduce(

            (sum, item) =>

                sum + (item.aiScore || 50),

            0

        );

        return Math.round(total / news.length);

    }

};

/*=========================================================
BÖLÜM 9
Haber İstatistikleri
=========================================================*/

News.Statistics = {

    generate(news) {

        if (!Array.isArray(news)) {

            return {

                total: 0,

                positive: 0,

                negative: 0,

                neutral: 0,

                averageScore: 50,

                sources: {},

                last24Hours: 0

            };

        }

        const stats = {

            total: news.length,

            positive: 0,

            negative: 0,

            neutral: 0,

            averageScore: 50,

            sources: {},

            last24Hours: 0

        };

        let scoreTotal = 0;

        const now = Date.now();

        news.forEach(item => {

            scoreTotal += item.aiScore || 50;

            switch(item.sentiment) {

                case "Pozitif":

                    stats.positive++;

                    break;

                case "Negatif":

                    stats.negative++;

                    break;

                default:

                    stats.neutral++;

                    break;

            }

            const source = item.source || "Bilinmiyor";

            stats.sources[source] =

                (stats.sources[source] || 0) + 1;

            const date = new Date(item.published).getTime();

            if (!isNaN(date)) {

                if ((now - date) <= 86400000) {

                    stats.last24Hours++;

                }

            }

        });

        if (news.length > 0) {

            stats.averageScore =

                Math.round(scoreTotal / news.length);

        }

        return stats;

    }

};

/*=========================================================
BÖLÜM 10
Final
=========================================================*/

News.VERSION = "3.0.0";

News.AUTHOR = "Ahmet Eymen Bakraç";

News.APP_NAME = "BIST AI Tracker";

News.COPYRIGHT = "© 2026 Ahmet Eymen Bakraç. Tüm Hakları Saklıdır.";

News.DISCLAIMER =
"Bu uygulamada sunulan haberler, analizler ve yapay zekâ değerlendirmeleri yalnızca bilgilendirme amaçlıdır. Hiçbir içerik yatırım tavsiyesi niteliği taşımaz. Finansal kararlarınızı vermeden önce kendi araştırmanızı yapmanız ve gerekirse yetkili yatırım danışmanlarından destek almanız önerilir.";

News.init = function () {

    console.log(

        `%c${this.APP_NAME} News Engine ${this.VERSION} hazır.`,

        "color:#3b82f6;font-weight:bold;font-size:14px;"

    );

    return true;

};

News.reset = function () {

    this.clearCache();

};

News.destroy = function () {

    this.clearCache();

    console.log(

        `${this.APP_NAME} News Engine kapatıldı.`

    );

};

News.about = function () {

    return {

        application: this.APP_NAME,

        version: this.VERSION,

        author: this.AUTHOR,

        copyright: this.COPYRIGHT,

        disclaimer: this.DISCLAIMER

    };

};

window.News = News;

Object.freeze(News);

News.init();

/* ==========================================================
   NEXORA AI
   NEWS ENGINE
   Version 1.0.0
   ========================================================== */

import client from "./client.js";
import market from "./market.js";
import {
    API_PRIORITY,
    CACHE
} from "./config.js";

/* ==========================================================
   NEWS ENGINE
   ========================================================== */

class NewsEngine {

    constructor(){

        this.cache = new Map();

        this.categories = [

            "market",

            "stocks",

            "economy",

            "crypto",

            "forex",

            "commodities",

            "earnings",

            "ipo",

            "dividend",

            "technology"

        ];

    }

    /* ======================================
       PROVIDER
    ====================================== */

    provider(){

        return API_PRIORITY.news[0];

    }

    /* ======================================
       MARKET NEWS
    ====================================== */

    async marketNews(

        limit = 20

    ){

        return await client.smartGet(

            this.provider(),

            "/news/all",

            {

                limit

            },

            60000

        );

    }

    /* ======================================
       COMPANY NEWS
    ====================================== */

    async companyNews(

        symbol,

        limit = 20

    ){

        symbol = market.normalizeSymbol(symbol);

        return await client.smartGet(

            this.provider(),

            "/news/all",

            {

                symbols: symbol,

                limit

            },

            60000

        );

    }

    /* ======================================
       CATEGORY
    ====================================== */

    async category(

        category,

        limit = 20

    ){

        return await client.smartGet(

            this.provider(),

            "/news/all",

            {

                categories: category,

                limit

            },

            60000

        );

    }

    /* ======================================
       CRYPTO NEWS
    ====================================== */

    crypto(limit=20){

        return this.category(

            "crypto",

            limit

        );

    }

    /* ======================================
       ECONOMY
    ====================================== */

    economy(limit=20){

        return this.category(

            "economy",

            limit

        );

    }

    /* ======================================
       TECHNOLOGY
    ====================================== */

    technology(limit=20){

        return this.category(

            "technology",

            limit

        );

    }

    /* ======================================
       IPO
    ====================================== */

    ipo(limit=20){

        return this.category(

            "ipo",

            limit

        );

    }

    /* ======================================
       DIVIDEND
    ====================================== */

    dividend(limit=20){

        return this.category(

            "dividend",

            limit

        );

    }

    /* ======================================
       EARNINGS
    ====================================== */

    earnings(limit=20){

        return this.category(

            "earnings",

            limit

        );

    }

    /* ======================================
       SEARCH
    ====================================== */

    async search(

        keyword,

        limit = 20

    ){

        return await client.smartGet(

            this.provider(),

            "/news/all",

            {

                search: keyword,

                limit

            },

            60000

        );

    }

}

const news = new NewsEngine();

/* ==========================================================
   AI NEWS INTELLIGENCE
   PART 2
   ========================================================== */

NewsEngine.prototype.sentiment = function(article = {}) {

    const text = `${article.title || ""} ${article.description || ""}`.toLowerCase();

    const positive = [
        "growth","record","profit","beat","upgrade","bullish",
        "strong","surge","increase","expansion","buyback",
        "approval","innovation","partnership","contract"
    ];

    const negative = [
        "loss","lawsuit","downgrade","bearish","decline",
        "bankruptcy","fraud","fall","miss","investigation",
        "debt","warning","risk","layoffs","recall"
    ];

    let score = 50;

    positive.forEach(word=>{
        if(text.includes(word)) score += 5;
    });

    negative.forEach(word=>{
        if(text.includes(word)) score -= 5;
    });

    score = Math.max(0,Math.min(100,score));

    let sentiment="Neutral";

    if(score>=65) sentiment="Positive";

    if(score<=35) sentiment="Negative";

    return{

        sentiment,

        score

    };

};

/* ======================================
   IMPACT SCORE
====================================== */

NewsEngine.prototype.impact = function(article={}){

    let score=0;

    if(article.symbols?.length) score+=20;

    if(article.description) score+=20;

    if(article.title) score+=20;

    if(article.source) score+=10;

    if(article.image_url) score+=10;

    if(article.url) score+=10;

    if(article.published_at) score+=10;

    return{

        score,

        level:

            score>=80 ? "Very High":

            score>=60 ? "High":

            score>=40 ? "Medium":

            "Low"

    };

};

/* ======================================
   KEYWORDS
====================================== */

NewsEngine.prototype.keywords=function(article={}){

    const text=

    `${article.title||""} ${article.description||""}`;

    return text

        .replace(/[^\w\s]/g,"")

        .split(" ")

        .filter(w=>w.length>4)

        .slice(0,15);

};

/* ======================================
   AI SUMMARY
====================================== */

NewsEngine.prototype.summary=function(article={}){

    return{

        title:article.title,

        summary:

        article.description ||

        "Summary unavailable."

    };

};

/* ======================================
   NORMALIZE
====================================== */

NewsEngine.prototype.normalize=function(article={}){

    return{

        ...article,

        sentiment:

            this.sentiment(article),

        impact:

            this.impact(article),

        keywords:

            this.keywords(article),

        ai:

            this.summary(article)

    };

};

/* ======================================
   NORMALIZE LIST
====================================== */

NewsEngine.prototype.normalizeList=function(

    articles=[]

){

    return articles.map(article=>

        this.normalize(article)

    );

};

/* ==========================================================
   END OF PART 2
   ========================================================== */

   /* ==========================================================
   CACHE • TREND • EXPORT
   PART 3
   ========================================================== */

/* ======================================
   NEWS CACHE
====================================== */

NewsEngine.prototype.saveCache = function (

    key,

    data,

    ttl = 60000

){

    this.cache.set(key,{

        data,

        expire:Date.now()+ttl

    });

};

NewsEngine.prototype.getCache = function (

    key

){

    const item=this.cache.get(key);

    if(!item) return null;

    if(Date.now()>item.expire){

        this.cache.delete(key);

        return null;

    }

    return item.data;

};

NewsEngine.prototype.clearCache=function(){

    this.cache.clear();

};

/* ======================================
   TREND NEWS
====================================== */

NewsEngine.prototype.trending=function(

    articles=[]

){

    return [...articles]

        .sort((a,b)=>

            b.impact.score-

            a.impact.score

        )

        .slice(0,10);

};

/* ======================================
   REMOVE DUPLICATES
====================================== */

NewsEngine.prototype.unique=function(

    articles=[]

){

    const map=new Map();

    articles.forEach(article=>{

        const key=(article.title||"").toLowerCase();

        if(!map.has(key)){

            map.set(key,article);

        }

    });

    return [...map.values()];

};

/* ======================================
   WATCHLIST NEWS
====================================== */

NewsEngine.prototype.watchlistNews=async function(

    symbols=[]

){

    const result=[];

    for(const symbol of symbols){

        const news=

            await this.companyNews(

                symbol,

                5

            );

        result.push({

            symbol,

            news

        });

    }

    return result;

};

/* ======================================
   PORTFOLIO NEWS
====================================== */

NewsEngine.prototype.portfolioNews=function(

    portfolio=[]

){

    return this.watchlistNews(

        portfolio.map(

            x=>x.symbol

        )

    );

};

/* ======================================
   MARKET DASHBOARD
====================================== */

NewsEngine.prototype.dashboard=async function(){

    const [

        market,

        economy,

        crypto

    ]=await Promise.all([

        this.marketNews(10),

        this.economy(10),

        this.crypto(10)

    ]);

    return{

        market,

        economy,

        crypto

    };

};

/* ======================================
   EXPORT
====================================== */

export default news;

export const marketNews=news.marketNews.bind(news);

export const companyNews=news.companyNews.bind(news);

export const category=news.category.bind(news);

export const searchNews=news.search.bind(news);

export const dashboard=news.dashboard.bind(news);

export const normalizeNews=news.normalize.bind(news);

export const normalizeList=news.normalizeList.bind(news);

export const trendingNews=news.trending.bind(news);

export const watchlistNews=news.watchlistNews.bind(news);

export const portfolioNews=news.portfolioNews.bind(news);

/* ==========================================================
   END OF NEWS.JS
   ========================================================== */