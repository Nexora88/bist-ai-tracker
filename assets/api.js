/*
========================================
BIST AI Tracker
API Manager
========================================
*/

const API = {

    BASE_URL: "",

    async getQuote(symbol) {

        if (!this.BASE_URL) {
            throw new Error("API adresi tanımlanmadı.")
        }

        const response = await fetch(
            `${this.BASE_URL}/quote?symbol=${symbol}`
        )

        if (!response.ok) {
            throw new Error("Veri alınamadı.")
        }

        return await response.json()

    }

}