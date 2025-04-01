// Namespace communication utility
class NamespaceCommunication {
  constructor() {
    this.connections = new Map();
    this.messageHandlers = new Map();
    this.setupMessageListener();
  }

  // Initialize WebSocket connections for each namespace
  initializeConnections(namespaces, ports) {
    namespaces.forEach((namespace, index) => {
      const ws = new WebSocket(`ws://localhost:${ports[index]}`);

      ws.onopen = () => {
        console.log(`Connected to ${namespace} namespace`);
        this.connections.set(namespace, ws);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleMessage(namespace, data);
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error for ${namespace}:`, error);
      };

      ws.onclose = () => {
        console.log(`Disconnected from ${namespace} namespace`);
        this.connections.delete(namespace);
      };
    });
  }

  // Set up message listener for postMessage API
  setupMessageListener() {
    window.addEventListener('message', (event) => {
      const { type, data, source } = event.data;
      this.handleMessage(source, { type, data });
    });
  }

  // Handle incoming messages
  handleMessage(source, message) {
    const { type, data } = message;

    // Call registered handler if exists
    if (this.messageHandlers.has(type)) {
      this.messageHandlers.get(type)(source, data);
    }

    // Broadcast to other namespaces
    this.broadcastToOthers(source, message);
  }

  // Register message handler
  registerHandler(type, handler) {
    this.messageHandlers.set(type, handler);
  }

  // Broadcast message to other namespaces
  broadcastToOthers(source, message) {
    // Broadcast via WebSocket
    this.connections.forEach((ws, namespace) => {
      if (namespace !== source && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });

    // Broadcast via postMessage
    const frames = document.querySelectorAll('.namespace-frame');
    frames.forEach((frame) => {
      if (frame.id !== `frame-${source}` && frame.contentWindow) {
        frame.contentWindow.postMessage(message, '*');
      }
    });
  }

  // Send message to specific namespace
  sendToNamespace(namespace, message) {
    const ws = this.connections.get(namespace);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }

    const frame = document.getElementById(`frame-${namespace}`);
    if (frame && frame.contentWindow) {
      frame.contentWindow.postMessage(message, '*');
    }
  }

  // Show notification message
  showNotification(message, type = 'info') {
    const overlay = document.createElement('div');
    overlay.className = `message-overlay ${type}`;
    overlay.textContent = message;
    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.remove();
    }, 3000);
  }

  // Sync specific namespace
  syncNamespace(namespace) {
    this.sendToNamespace(namespace, {
      type: 'chainSync',
      data: { blockchainName: namespace },
    });
    this.showNotification(`Syncing ${namespace} namespace...`);
  }
}

// Initialize namespace communication
const namespaceComm = new NamespaceCommunication();

// Register default handlers
namespaceComm.registerHandler('chainSync', (source, data) => {
  console.log(`Chain sync from ${source}:`, data);
});

namespaceComm.registerHandler('transaction', (source, data) => {
  console.log(`Transaction from ${source}:`, data);
  namespaceComm.showNotification(`New transaction from ${source}`);
});

namespaceComm.registerHandler('block', (source, data) => {
  console.log(`Block from ${source}:`, data);
  namespaceComm.showNotification(`New block from ${source}`);
});

// Initialize connections when the page loads
document.addEventListener('DOMContentLoaded', () => {
  const namespaces = ['our-circle', 'itay-circle', 'shiriloo-circle'];
  const ports = [8080, 8081, 8082];
  namespaceComm.initializeConnections(namespaces, ports);
});
