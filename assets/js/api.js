/*
========================================
BIST AI Tracker
API Manager
========================================
*/

const API = {

    BASE_URL: CONFIG.API_URL,

    async getQuote(symbol){

        const response = await fetch(
            `${this.BASE_URL}/quote?symbol=${symbol}`,
            {
                cache: "no-store"
            }
        );

        if(!response.ok){
            throw new Error("API bağlantı hatası.");
        }

        return await response.json();

    }

};

window.API = API;