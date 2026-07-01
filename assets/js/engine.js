// ===============================
// BIST AI Tracker Engine v2.0
// ===============================

const Engine = {

    symbol: "",

    refreshInterval: 10000,

    previousPrice: null,

    timer: null,

    apiUrl(symbol){
        return `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.IS?interval=1m&range=1d`;
    },

    async load(symbol){

        this.symbol = symbol;

        try{

            const response = await fetch(this.apiUrl(symbol),{
                cache:"no-store"
            });

            if(!response.ok){
                throw new Error("API Hatası");
            }

            const json = await response.json();

            const result = json.chart.result[0];

            const meta = result.meta;

            const quote = result.indicators.quote[0];

            const price =
                meta.regularMarketPrice ??
                meta.previousClose;

            const change =
                meta.regularMarketChangePercent ?? 0;

            const volume =
                quote.volume.at(-1) ?? 0;

            const high =
                meta.regularMarketDayHigh;

            const low =
                meta.regularMarketDayLow;

            this.updatePrice(price);

            this.updateChange(change);

            this.setText("volume",
                Intl.NumberFormat("tr-TR").format(volume));

            this.setText("highLow",
                `${high.toFixed(2)} ₺ / ${low.toFixed(2)} ₺`);

            this.setText(
                "lastUpdate",
                new Date().toLocaleTimeString("tr-TR")
            );

            this.checkAlarm(price);
            if (window.ChartManager && Array.isArray(quote.close)) {

    const data = quote.close
        .filter(price => price !== null)
        .slice(-50)
        .map(price => ({
            close: Number(price)
        }))

    ChartManager.update(data)

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

            this.load(this.symbol);

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

    const key="alarm_"+this.symbol;

    const target=parseFloat(localStorage.getItem(key));

    if(!target) return;

    if(price>=target){

        if(Notification.permission==="granted"){

            new Notification(this.symbol,{
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

    this.load(this.symbol);

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