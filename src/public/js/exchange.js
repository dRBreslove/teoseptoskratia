class DecentralizedExchange {
    constructor() {
        this.orders = new Map();
        this.trades = [];
        this.prices = new Map();
        this.connections = new Map();
        this.rateLimits = new Map();
        this.orderSignatures = new Map();
        this.trailingStops = new Map();
        this.icebergOrders = new Map();
        this.setupEventListeners();
        this.setupSecurity();
    }

    setupSecurity() {
        // Rate limiting configuration
        this.rateLimitConfig = {
            maxOrdersPerMinute: 10,
            maxOrdersPerHour: 100,
            maxAmountPerOrder: 1000000,
            maxIcebergChunks: 10
        };

        // Initialize rate limit tracking
        this.rateLimits.set('ordersPerMinute', []);
        this.rateLimits.set('ordersPerHour', []);
    }

    initialize() {
        this.loadInitialData();
        this.setupWebSocketConnections();
        this.startPriceUpdates();
        this.startTrailingStopUpdates();
        this.startIcebergOrderUpdates();
    }

    setupEventListeners() {
        // Coin selection change handlers
        document.getElementById('buy-coin').addEventListener('change', (e) => this.updateBuyPrice(e.target.value));
        document.getElementById('sell-coin').addEventListener('change', (e) => this.updateSellPrice(e.target.value));

        // Amount input handlers
        document.getElementById('buy-amount').addEventListener('input', (e) => this.updateBuyTotal(e.target.value));
        document.getElementById('sell-amount').addEventListener('input', (e) => this.updateSellTotal(e.target.value));

        // Order type change handlers
        document.getElementById('order-type').addEventListener('change', (e) => this.updateOrderForm(e.target.value));
        document.getElementById('sell-order-type').addEventListener('change', (e) => this.updateSellOrderForm(e.target.value));

        // Stop loss and take profit handlers
        document.getElementById('stop-loss').addEventListener('input', (e) => this.validateStopLoss(e.target.value));
        document.getElementById('take-profit').addEventListener('input', (e) => this.validateTakeProfit(e.target.value));
        document.getElementById('sell-stop-loss').addEventListener('input', (e) => this.validateStopLoss(e.target.value));
        document.getElementById('sell-take-profit').addEventListener('input', (e) => this.validateTakeProfit(e.target.value));

        // Trailing stop handlers
        document.getElementById('trailing-stop').addEventListener('input', (e) => this.validateTrailingStop(e.target.value));
        document.getElementById('sell-trailing-stop').addEventListener('input', (e) => this.validateTrailingStop(e.target.value));

        // Iceberg order handlers
        document.getElementById('iceberg-visibility').addEventListener('input', (e) => this.validateIcebergOrder(e.target.value));
        document.getElementById('iceberg-chunks').addEventListener('input', (e) => this.validateIcebergChunks(e.target.value));
        document.getElementById('sell-iceberg-visibility').addEventListener('input', (e) => this.validateIcebergOrder(e.target.value));
        document.getElementById('sell-iceberg-chunks').addEventListener('input', (e) => this.validateIcebergChunks(e.target.value));

        // Order book and trade history handlers
        document.getElementById('toggle-cumulative').addEventListener('change', (e) => this.toggleOrderBookCumulative(e.target.checked));
        document.getElementById('toggle-trade-details').addEventListener('change', (e) => this.toggleTradeDetails(e.target.checked));
    }

    setupWebSocketConnections() {
        const namespaces = ['our-circle', 'itay-circle', 'shiriloo-circle'];
        const ports = [8080, 8081, 8082];

        namespaces.forEach((namespace, index) => {
            const ws = new WebSocket(`ws://localhost:${ports[index]}`);
            
            ws.onopen = () => {
                console.log(`Connected to ${namespace} exchange`);
                this.connections.set(namespace, ws);
                this.requestOrderBook(namespace);
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleExchangeMessage(namespace, data);
            };

            ws.onerror = (error) => {
                console.error(`Exchange WebSocket error for ${namespace}:`, error);
            };

            ws.onclose = () => {
                console.log(`Disconnected from ${namespace} exchange`);
                this.connections.delete(namespace);
            };
        });
    }

    handleExchangeMessage(namespace, data) {
        const { type, payload } = data;

        switch (type) {
            case 'orderBook':
                this.updateOrderBook(namespace, payload);
                break;
            case 'trade':
                this.addTrade(payload);
                break;
            case 'price':
                this.updatePrice(namespace, payload);
                break;
        }
    }

    loadInitialData() {
        // Load initial order book and trade history
        this.requestOrderBook();
        this.loadTradeHistory();
    }

    requestOrderBook(namespace = null) {
        const message = {
            type: 'getOrderBook',
            namespace: namespace
        };

        if (namespace) {
            const ws = this.connections.get(namespace);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
            }
        } else {
            this.connections.forEach((ws, ns) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ ...message, namespace: ns }));
                }
            });
        }
    }

    loadTradeHistory() {
        // Load recent trades from local storage or API
        const savedTrades = localStorage.getItem('tradeHistory');
        if (savedTrades) {
            this.trades = JSON.parse(savedTrades);
            this.updateTradeHistory();
        }
    }

    updateOrderBook(namespace, orders) {
        this.orders.set(namespace, orders);
        this.renderOrderBook();
    }

    updatePrice(namespace, priceData) {
        const { coin, price, change } = priceData;
        this.prices.set(`${namespace}:${coin}`, { price, change });
        this.updatePriceDisplay(coin);
    }

    updatePriceDisplay(coin) {
        const buyPrice = document.getElementById('buy-price');
        const sellPrice = document.getElementById('sell-price');
        const buyChange = document.getElementById('buy-price-change');
        const sellChange = document.getElementById('sell-price-change');

        // Update price displays based on selected coins
        const buyCoin = document.getElementById('buy-coin').value;
        const sellCoin = document.getElementById('sell-coin').value;

        if (buyCoin === coin) {
            const priceData = this.prices.get(`${buyCoin}:${coin}`);
            if (priceData) {
                buyPrice.textContent = priceData.price.toFixed(6);
                buyChange.textContent = `${priceData.change > 0 ? '+' : ''}${priceData.change.toFixed(2)}%`;
                buyChange.className = priceData.change >= 0 ? 'positive' : 'negative';
            }
        }

        if (sellCoin === coin) {
            const priceData = this.prices.get(`${sellCoin}:${coin}`);
            if (priceData) {
                sellPrice.textContent = priceData.price.toFixed(6);
                sellChange.textContent = `${priceData.change > 0 ? '+' : ''}${priceData.change.toFixed(2)}%`;
                sellChange.className = priceData.change >= 0 ? 'positive' : 'negative';
            }
        }
    }

    updateBuyTotal(amount) {
        const coin = document.getElementById('buy-coin').value;
        if (coin) {
            const priceData = this.prices.get(coin);
            if (priceData) {
                const total = amount * priceData.price;
                // Update total display if needed
            }
        }
    }

    updateSellTotal(amount) {
        const coin = document.getElementById('sell-coin').value;
        if (coin) {
            const priceData = this.prices.get(coin);
            if (priceData) {
                const total = amount * priceData.price;
                // Update total display if needed
            }
        }
    }

    addTrade(trade) {
        this.trades.unshift(trade);
        if (this.trades.length > 100) {
            this.trades.pop();
        }
        this.updateTradeHistory();
        localStorage.setItem('tradeHistory', JSON.stringify(this.trades));
    }

    renderOrderBook(showCumulative = true) {
        const tbody = document.getElementById('order-book-body');
        tbody.innerHTML = '';

        this.orders.forEach((orders, namespace) => {
            if (showCumulative) {
                const cumulativeOrders = this.calculateCumulativeOrders(orders);
                this.renderOrderBookRows(tbody, cumulativeOrders, namespace);
            } else {
                this.renderOrderBookRows(tbody, orders, namespace);
            }
        });
    }

    calculateCumulativeOrders(orders) {
        const cumulative = new Map();
        orders.forEach(order => {
            const price = order.price;
            if (!cumulative.has(price)) {
                cumulative.set(price, {
                    price,
                    amount: 0,
                    type: order.type
                });
            }
            cumulative.get(price).amount += order.amount;
        });
        return Array.from(cumulative.values());
    }

    renderOrderBookRows(tbody, orders, namespace) {
        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.price.toFixed(6)}</td>
                <td>${order.amount.toFixed(6)}</td>
                <td>${(order.price * order.amount).toFixed(6)}</td>
                <td>${order.type}</td>
                <td>${new Date(order.timestamp).toLocaleTimeString()}</td>
            `;
            tbody.appendChild(row);
        });
    }

    updateTradeHistory() {
        const tbody = document.getElementById('trade-history-body');
        tbody.innerHTML = '';

        this.trades.forEach(trade => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(trade.timestamp).toLocaleTimeString()}</td>
                <td>${trade.price.toFixed(6)}</td>
                <td>${trade.amount.toFixed(6)}</td>
                <td>${(trade.price * trade.amount).toFixed(6)}</td>
                <td>${trade.type}</td>
                ${showDetails ? `<td>${trade.namespace}</td>` : ''}
            `;
            tbody.appendChild(row);
        });
    }

    startPriceUpdates() {
        // Start periodic price updates
        setInterval(() => {
            this.requestOrderBook();
        }, 5000);
    }

    validateRateLimit() {
        const now = Date.now();
        const minuteAgo = now - 60000;
        const hourAgo = now - 3600000;

        // Clean up old timestamps
        this.rateLimits.get('ordersPerMinute').filter(timestamp => timestamp > minuteAgo);
        this.rateLimits.get('ordersPerHour').filter(timestamp => timestamp > hourAgo);

        // Check limits
        if (this.rateLimits.get('ordersPerMinute').length >= this.rateLimitConfig.maxOrdersPerMinute) {
            throw new Error('Rate limit exceeded: Too many orders per minute');
        }
        if (this.rateLimits.get('ordersPerHour').length >= this.rateLimitConfig.maxOrdersPerHour) {
            throw new Error('Rate limit exceeded: Too many orders per hour');
        }

        // Update rate limit tracking
        this.rateLimits.get('ordersPerMinute').push(now);
        this.rateLimits.get('ordersPerHour').push(now);
    }

    async signOrder(order) {
        try {
            // Get user's private key (in production, this would be handled securely)
            const privateKey = await this.getUserPrivateKey();
            
            // Create order signature
            const orderString = JSON.stringify(order);
            const signature = await this.createSignature(orderString, privateKey);
            
            return {
                ...order,
                signature,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error signing order:', error);
            throw new Error('Failed to sign order');
        }
    }

    async verifyOrder(order) {
        try {
            const { signature, ...orderData } = order;
            const orderString = JSON.stringify(orderData);
            const publicKey = await this.getUserPublicKey();
            
            return await this.verifySignature(orderString, signature, publicKey);
        } catch (error) {
            console.error('Error verifying order:', error);
            return false;
        }
    }

    updateOrderForm(orderType) {
        const containers = {
            limit: document.getElementById('limit-price-container'),
            stop: document.getElementById('stop-loss-container'),
            takeProfit: document.getElementById('take-profit-container'),
            trailingStop: document.getElementById('trailing-stop-container'),
            iceberg: document.getElementById('iceberg-container')
        };

        // Hide all containers first
        Object.values(containers).forEach(container => {
            if (container) container.style.display = 'none';
        });

        // Show relevant containers based on order type
        switch (orderType) {
            case 'market':
                break;
            case 'limit':
                containers.limit.style.display = 'block';
                break;
            case 'stop':
            case 'stop-limit':
                containers.limit.style.display = 'block';
                containers.stop.style.display = 'block';
                break;
            case 'trailing-stop':
                containers.trailingStop.style.display = 'block';
                break;
            case 'iceberg':
                containers.limit.style.display = 'block';
                containers.iceberg.style.display = 'block';
                break;
        }
    }

    updateSellOrderForm(orderType) {
        const containers = {
            limit: document.getElementById('sell-limit-price-container'),
            stop: document.getElementById('sell-stop-loss-container'),
            takeProfit: document.getElementById('sell-take-profit-container'),
            trailingStop: document.getElementById('sell-trailing-stop-container'),
            iceberg: document.getElementById('sell-iceberg-container')
        };

        // Hide all containers first
        Object.values(containers).forEach(container => {
            if (container) container.style.display = 'none';
        });

        // Show relevant containers based on order type
        switch (orderType) {
            case 'market':
                break;
            case 'limit':
                containers.limit.style.display = 'block';
                break;
            case 'stop':
            case 'stop-limit':
                containers.limit.style.display = 'block';
                containers.stop.style.display = 'block';
                break;
            case 'trailing-stop':
                containers.trailingStop.style.display = 'block';
                break;
            case 'iceberg':
                containers.limit.style.display = 'block';
                containers.iceberg.style.display = 'block';
                break;
        }
    }

    validateStopLoss(price) {
        const currentPrice = parseFloat(document.getElementById('current-price').textContent);
        if (parseFloat(price) >= currentPrice) {
            this.showNotification('Stop loss must be below current price', 'error');
            return false;
        }
        return true;
    }

    validateTakeProfit(price) {
        const currentPrice = parseFloat(document.getElementById('current-price').textContent);
        if (parseFloat(price) <= currentPrice) {
            this.showNotification('Take profit must be above current price', 'error');
            return false;
        }
        return true;
    }

    validateTrailingStop(percentage) {
        const value = parseFloat(percentage);
        if (isNaN(value) || value <= 0 || value > 100) {
            this.showNotification('Trailing stop must be between 0 and 100', 'error');
            return false;
        }
        return true;
    }

    validateIcebergOrder(visibility) {
        const value = parseFloat(visibility);
        const totalAmount = parseFloat(document.getElementById('buy-amount').value);
        
        if (isNaN(value) || value <= 0) {
            this.showNotification('Visible amount must be greater than 0', 'error');
            return false;
        }

        if (value >= totalAmount) {
            this.showNotification('Visible amount must be less than total amount', 'error');
            return false;
        }

        return true;
    }

    validateIcebergChunks(chunks) {
        const value = parseInt(chunks);
        if (isNaN(value) || value < 2 || value > this.rateLimitConfig.maxIcebergChunks) {
            this.showNotification(`Number of chunks must be between 2 and ${this.rateLimitConfig.maxIcebergChunks}`, 'error');
            return false;
        }
        return true;
    }

    startTrailingStopUpdates() {
        setInterval(() => {
            this.updateTrailingStops();
        }, 1000);
    }

    updateTrailingStops() {
        this.trailingStops.forEach((stop, orderId) => {
            const { type, percentage, initialPrice } = stop;
            const currentPrice = this.getCurrentPrice(stop.coin);

            if (!currentPrice) return;

            const priceChange = ((currentPrice - initialPrice) / initialPrice) * 100;
            const shouldTrigger = type === 'buy' ? priceChange <= -percentage : priceChange >= percentage;

            if (shouldTrigger) {
                this.executeTrailingStop(orderId, currentPrice);
            }
        });
    }

    executeTrailingStop(orderId, currentPrice) {
        const stop = this.trailingStops.get(orderId);
        if (!stop) return;

        const order = {
            type: stop.type === 'buy' ? 'sell' : 'buy',
            amount: stop.amount,
            price: currentPrice,
            coin: stop.coin,
            namespace: stop.namespace
        };

        this.placeOrder(order);
        this.trailingStops.delete(orderId);
    }

    startIcebergOrderUpdates() {
        setInterval(() => {
            this.updateIcebergOrders();
        }, 5000);
    }

    updateIcebergOrders() {
        this.icebergOrders.forEach((order, orderId) => {
            if (order.remainingChunks === 0) {
                this.icebergOrders.delete(orderId);
                return;
            }

            const currentPrice = this.getCurrentPrice(order.coin);
            if (!currentPrice) return;

            const shouldExecute = order.type === 'buy' ? 
                currentPrice <= order.limitPrice : 
                currentPrice >= order.limitPrice;

            if (shouldExecute) {
                this.executeIcebergChunk(orderId);
            }
        });
    }

    executeIcebergChunk(orderId) {
        const order = this.icebergOrders.get(orderId);
        if (!order) return;

        const chunkAmount = order.visibleAmount;
        const chunkOrder = {
            type: order.type,
            amount: chunkAmount,
            price: order.limitPrice,
            coin: order.coin,
            namespace: order.namespace
        };

        this.placeOrder(chunkOrder);
        order.remainingAmount -= chunkAmount;
        order.remainingChunks--;

        if (order.remainingChunks === 0) {
            this.icebergOrders.delete(orderId);
        } else {
            this.icebergOrders.set(orderId, order);
        }
    }

    toggleOrderBookCumulative(show) {
        this.renderOrderBook(show);
    }

    toggleTradeDetails(show) {
        this.renderTradeHistory(show);
    }

    showNotification(message, type = 'info') {
        const overlay = document.createElement('div');
        overlay.className = `message-overlay ${type}`;
        overlay.textContent = message;
        document.body.appendChild(overlay);

        setTimeout(() => {
            overlay.remove();
        }, 3000);
    }
} 