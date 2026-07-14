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

