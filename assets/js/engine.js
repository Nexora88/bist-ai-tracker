// ===============================
// BIST AI Tracker Engine v2.0
// ===============================

const Engine = {

    currentSymbol: "",

    refreshInterval: CONFIG.REFRESH_INTERVAL,

    previousPrice: null,

    timer: null,


    async load(symbol){

        this.currentSymbol = Market.normalize(symbol);

        try{


            const json = await API.getQuote(symbol);

            const result = json.chart?.result?.[0];

if (!result) {
    throw new Error("API veri döndürmedi.");
}


            const meta = result.meta;

            if (!meta) {
     throw new Error("Meta verisi bulunamadı.");
}

            const quote = result.indicators?.quote?.[0];

if (!quote) {
    throw new Error("Veri bulunamadı.");
}


            const price =
                meta.regularMarketPrice ??
                meta.previousClose;

            const change =
                meta.regularMarketChangePercent ?? 0;

            const volume =
                quote.volume?.at(-1) ?? 0;
            const high =
                meta.regularMarketDayHigh;

            const low =
                meta.regularMarketDayLow;

            this.setText(
    "highLow",
    `${(high ?? 0).toFixed(2)} ₺ / ${(low ?? 0).toFixed(2)} ₺`
);

            this.updatePrice(price);

            this.updateChange(change);

            this.setText("volume",
                Intl.NumberFormat("tr-TR").format(volume));


            this.setText(
                "lastUpdate",
                new Date().toLocaleTimeString("tr-TR")
            );

            this.checkAlarm(price);
            const closes = quote.close ?? [];

if (window.ChartManager && closes.length) {

    const data = closes
        .filter(price => price !== null)
        .slice(-50)
        .map(price => ({
            close: Number(price)
        }));

    ChartManager.update(data);

}

}


        catch(err){

            console.error(err);

            this.setText(
                "connectionStatus",
                "❌ Veri alınamadı"
            );

        }

    },

    updatePrice(price){

        const el=document.getElementById("currentPrice");

        if(!el) return;

        el.textContent=price.toFixed(2)+" ₺";

        if(this.previousPrice!==null){

            if(price>this.previousPrice){

                el.classList.remove("flash-down");

                el.classList.add("flash-up");

            }

            if(price<this.previousPrice){

                el.classList.remove("flash-up");

                el.classList.add("flash-down");

            }

        }

        this.previousPrice=price;

    },

    updateChange(change){

        const el=document.getElementById("changePercent");

        if(!el) return;

        el.textContent=
            (change>=0?"▲ +":"▼ ")
            +change.toFixed(2)+"%";

        el.className=
            change>=0
            ?"change up"
            :"change down";

    },

    setText(id,text){

        const el=document.getElementById(id);

        if(el){

            el.textContent=text;

        }

    },

    start(){

        if(this.timer){

            clearInterval(this.timer);

        }

        this.timer=setInterval(()=>{

            this.load(this.currentSymbol);

        },this.refreshInterval);

    }

};
// ===============================
// Borsa Durumu
// ===============================

Engine.isMarketOpen=function(){

    const now=new Date();

    const day=now.getDay();

    if(day===0||day===6){

        return false;

    }

    const minutes=
        now.getHours()*60+
        now.getMinutes();

    const open=9*60+40;

    const close=18*60+10;

    return minutes>=open&&minutes<=close;

};

Engine.updateMarketStatus=function(){

    const status=document.getElementById("marketStatus");

    if(!status) return;

    if(this.isMarketOpen()){

        status.textContent="🟢 Borsa Açık";

        status.className="market-status market-open";

    }else{

        status.textContent="🔴 Borsa Kapalı";

        status.className="market-status market-closed";

    }

};

Engine.updateCountdown=function(){

    const el=document.getElementById("marketCountdown");

    if(!el) return;

    const now=new Date();

    let target=new Date();

    if(this.isMarketOpen()){

        target.setHours(18,10,0,0);

        const diff=target-now;

        const h=Math.floor(diff/3600000);

        const m=Math.floor((diff%3600000)/60000);

        const s=Math.floor((diff%60000)/1000);

        el.textContent=`Kapanışa ${h}s ${m}dk ${s}sn`;

    }else{

        target.setHours(9,40,0,0);

        if(now.getHours()>18){

            target.setDate(target.getDate()+1);

        }

        while(target.getDay()===0||target.getDay()===6){

            target.setDate(target.getDate()+1);

        }

        const diff=target-now;

        const h=Math.floor(diff/3600000);

        const m=Math.floor((diff%3600000)/60000);

        el.textContent=`Açılışa ${h}s ${m}dk`;

    }

};

setInterval(()=>{

    Engine.updateMarketStatus();

    Engine.updateCountdown();

},1000);
// ===============================
// Alarm Sistemi
// ===============================

Engine.checkAlarm=function(price){

    const key="alarm_"+this.currentSymbol;

    const target=parseFloat(localStorage.getItem(key));

    if(!target) return;

    if(price>=target){

        if(Notification.permission==="granted"){

            new Notification(this.currentSymbol,{
                body:`${target.toFixed(2)} ₺ seviyesine ulaştı.`
            });

        }

        localStorage.removeItem(key);

    }

};

// ===============================
// İnternet Durumu
// ===============================

Engine.updateConnection=function(){

    const el=document.getElementById("connectionStatus");

    if(!el) return;

    if(navigator.onLine){

        el.textContent="🟢 Canlı Veri";

        el.className="up";

    }else{

        el.textContent="🔴 İnternet Yok";

        el.className="down";

    }

};

window.addEventListener("online",()=>Engine.updateConnection());

window.addEventListener("offline",()=>Engine.updateConnection());

// ===============================
// Manuel Yenile
// ===============================

Engine.refresh=function(){

    this.load(this.currentSymbol);

};

// ===============================
// Başlat
// ===============================

Engine.init=function(symbol){

    if(Notification.permission==="default"){

        Notification.requestPermission();

    }

    this.load(symbol);

    this.start();

    this.updateMarketStatus();

    this.updateCountdown();

    this.updateConnection();

};

window.Engine=Engine;

/*=========================================================
BÖLÜM 1
AI Motor Bağlantısı
=========================================================*/

Engine.updateAI = async function(history, news) {

    if (!window.AI) {

        console.warn("AI Motoru yüklenmedi.");

        return;

    }

    try {

        const analysis = await AI.Engine.run(

            this.currentSymbol,

            history,

            news

        );

        this.lastAnalysis = analysis;

        this.updateAIWidgets(analysis);

    }

    catch(error) {

        console.error(

            "AI Analiz Hatası:",

            error

        );

    }

};

Engine.updateAIWidgets = function(result) {

    this.setText(

        "aiRecommendation",

        result.decision.recommendation

    );

    this.setText(

        "aiConfidence",

        result.confidence.score + "%"

    );

    this.setText(

        "targetPrice",

        result.target.targetPrice + " ₺"

    );

    this.setText(

        "stopLoss",

        result.target.stopLoss + " ₺"

    );

    this.setText(

        "riskLevel",

        result.risk.level

    );

};

/*=========================================================
BÖLÜM 2
News.js Bağlantısı
=========================================================*/

Engine.updateNews = async function() {

    if (!window.News) {

        console.warn("News Engine yüklenmedi.");

        return;

    }

    try {

        const news = await News.get(

            this.currentSymbol

        );

        this.lastNews = news;

        this.renderNews(news);

    }

    catch(error) {

        console.error(

            "News Engine Hatası:",

            error

        );

    }

};

Engine.renderNews = function(news) {

    const container =

        document.getElementById("newsContainer");

    if (!container)
        return;

    News.render(

        news,

        "newsContainer"

    );

    const stats =

        News.Statistics.generate(news);

    this.setText(

        "newsCount",

        stats.total

    );

    this.setText(

        "newsPositive",

        stats.positive

    );

    this.setText(

        "newsNegative",

        stats.negative

    );

    this.setText(

        "newsAverage",

        stats.averageScore + "/100"

    );

};

/*=========================================================
BÖLÜM 3
Portföy Bağlantısı
=========================================================*/

Engine.updatePortfolio = function(price) {

    if (!window.Portfolio) {

        return;

    }

    try {

        const portfolio =

            Portfolio.get(this.currentSymbol);

        if (!portfolio)
            return;

        const currentValue =

            portfolio.lot * price;

        const costValue =

            portfolio.lot * portfolio.averageCost;

        const profit =

            currentValue - costValue;

        const percent =

            ((profit / costValue) * 100) || 0;

        this.setText(

            "portfolioLot",

            portfolio.lot

        );

        this.setText(

            "portfolioCost",

            portfolio.averageCost.toFixed(2) + " ₺"

        );

        this.setText(

            "portfolioValue",

            currentValue.toFixed(2) + " ₺"

        );

        this.setText(

            "portfolioProfit",

            profit.toFixed(2) + " ₺"

        );

        this.setText(

            "portfolioPercent",

            percent.toFixed(2) + "%"

        );

    }

    catch(error) {

        console.error(

            "Portfolio Engine Hatası:",

            error

        );

    }

};

Engine.refreshDashboard = function(price) {

    this.updatePortfolio(price);

};

/*=========================================================
BÖLÜM 4
Dashboard Manager
=========================================================*/

Engine.updateDashboard = async function(history = [], price = 0) {

    try {

        await this.updateNews();

        await this.updateAI(

            history,

            this.lastNews || []

        );

        this.updatePortfolio(price);

        this.updateMarketStatus();

        this.updateCountdown();

        this.updateConnection();

        this.setText(

            "engineStatus",

            "🟢 Sistem Aktif"

        );

        console.log(

            "[Engine] Dashboard güncellendi."

        );

    }

    catch(error) {

        console.error(

            "Dashboard Güncelleme Hatası:",

            error

        );

        this.setText(

            "engineStatus",

            "🔴 Sistem Hatası"

        );

    }

};

/*=========================================================
BÖLÜM 5
Gelişmiş Hata Yönetimi
=========================================================*/

Engine.ErrorManager = {

    errors: [],

    maxErrors: 100,

    log(type, message, details = null) {

        const error = {

            type,

            message,

            details,

            time: new Date().toLocaleString("tr-TR")

        };

        this.errors.unshift(error);

        if (this.errors.length > this.maxErrors) {

            this.errors.pop();

        }

        console.error(

            `[${type}] ${message}`,

            details

        );

    },

    getLast() {

        return this.errors[0] || null;

    },

    getAll() {

        return [...this.errors];

    },

    clear() {

        this.errors = [];

    }

};

Engine.safeRun = async function(task) {

    try {

        return await task();

    }

    catch(error) {

        Engine.ErrorManager.log(

            "ENGINE",

            error.message,

            error

        );

        return null;

    }

};

/*=========================================================
BÖLÜM 6
Performans ve Cache
=========================================================*/

Engine.Performance = {

    cache: new Map(),

    maxCacheSize: 50,

    stats: {

        requests: 0,

        cacheHits: 0,

        cacheMisses: 0,

        lastUpdate: null

    },

    set(key, value) {

        if (this.cache.size >= this.maxCacheSize) {

            const firstKey = this.cache.keys().next().value;

            this.cache.delete(firstKey);

        }

        this.cache.set(key, {

            value,

            time: Date.now()

        });

    },

    get(key, maxAge = 30000) {

        const item = this.cache.get(key);

        if (!item) {

            this.stats.cacheMisses++;

            return null;

        }

        if (Date.now() - item.time > maxAge) {

            this.cache.delete(key);

            this.stats.cacheMisses++;

            return null;

        }

        this.stats.cacheHits++;

        return item.value;

    },

    clear() {

        this.cache.clear();

    },

    request() {

        this.stats.requests++;

        this.stats.lastUpdate = new Date();

    }

};

Engine.optimize = function() {

    this.Performance.request();

    if (this.Performance.cache.size > this.Performance.maxCacheSize) {

        this.Performance.clear();

    }

};

/*=========================================================
BÖLÜM 7
Engine Final
=========================================================*/

Engine.VERSION = "3.0.0";

Engine.APP_NAME = "BIST AI Tracker";

Engine.AUTHOR = "Ahmet Eymen Bakraç";

Engine.COPYRIGHT =
"© 2026 Ahmet Eymen Bakraç. Tüm Hakları Saklıdır.";

Engine.DISCLAIMER =
"Bu uygulama yalnızca eğitim ve bilgilendirme amacıyla geliştirilmiştir. Sunulan analizler, haberler, yapay zekâ yorumları ve grafikler yatırım tavsiyesi değildir. Kullanıcılar finansal kararlarından tamamen kendileri sorumludur.";

Engine.about = function () {

    return {

        application: this.APP_NAME,

        version: this.VERSION,

        author: this.AUTHOR,

        copyright: this.COPYRIGHT,

        disclaimer: this.DISCLAIMER,

        currentSymbol: this.currentSymbol,

        marketOpen: this.isMarketOpen(),

        online: navigator.onLine

    };

};

Engine.reset = function () {

    this.previousPrice = null;

    this.currentSymbol = "";

    this.lastNews = [];

    this.lastAnalysis = null;

    if (this.Performance) {

        this.Performance.clear();

    }

    if (window.News) {

        News.clearCache();

    }

};

Engine.restart = async function(symbol) {

    this.reset();

    await this.init(symbol);

};

Engine.destroy = function() {

    if (this.timer) {

        clearInterval(this.timer);

        this.timer = null;

    }

    this.reset();

    console.log(

        `${this.APP_NAME} Engine durduruldu.`

    );

};

Object.freeze(Engine);

console.log(

`%c${Engine.APP_NAME} Engine v${Engine.VERSION} Hazır`,

"color:#22c55e;font-size:15px;font-weight:bold;"

);