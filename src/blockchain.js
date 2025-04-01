import sha256 from 'sha256';
import DB from './db.js';

const CPU_COST_FACTOR = 100000000;
const VERSION = '1.0.0';

class Transaction {
  constructor(amount, from, to) {
    this.amount = amount;
    this.from = from;
    this.to = to;
  }
}

class Block {
  constructor(blockchain, transactions, nonce, data, hash) {
    this.index = blockchain.chain.length + 1;
    this.timestamp = Date.now();
    this.data = data;
    this.transactions = transactions;
    this.nonce = nonce;
    this.hash = '';

    const prevHash = blockchain.chain.length === 0
      ? '0' // Genesis block
      : blockchain.chain[blockchain.chain.length - 1].hash;

    this.previousBlockHash = prevHash;
    this.hash = hash || this.hashBlock();
  }

  hashBlock(nonce) {
    return sha256(JSON.stringify(nonce || this.nonce) + JSON.stringify(this));
  }

  validate() {
    /*
        I believe this is where I failed to understand Sitoshi and the nonce.

        Also need to implement validation according to CPU usage
        and transaction amounts since the fee is calculated according
        to CPU usage, it should be quite easy to add this layer of
        security by re-calculating the fee in the transactions.

        You have to remove the hash before re-hashing
        since when the block is created it is hashed without a hash
        which is assigned after the hashing.
        */

    const temp = this.hash;
    this.hash = '';
    const isValid = this.hashBlock() === temp;
    this.hash = temp;
    return isValid;
  }
}

class Blockchain {
  constructor(name, ownerAddress, namespace) {
    this.name = name;
    this.address = ownerAddress;
    this.namespace = namespace;
    this.chain = [];
    this.zeroNonce = { nonce: 0, cpu: 0 };
    this.db = new DB(this.name, namespace);
    this.isInit = false;
  }

  init(cb) {
    this.db.loadChain((chain) => {
      if (!chain) {
        // Genesis
        this.createNewBlock(
          this.zeroNonce,
          [],
          {
            'block-type': 'genesis',
            name: this.name,
            namespace: this.namespace,
            version: VERSION,
            address: this.address,
            'cpu-factor': CPU_COST_FACTOR,
          },
          (newBlock) => {
            const valid = this.validate();
            this.isInit = valid;
            cb(valid);
          },
        );
      } else {
        this.name = chain[0].data.name;
        this.address = chain[0].data.address;
        this.namespace = chain[0].data.namespace;

        chain.forEach((block) => {
          const b = new Block(
            this,
            block.transactions,
            block.nonce,
            block.data,
            block.hash,
          );
          this.chain.push(b);
        });

        const valid = this.validate();
        this.isInit = valid;
        cb(valid);
      }
    });
  }

  coinsInEco() {
    let coinCnt = 0;
    this.chain.forEach((block) => {
      block.transactions.forEach((transaction) => {
        if (transaction.from === '00') coinCnt += transaction.amount;
      });
    });
    return coinCnt;
  }

  coinsInWallet(address) {
    let coinCnt = 0;
    const walletAddress = address || this.getCoinOwnerAddress();

    this.chain.forEach((block) => {
      block.transactions.forEach((transaction) => {
        if (transaction.from === walletAddress) coinCnt -= transaction.amount;
        else if (transaction.to === walletAddress) coinCnt += transaction.amount;
      });
    });
    return coinCnt;
  }

  createNewBlock(nonce, transactions, data, cb) {
    const newBlock = new Block(this, transactions, nonce, data || {});
    this.chain.push(newBlock);
    this.db.saveChain(this.chain, () => {
      cb(newBlock);
    });
  }

  createNewTransactions(transactions, cpuCostAddress, cb) {
    const start = process.cpuUsage().user;
    const nonce = this.zeroNonce;

    this.createNewBlock(nonce, transactions, {}, (newBlock) => {
      // Create a new object instead of modifying the parameter directly
      const updatedNonce = { 
        ...newBlock.nonce,
        cpu: process.cpuUsage().user - start 
      };
      newBlock.nonce = updatedNonce;

      if (cpuCostAddress) {
        let totalAmount = 0;
        const tos = [];

        transactions.forEach((transaction) => {
          totalAmount += transaction.amount;
          tos.push(transaction.to);
        });

        const cpuCost = (updatedNonce.cpu / CPU_COST_FACTOR) * totalAmount;
        const costTransactions = tos.map((to) => new Transaction(cpuCost / tos.length, to, cpuCostAddress));

        this.createNewTransactions(costTransactions, null, cb);
      } else {
        cb(newBlock.nonce);
      }
    });
  }

  validate() {
    for (let i = 1; i < this.chain.length; i++) {
      const block = this.chain[i];
      const prevBlock = this.chain[i - 1];
      if (block.previousBlockHash !== prevBlock.hash) return false;
    }

    // Use `every` method for cleaner validation
    return this.chain.every(block => block.validate());
  }

  getLastBlock() {
    return this.chain[this.chain.length - 1];
  }

  proofOfWork() {
    const start = process.cpuUsage().user;
    let nonce = 0;
    const lastBlock = this.getLastBlock();
    let hash = lastBlock.hashBlock(nonce);

    while (hash.substring(0, 4) !== '0000') {
      nonce += 1;
      hash = lastBlock.hashBlock(nonce);
    }

    const cpuUsage = process.cpuUsage().user - start;
    return { nonce, cpu: cpuUsage };
  }

  getCoinOwnerAddress() {
    return this.address;
  }

  getOwnerName() {
    return this.name;
  }

  transferMoney(to, amount, cb) {
    const payee = this.getCoinOwnerAddress();
    const transaction = new Transaction(amount, payee, to);
    this.createNewTransactions([transaction], this.getOperatorAddress(), cb);
  }

  getOperatorAddress() {
    for (let i = 0; i < this.chain.length; i++) {
      const block = this.chain[i];
      for (let j = 0; j < block.transactions.length; j++) {
        const transaction = block.transactions[j];
        if (transaction.to.indexOf('operator') !== -1) return transaction.to;
      }
    }
    return null;
  }

  mine(cb) {
    this.createNewTransactions(
      [new Transaction(12.5, '00', this.getCoinOwnerAddress())],
      this.getOperatorAddress() || 'operator',
      cb,
    );
  }
}

export { Blockchain, Transaction };
