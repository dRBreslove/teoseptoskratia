import { Block } from './Block.js';
import { Transaction } from './Transaction.js';
import { Database } from '../utils/Database.js';
import { ProofOfWork } from './ProofOfWork.js';
import { BlockchainConfig } from '../config/BlockchainConfig.js';

export class Blockchain {
    constructor(name, address, namespace) {
        this.name = name;
        this.address = address;
        this.namespace = namespace;
        this.chain = [];
        this.db = new Database(name, namespace);
        this.pow = new ProofOfWork();
        this.isInitialized = false;
    }

    async init() {
        const chain = await this.db.loadChain();
        
        if (!chain) {
            // Genesis block creation
            const genesisData = {
                name: this.name,
                namespace: this.namespace,
                version: BlockchainConfig.VERSION,
                address: this.address,
                cpuFactor: BlockchainConfig.CPU_COST_FACTOR
            };

            await this.createGenesisBlock(genesisData);
        } else {
            this.chain = chain.map(block => new Block(this, block.transactions, block.nonce, block.data, block.hash));
        }

        this.isInitialized = this.validate();
        return this.isInitialized;
    }

    async createGenesisBlock(data) {
        const genesisBlock = new Block(this, [], { nonce: 0, cpu: 0 }, data);
        this.chain.push(genesisBlock);
        await this.db.saveChain(this.chain);
    }

    async mine(amount, feeAddress) {
        const nonce = this.pow.prove(this.getLastBlock());
        const miningTransaction = new Transaction(amount, "00", this.getCoinOwnerAddress());
        
        await this.createNewBlock(nonce, [miningTransaction]);
        
        // Calculate and distribute CPU costs
        const cpuCost = (nonce.cpu / BlockchainConfig.CPU_COST_FACTOR) * amount;
        const feeTransaction = new Transaction(cpuCost, this.getCoinOwnerAddress(), feeAddress);
        
        await this.createNewBlock({ nonce: 0, cpu: 0 }, [feeTransaction]);
        
        return nonce;
    }

    async createNewTransactions(transactions, cpuCostAddress) {
        const start = process.cpuUsage().user;
        const nonce = { nonce: 0, cpu: 0 };
        
        await this.createNewBlock(nonce, transactions);
        
        if (cpuCostAddress) {
            const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
            const cpuCost = (process.cpuUsage().user - start) / BlockchainConfig.CPU_COST_FACTOR * totalAmount;
            
            const feeTransactions = transactions.map(tx => 
                new Transaction(cpuCost / transactions.length, tx.to, cpuCostAddress)
            );
            
            await this.createNewBlock({ nonce: 0, cpu: 0 }, feeTransactions);
        }
        
        return nonce;
    }

    async createNewBlock(nonce, transactions) {
        const block = new Block(this, transactions, nonce);
        this.chain.push(block);
        await this.db.saveChain(this.chain);
    }

    validate() {
        // Validate chain integrity
        for (let i = 1; i < this.chain.length; i++) {
            if (this.chain[i].previousBlockHash !== this.chain[i - 1].hash) {
                return false;
            }
        }

        // Validate each block
        return this.chain.every(block => block.validate());
    }

    getLastBlock() {
        return this.chain[this.chain.length - 1];
    }

    getCoinOwnerAddress() {
        return this.chain[0].data.address;
    }

    getOwnerName() {
        return this.chain[0].data.name;
    }

    coinsInEco() {
        return this.chain.reduce((sum, block) => 
            sum + block.transactions.reduce((blockSum, tx) => 
                blockSum + (tx.from === "00" ? tx.amount : 0), 0), 0);
    }

    coinsInWallet(address = this.getCoinOwnerAddress()) {
        return this.chain.reduce((sum, block) => 
            sum + block.transactions.reduce((blockSum, tx) => 
                blockSum + (tx.to === address ? tx.amount : 0) - (tx.from === address ? tx.amount : 0), 0), 0);
    }
} 