import { io } from 'socket.io-client';

export class WebSocketClient {
  constructor(url) {
    this.socket = io(url);
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('blockAdded', (data) => {
      this.handleBlockAdded(data);
    });

    this.socket.on('chainSync', (data) => {
      this.handleChainSync(data);
    });

    this.socket.on('transactionAdded', (data) => {
      this.handleTransactionAdded(data);
    });

    this.socket.on('miningInProgress', (blockchainName) => {
      this.handleMiningInProgress(blockchainName);
    });

    this.socket.on('blockMined', (data) => {
      this.handleBlockMined(data);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }

  // Block handling
  announceNewBlock(blockchainName, block) {
    this.socket.emit('newBlock', { blockchainName, block });
  }

  handleBlockAdded(data) {
    const { blockchainName, block } = data;
    // Implement block handling logic
    console.log(`New block added to ${blockchainName}`);
  }

  // Chain synchronization
  requestChainSync(blockchainName) {
    this.socket.emit('syncChain', blockchainName);
  }

  handleChainSync(data) {
    const { blockchainName, chain } = data;
    // Implement chain sync handling logic
    console.log(`Chain sync received for ${blockchainName}`);
  }

  // Transaction handling
  broadcastTransaction(blockchainName, transaction) {
    this.socket.emit('newTransaction', { blockchainName, transaction });
  }

  handleTransactionAdded(data) {
    const { blockchainName, transaction } = data;
    // Implement transaction handling logic
    console.log(`New transaction added to ${blockchainName}`);
  }

  // Mining handling
  announceMiningStart(blockchainName) {
    this.socket.emit('miningStarted', blockchainName);
  }

  announceMiningComplete(blockchainName, block) {
    this.socket.emit('miningCompleted', { blockchainName, block });
  }

  handleMiningInProgress(blockchainName) {
    // Implement mining in progress handling logic
    console.log(`Mining in progress for ${blockchainName}`);
  }

  handleBlockMined(data) {
    const { blockchainName, block } = data;
    // Implement block mined handling logic
    console.log(`New block mined for ${blockchainName}`);
  }

  // Utility methods
  isConnected() {
    return this.socket.connected;
  }

  disconnect() {
    this.socket.disconnect();
  }
}
