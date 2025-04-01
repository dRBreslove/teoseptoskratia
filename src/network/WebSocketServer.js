import { Server } from 'socket.io';
import { Blockchain } from '../core/Blockchain.js';

export class WebSocketServer {
  constructor(httpServer, multichain) {
    this.io = new Server(httpServer);
    this.multichain = multichain;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Handle new block announcements
      socket.on('newBlock', async (blockData) => {
        const { blockchainName, block } = blockData;
        const blockchain = this.multichain[blockchainName];

        if (blockchain) {
          // Validate the new block
          if (blockchain.validateNewBlock(block)) {
            // Add block to chain
            await blockchain.addBlock(block);
            // Broadcast to other nodes
            socket.broadcast.emit('blockAdded', { blockchainName, block });
          }
        }
      });

      // Handle chain sync requests
      socket.on('syncChain', async (blockchainName) => {
        const blockchain = this.multichain[blockchainName];
        if (blockchain) {
          socket.emit('chainSync', {
            blockchainName,
            chain: blockchain.getChain(),
          });
        }
      });

      // Handle transaction broadcasts
      socket.on('newTransaction', async (transactionData) => {
        const { blockchainName, transaction } = transactionData;
        const blockchain = this.multichain[blockchainName];

        if (blockchain) {
          // Validate transaction
          if (blockchain.validateTransaction(transaction)) {
            // Add to pending transactions
            blockchain.addPendingTransaction(transaction);
            // Broadcast to other nodes
            socket.broadcast.emit('transactionAdded', { blockchainName, transaction });
          }
        }
      });

      // Handle mining announcements
      socket.on('miningStarted', (blockchainName) => {
        socket.broadcast.emit('miningInProgress', blockchainName);
      });

      socket.on('miningCompleted', async (miningData) => {
        const { blockchainName, block } = miningData;
        const blockchain = this.multichain[blockchainName];

        if (blockchain) {
          if (blockchain.validateNewBlock(block)) {
            await blockchain.addBlock(block);
            socket.broadcast.emit('blockMined', { blockchainName, block });
          }
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  broadcast(event, data) {
    this.io.emit(event, data);
  }

  close() {
    this.io.close();
  }
}
