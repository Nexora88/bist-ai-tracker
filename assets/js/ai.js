/*
=========================================================
BIST AI Tracker
AL ANALİZ ENGINE v3.0
Developed by Ahmet Eymen Bakraç
=========================================================
*/

"use strict";

const AI = {

    VERSION: "3.0",

    NAME: "AL ANALİZ",

    SYMBOL: "",

    DATA: null,

    NEWS: [],

    HISTORY: [],

    SETTINGS: {

        MIN_HISTORY: 50,

        RSI_PERIOD: 14,

        EMA_FAST: 12,

        EMA_SLOW: 26,

        MACD_SIGNAL: 9,

        SMA_SHORT: 20,

        SMA_LONG: 50,

        VOLUME_PERIOD: 20,

        NEWS_WEIGHT: 15,

        TECHNICAL_WEIGHT: 45,

        TREND_WEIGHT: 25,

        VOLUME_WEIGHT: 15

    },

    SCORE: {

        total: 0,

        trend: 0,

        technical: 0,

        volume: 0,

        news: 0,

        risk: 0,

        confidence: 0

    },

    RESULT: {

        recommendation: "BEKLENİYOR",

        targetPrice: 0,

        stopLoss: 0,

        probability: 0,

        summary: "",

        reasons: []

    },

    async analyze(symbol, marketData, newsData = []) {

        this.SYMBOL = symbol;

        this.DATA = marketData;

        this.NEWS = newsData;

        this.HISTORY = marketData.history || [];

        this.reset();

        return true;

    },

    reset() {

        this.SCORE = {

            total: 0,

            trend: 0,

            technical: 0,

            volume: 0,

            news: 0,

            risk: 0,

            confidence: 0

        };

        this.RESULT = {

            recommendation: "BEKLENİYOR",

            targetPrice: 0,

            stopLoss: 0,

            probability: 0,

            summary: "",

            reasons: []

        };

    }

};

window.AI = AI;

/*=========================================================
BÖLÜM 2
AI Matematik ve Yardımcı Fonksiyonlar
=========================================================*/

AI.Utils = {

    toNumber(value) {

        const number = Number(value);

        return isNaN(number) ? 0 : number;

    },

    round(value, digit = 2) {

        return Number(this.toNumber(value).toFixed(digit));

    },

    percentChange(oldValue, newValue) {

        oldValue = this.toNumber(oldValue);
        newValue = this.toNumber(newValue);

        if (oldValue === 0) return 0;

        return ((newValue - oldValue) / oldValue) * 100;

    },

    average(array) {

        if (!array || array.length === 0)
            return 0;

        let total = 0;

        array.forEach(item => {

            total += this.toNumber(item);

        });

        return total / array.length;

    },

    sum(array) {

        let total = 0;

        array.forEach(item => {

            total += this.toNumber(item);

        });

        return total;

    },

    highest(array) {

        return Math.max(...array.map(Number));

    },

    lowest(array) {

        return Math.min(...array.map(Number));

    },

    median(array) {

        if (!array.length)
            return 0;

        const sorted = [...array].sort((a, b) => a - b);

        const middle = Math.floor(sorted.length / 2);

        if (sorted.length % 2 === 0) {

            return (sorted[middle - 1] + sorted[middle]) / 2;

        }

        return sorted[middle];

    },

    standardDeviation(array) {

        if (array.length < 2)
            return 0;

        const avg = this.average(array);

        let total = 0;

        array.forEach(item => {

            total += Math.pow(item - avg, 2);

        });

        return Math.sqrt(total / array.length);

    },

    maxDrawdown(array) {

        if (!array.length)
            return 0;

        let peak = array[0];

        let drawdown = 0;

        array.forEach(price => {

            if (price > peak)
                peak = price;

            const current = ((peak - price) / peak) * 100;

            if (current > drawdown)
                drawdown = current;

        });

        return drawdown;

    },

    volatility(array) {

        return this.standardDeviation(array);

    }

};

/*=========================================================
BÖLÜM 3
Trend Analiz Motoru
=========================================================*/

AI.Trend = {

    analyze(history) {

        if (!history || history.length < 20) {

            return {

                direction: "UNKNOWN",

                score: 0,

                strength: 0,

                description: "Yeterli veri bulunamadı."

            };

        }

        const prices = history.map(item => Number(item.close));

        const first = prices[0];

        const last = prices[prices.length - 1];

        const highest = Math.max(...prices);

        const lowest = Math.min(...prices);

        const average = AI.Utils.average(prices);

        const change = AI.Utils.percentChange(first, last);

        let direction = "YATAY";

        let score = 50;

        let strength = Math.abs(change);

        let description = "";

        if (change >= 8) {

            direction = "GÜÇLÜ YÜKSELİŞ";
            score = 100;
            description = "Fiyat güçlü yükseliş trendinde.";

        }

        else if (change >= 4) {

            direction = "YÜKSELİŞ";
            score = 85;
            description = "Pozitif trend devam ediyor.";

        }

        else if (change > 1) {

            direction = "HAFİF YÜKSELİŞ";
            score = 70;
            description = "Sınırlı yükseliş görülüyor.";

        }

        else if (change <= -8) {

            direction = "GÜÇLÜ DÜŞÜŞ";
            score = 10;
            description = "Negatif trend hakim.";

        }

        else if (change <= -4) {

            direction = "DÜŞÜŞ";
            score = 25;
            description = "Satış baskısı devam ediyor.";

        }

        else if (change < -1) {

            direction = "HAFİF DÜŞÜŞ";
            score = 40;
            description = "Zayıf görünüm sürüyor.";

        }

        AI.SCORE.trend = score;

        AI.RESULT.reasons.push(

            `Trend Analizi: ${direction}`

        );

        return {

            direction,

            score,

            strength,

            highest,

            lowest,

            average,

            change,

            description

        };

    }

};

/*=========================================================
BÖLÜM 4
RSI (Relative Strength Index)
=========================================================*/

AI.RSI = {

    calculate(history, period = AI.SETTINGS.RSI_PERIOD) {

        if (!history || history.length <= period) {

            return 50;

        }

        const closes = history.map(item => Number(item.close));

        let gains = 0;

        let losses = 0;

        for (let i = 1; i <= period; i++) {

            const diff = closes[i] - closes[i - 1];

            if (diff >= 0) {

                gains += diff;

            } else {

                losses += Math.abs(diff);

            }

        }

        const avgGain = gains / period;

        const avgLoss = losses / period;

        if (avgLoss === 0) {

            return 100;

        }

        const rs = avgGain / avgLoss;

        const rsi = 100 - (100 / (1 + rs));

        return AI.Utils.round(rsi);

    },

    analyze(history) {

        const rsi = this.calculate(history);

        let signal = "";

        let score = 50;

        let color = "gray";

        if (rsi >= 80) {

            signal = "Aşırı Alım";

            score = 20;

            color = "red";

        }

        else if (rsi >= 70) {

            signal = "Alım Bölgesi";

            score = 40;

            color = "orange";

        }

        else if (rsi >= 55) {

            signal = "Pozitif";

            score = 80;

            color = "green";

        }

        else if (rsi >= 45) {

            signal = "Nötr";

            score = 60;

            color = "blue";

        }

        else if (rsi >= 30) {

            signal = "Satış Bölgesi";

            score = 80;

            color = "green";

        }

        else {

            signal = "Aşırı Satım";

            score = 100;

            color = "lime";

        }

        AI.SCORE.technical += score / 2;

        AI.RESULT.reasons.push(

            `RSI (${rsi}) → ${signal}`

        );

        return {

            value: rsi,

            signal,

            score,

            color

        };

    }

};

/*=========================================================
BÖLÜM 5
EMA ve MACD Analiz Motoru
=========================================================*/

AI.MACD = {

    ema(prices, period) {

        const k = 2 / (period + 1);

        let ema = prices[0];

        const values = [ema];

        for (let i = 1; i < prices.length; i++) {

            ema = prices[i] * k + ema * (1 - k);

            values.push(ema);

        }

        return values;

    },

    calculate(history) {

        if (!history || history.length < AI.SETTINGS.EMA_SLOW) {

            return null;

        }

        const closes = history.map(x => Number(x.close));

        const fastEMA = this.ema(closes, AI.SETTINGS.EMA_FAST);

        const slowEMA = this.ema(closes, AI.SETTINGS.EMA_SLOW);

        const macd = [];

        for (let i = 0; i < closes.length; i++) {

            macd.push(fastEMA[i] - slowEMA[i]);

        }

        const signal = this.ema(macd, AI.SETTINGS.MACD_SIGNAL);

        const histogram = macd[macd.length - 1] - signal[signal.length - 1];

        return {

            macd: macd[macd.length - 1],

            signal: signal[signal.length - 1],

            histogram

        };

    },

    analyze(history) {

        const result = this.calculate(history);

        if (!result) {

            return {

                signal: "Yetersiz Veri",

                score: 50

            };

        }

        let score = 50;

        let signal = "";

        if (result.macd > result.signal) {

            signal = "AL";

            score = 90;

        }

        else if (result.macd < result.signal) {

            signal = "SAT";

            score = 20;

        }

        else {

            signal = "NÖTR";

            score = 50;

        }

        AI.SCORE.technical += score / 2;

        AI.RESULT.reasons.push(

            `MACD : ${signal}`

        );

        return {

            ...result,

            signal,

            score

        };

    }

};

/*=========================================================
BÖLÜM 6
SMA20 / SMA50 Trend Motoru
=========================================================*/

AI.MovingAverage = {

    sma(history, period) {

        if (!history || history.length < period)
            return 0;

        const closes = history
            .slice(-period)
            .map(item => Number(item.close));

        return AI.Utils.round(

            AI.Utils.average(closes)

        );

    },

    analyze(history) {

        if (!history || history.length < 50) {

            return {

                signal: "Yetersiz Veri",

                score: 50

            };

        }

        const sma20 = this.sma(history, 20);

        const sma50 = this.sma(history, 50);

        const currentPrice = Number(

            history[history.length - 1].close

        );

        let signal = "";

        let score = 50;

        let trend = "";

        if (sma20 > sma50) {

            trend = "Golden Cross";

            signal = "AL";

            score = 95;

        }

        else if (sma20 < sma50) {

            trend = "Death Cross";

            signal = "SAT";

            score = 20;

        }

        else {

            trend = "Nötr";

            signal = "BEKLE";

            score = 50;

        }

        if (currentPrice > sma20)
            score += 3;

        if (currentPrice > sma50)
            score += 2;

        score = Math.min(score, 100);

        AI.SCORE.technical += score / 2;

        AI.RESULT.reasons.push(

            `${trend} tespit edildi.`

        );

        return {

            sma20,

            sma50,

            currentPrice,

            trend,

            signal,

            score

        };

    }

};

/*=========================================================
BÖLÜM 7
Hacim Analiz Motoru
=========================================================*/

AI.Volume = {

    average(history, period = AI.SETTINGS.VOLUME_PERIOD) {

        if (!history || history.length < period) {

            return 0;

        }

        const volumes = history
            .slice(-period)
            .map(item => Number(item.volume || 0));

        return AI.Utils.average(volumes);

    },

    analyze(history) {

        if (!history || history.length < 2) {

            return {

                signal: "Yetersiz Veri",

                score: 50

            };

        }

        const currentVolume = Number(

            history[history.length - 1].volume || 0

        );

        const averageVolume = this.average(history);

        let ratio = 0;

        if (averageVolume > 0) {

            ratio = currentVolume / averageVolume;

        }

        let signal = "";

        let score = 50;

        if (ratio >= 2) {

            signal = "Çok Güçlü";

            score = 100;

        }

        else if (ratio >= 1.5) {

            signal = "Güçlü";

            score = 90;

        }

        else if (ratio >= 1.1) {

            signal = "Pozitif";

            score = 75;

        }

        else if (ratio >= 0.8) {

            signal = "Normal";

            score = 60;

        }

        else {

            signal = "Zayıf";

            score = 30;

        }

        AI.SCORE.volume = score;

        AI.RESULT.reasons.push(

            `Hacim Analizi: ${signal}`

        );

        return {

            currentVolume,

            averageVolume,

            ratio: AI.Utils.round(ratio),

            signal,

            score

        };

    }

};

/*=========================================================
BÖLÜM 8
Destek & Direnç Analiz Motoru
=========================================================*/

AI.SupportResistance = {

    calculate(history) {

        if (!history || history.length < 30) {

            return null;

        }

        const prices = history.map(item => Number(item.close));

        const sorted = [...prices].sort((a, b) => a - b);

        const support = sorted[Math.floor(sorted.length * 0.15)];

        const resistance = sorted[Math.floor(sorted.length * 0.85)];

        const current = prices[prices.length - 1];

        return {

            support: AI.Utils.round(support),

            resistance: AI.Utils.round(resistance),

            current: AI.Utils.round(current)

        };

    },

    analyze(history) {

        const result = this.calculate(history);

        if (!result) {

            return {

                signal: "Yetersiz Veri",

                score: 50

            };

        }

        let signal = "";

        let score = 50;

        const distanceSupport =

            Math.abs(result.current - result.support);

        const distanceResistance =

            Math.abs(result.resistance - result.current);

        if (distanceSupport < distanceResistance) {

            signal = "Destek Bölgesinde";

            score = 85;

        }

        else if (distanceResistance < distanceSupport) {

            signal = "Dirence Yakın";

            score = 35;

        }

        else {

            signal = "Orta Bölge";

            score = 60;

        }

        AI.RESULT.reasons.push(

            `Destek: ${result.support}₺`

        );

        AI.RESULT.reasons.push(

            `Direnç: ${result.resistance}₺`

        );

        AI.SCORE.technical += score / 2;

        return {

            ...result,

            signal,

            score

        };

    }

};