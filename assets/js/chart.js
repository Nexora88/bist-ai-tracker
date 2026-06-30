/*
========================================
BIST AI Tracker
Chart Manager
========================================
*/

const ChartManager = {

    chart: null,
    labels: [],
    prices: [],

    init() {

        const canvas = document.getElementById("priceChart")

        if (!canvas) {
            return
        }

        this.chart = new Chart(canvas, {

            type: "line",

            data: {

                labels: [],

                datasets: [

                    {

                        label: "Fiyat",

                        data: [],

                        borderWidth: 3,

                        tension: 0.35,

                        fill: true,

                        pointRadius: 0,

                        pointHoverRadius: 5,

                        borderColor: "#22c55e",

                        backgroundColor: "rgba(34,197,94,.15)"

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                interaction: {

                    intersect: false,

                    mode: "index"

                },

                plugins: {

                    legend: {

                        display: false

                    }

                },

                scales: {

                    x: {

                        grid: {

                            display: false

                        }

                    },

                    y: {

                        grid: {

                            color: "rgba(255,255,255,.06)"

                        }

                    }

                }

            }

        })

    },
        update(prices) {

        if (!this.chart) {
            return
        }

        this.labels = []
        this.prices = []

        prices.forEach((item, index) => {

            this.labels.push(index + 1)

            this.prices.push(Number(item.close))

        })

        this.chart.data.labels = this.labels

        this.chart.data.datasets[0].data = this.prices

        const firstPrice = this.prices[0]

        const lastPrice = this.prices[this.prices.length - 1]

        const rising = lastPrice >= firstPrice

        this.chart.data.datasets[0].borderColor =
            rising ? "#22c55e" : "#ef4444"

        this.chart.data.datasets[0].backgroundColor =
            rising
                ? "rgba(34,197,94,.15)"
                : "rgba(239,68,68,.15)"

        this.chart.update()

    },

    clear() {

        if (!this.chart) {
            return
        }

        this.chart.data.labels = []

        this.chart.data.datasets[0].data = []

        this.chart.update()

    },
        destroy() {

        if (this.chart) {

            this.chart.destroy()

            this.chart = null

        }

    }

}

window.addEventListener("load", () => {

    ChartManager.init()

})