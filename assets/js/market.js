/*
========================================
BIST AI Tracker
Market Manager
========================================
*/

const Market = {

    getMarket(symbol) {

        if (!symbol) return "BIST"

        symbol = symbol.toUpperCase()

        if (symbol.endsWith("USDT")) {
            return "CRYPTO"
        }

        if (symbol.includes(".")) {
            return "BIST"
        }

        return "BIST"

    },

    normalize(symbol) {

        const market = this.getMarket(symbol)

        switch (market) {

            case "BIST":
                return symbol.replace(".IS", "") + ".IS"

            case "CRYPTO":
                return symbol.toUpperCase()

            default:
                return symbol.toUpperCase()

        }

    }

}