class PriceChart {
    constructor() {
        this.chart = null;
        this.data = [];
        this.timeframe = '1h';
        this.indicator = 'none';
        this.secondaryIndicator = 'none';
        this.volumeEnabled = true;
        this.setupChart();
        this.setupEventListeners();
    }

    setupChart() {
        const ctx = document.getElementById('price-chart').getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Price',
                    data: [],
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    yAxisID: 'y'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute'
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    },
                    volume: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Price Chart'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(6);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    setupEventListeners() {
        document.getElementById('chart-timeframe').addEventListener('change', (e) => {
            this.timeframe = e.target.value;
            this.updateChart();
        });

        document.getElementById('chart-indicators').addEventListener('change', (e) => {
            this.indicator = e.target.value;
            this.updateChart();
        });

        document.getElementById('secondary-indicator').addEventListener('change', (e) => {
            this.secondaryIndicator = e.target.value;
            this.updateChart();
        });

        document.getElementById('toggle-volume').addEventListener('change', (e) => {
            this.volumeEnabled = e.target.checked;
            this.updateChart();
        });
    }

    updateData(newData) {
        this.data = newData;
        this.updateChart();
    }

    updateChart() {
        const labels = this.data.map(d => new Date(d.timestamp));
        const prices = this.data.map(d => d.price);
        const volumes = this.data.map(d => d.volume || 0);

        this.chart.data.labels = labels;
        this.chart.data.datasets = [{
            label: 'Price',
            data: prices,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1,
            yAxisID: 'y'
        }];

        // Add volume if enabled
        if (this.volumeEnabled) {
            this.chart.data.datasets.push({
                label: 'Volume',
                data: volumes,
                type: 'bar',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                yAxisID: 'volume'
            });
        }

        // Add primary indicator
        if (this.indicator !== 'none') {
            const indicatorData = this.calculateIndicator(this.indicator, prices);
            this.chart.data.datasets.push({
                label: this.indicator.toUpperCase(),
                data: indicatorData,
                borderColor: this.getIndicatorColor(this.indicator),
                tension: 0.1,
                yAxisID: 'y'
            });
        }

        // Add secondary indicator
        if (this.secondaryIndicator !== 'none' && this.secondaryIndicator !== this.indicator) {
            const secondaryData = this.calculateIndicator(this.secondaryIndicator, prices);
            this.chart.data.datasets.push({
                label: this.secondaryIndicator.toUpperCase(),
                data: secondaryData,
                borderColor: this.getIndicatorColor(this.secondaryIndicator),
                tension: 0.1,
                yAxisID: 'y'
            });
        }

        this.chart.update();
    }

    calculateIndicator(type, prices) {
        switch (type) {
            case 'sma':
                return this.calculateSMA(prices);
            case 'ema':
                return this.calculateEMA(prices);
            case 'rsi':
                return this.calculateRSI(prices);
            case 'macd':
                return this.calculateMACD(prices);
            case 'bollinger':
                return this.calculateBollingerBands(prices);
            case 'stochastic':
                return this.calculateStochastic(prices);
            case 'atr':
                return this.calculateATR(prices);
            default:
                return [];
        }
    }

    calculateSMA(prices, period = 14) {
        const sma = [];
        for (let i = 0; i < prices.length; i++) {
            if (i < period - 1) {
                sma.push(null);
                continue;
            }
            const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            sma.push(sum / period);
        }
        return sma;
    }

    calculateEMA(prices, period = 14) {
        const ema = [];
        const multiplier = 2 / (period + 1);
        let currentEMA = prices[0];

        for (let i = 0; i < prices.length; i++) {
            if (i === 0) {
                ema.push(currentEMA);
                continue;
            }
            currentEMA = (prices[i] - currentEMA) * multiplier + currentEMA;
            ema.push(currentEMA);
        }
        return ema;
    }

    calculateRSI(prices, period = 14) {
        const rsi = [];
        const changes = [];
        
        for (let i = 1; i < prices.length; i++) {
            changes.push(prices[i] - prices[i - 1]);
        }

        let avgGain = 0;
        let avgLoss = 0;
        for (let i = 0; i < period; i++) {
            if (changes[i] > 0) {
                avgGain += changes[i];
            } else {
                avgLoss -= changes[i];
            }
        }
        avgGain /= period;
        avgLoss /= period;

        for (let i = 0; i < prices.length; i++) {
            if (i < period) {
                rsi.push(null);
                continue;
            }

            if (i > period) {
                const change = changes[i - 1];
                if (change > 0) {
                    avgGain = (avgGain * (period - 1) + change) / period;
                    avgLoss = (avgLoss * (period - 1)) / period;
                } else {
                    avgGain = (avgGain * (period - 1)) / period;
                    avgLoss = (avgLoss * (period - 1) - change) / period;
                }
            }

            const rs = avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));
        }

        return rsi;
    }

    calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const fastEMA = this.calculateEMA(prices, fastPeriod);
        const slowEMA = this.calculateEMA(prices, slowPeriod);
        const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
        const signalLine = this.calculateEMA(macdLine, signalPeriod);
        return macdLine.map((macd, i) => macd - signalLine[i]);
    }

    calculateBollingerBands(prices, period = 20, stdDev = 2) {
        const sma = this.calculateSMA(prices, period);
        const upperBand = [];
        const lowerBand = [];

        for (let i = 0; i < prices.length; i++) {
            if (i < period - 1) {
                upperBand.push(null);
                lowerBand.push(null);
                continue;
            }

            const slice = prices.slice(i - period + 1, i + 1);
            const variance = slice.reduce((acc, val) => acc + Math.pow(val - sma[i], 2), 0) / period;
            const standardDeviation = Math.sqrt(variance);

            upperBand.push(sma[i] + (standardDeviation * stdDev));
            lowerBand.push(sma[i] - (standardDeviation * stdDev));
        }

        return {
            middle: sma,
            upper: upperBand,
            lower: lowerBand
        };
    }

    calculateStochastic(prices, period = 14, smoothPeriod = 3) {
        const k = [];
        const d = [];

        for (let i = 0; i < prices.length; i++) {
            if (i < period - 1) {
                k.push(null);
                d.push(null);
                continue;
            }

            const slice = prices.slice(i - period + 1, i + 1);
            const high = Math.max(...slice);
            const low = Math.min(...slice);
            const current = prices[i];

            const kValue = ((current - low) / (high - low)) * 100;
            k.push(kValue);
        }

        // Calculate smoothed %K
        const smoothedK = this.calculateSMA(k, smoothPeriod);

        // Calculate smoothed %D
        const smoothedD = this.calculateSMA(smoothedK, smoothPeriod);

        return {
            k: smoothedK,
            d: smoothedD
        };
    }

    calculateATR(prices, period = 14) {
        const atr = [];
        const trueRanges = [];

        for (let i = 1; i < prices.length; i++) {
            const high = prices[i];
            const low = prices[i];
            const prevClose = prices[i - 1];

            const tr1 = high - low;
            const tr2 = Math.abs(high - prevClose);
            const tr3 = Math.abs(low - prevClose);

            trueRanges.push(Math.max(tr1, tr2, tr3));
        }

        let atrValue = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
        atr.push(atrValue);

        for (let i = period; i < prices.length - 1; i++) {
            atrValue = ((atrValue * (period - 1)) + trueRanges[i]) / period;
            atr.push(atrValue);
        }

        return atr;
    }

    getIndicatorColor(type) {
        switch (type) {
            case 'sma':
                return 'rgb(255, 99, 132)';
            case 'ema':
                return 'rgb(54, 162, 235)';
            case 'rsi':
                return 'rgb(153, 102, 255)';
            case 'macd':
                return 'rgb(255, 159, 64)';
            case 'bollinger':
                return 'rgb(75, 192, 192)';
            case 'stochastic':
                return 'rgb(255, 99, 132)';
            case 'atr':
                return 'rgb(153, 102, 255)';
            default:
                return 'rgb(75, 192, 192)';
        }
    }
}

// Initialize chart when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.priceChart = new PriceChart();
}); 