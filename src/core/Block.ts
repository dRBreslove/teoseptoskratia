import { Blockchain } from './Blockchain';
import { Transaction } from './Transaction';
import { sha256 } from '../utils/crypto';

export interface BlockData {
    [key: string]: any;
}

export interface Nonce {
    nonce: number;
    cpu: number;
}

export class Block {
    public readonly index: number;
    public readonly timestamp: number;
    public readonly data: BlockData;
    public readonly transactions: Transaction[];
    public readonly nonce: Nonce;
    public readonly previousBlockHash: string;
    public readonly hash: string;

    constructor(
        private readonly blockchain: Blockchain,
        transactions: Transaction[],
        nonce: Nonce,
        data: BlockData = {},
        hash?: string
    ) {
        this.index = blockchain.getLastBlock()?.index + 1 || 1;
        this.timestamp = Date.now();
        this.data = data;
        this.transactions = transactions;
        this.nonce = nonce;
        this.previousBlockHash = blockchain.getLastBlock()?.hash || "0";
        this.hash = hash || this.hashBlock();
    }

    public hashBlock(nonce?: Nonce): string {
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

    public validate(): boolean {
        const tempHash = this.hash;
        this.hash = "";
        const isValid = this.hashBlock() === tempHash;
        this.hash = tempHash;
        return isValid;
    }
} 