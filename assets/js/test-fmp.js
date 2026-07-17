import { API_KEYS } from "./secrets.js";

async function testFMP() {

    try {

        const response = await fetch(

            `https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey=${API_KEYS.financialModelingPrep}`

        );

        if (!response.ok) {

            throw new Error(`HTTP ${response.status}`);

        }

        const data = await response.json();

        console.log("========== FMP TEST ==========");
        console.log(data);

    }

    catch (err) {

        console.error(err);

    }

}

testFMP();