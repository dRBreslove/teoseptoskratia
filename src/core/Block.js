import { sha256 } from '../utils/crypto.js';

export class Block {
    constructor(blockchain, transactions, nonce, data = {}, hash) {
        this.blockchain = blockchain;
        this.index = blockchain.getLastBlock()?.index + 1 || 1;
        this.timestamp = Date.now();
        this.data = data;
        this.transactions = transactions;
        this.nonce = nonce;
        this.previousBlockHash = blockchain.getLastBlock()?.hash || "0";
        this._hash = hash || this.hashBlock();
    }

    get hash() {
        return this._hash;
    }

    set hash(value) {
        this._hash = value;
    }

    hashBlock(nonce) {
        const blockData = {
            index: this.index,
            timestamp: this.timestamp,
            data: this.data,
            transactions: this.transactions,
            nonce: nonce || this.nonce,
            previousBlockHash: this.previousBlockHash
        };
        return sha256(JSON.stringify(blockData));
    }

    validate() {
        const tempHash = this.hash;
        this.hash = "";
        const isValid = this.hashBlock() === tempHash;
        this.hash = tempHash;
        return isValid;
    }
} 