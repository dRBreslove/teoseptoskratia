import { Block } from './Block';
import { Transaction } from './Transaction';
import { Database } from '../utils/Database';
import { ProofOfWork } from './ProofOfWork';
import { BlockchainConfig } from '../config/BlockchainConfig';

export interface BlockchainData {
    name: string;
    namespace: string;
    version: string;
    address: string;
    cpuFactor: number;
}

export class Blockchain {
    private chain: Block[];
    private readonly name: string;
    private readonly address: string;
    private readonly namespace: string;
    private readonly db: Database;
    private readonly pow: ProofOfWork;
    private isInitialized: boolean;

    constructor(name: string, address: string, namespace: string) {
        this.name = name;
        this.address = address;
        this.namespace = namespace;
        this.chain = [];
        this.db = new Database(name, namespace);
        this.pow = new ProofOfWork();
        this.isInitialized = false;
    }

    public async init(): Promise<boolean> {
        const chain = await this.db.loadChain();
        
        if (!chain) {
            // Genesis block creation
            const genesisData: BlockchainData = {
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

    private async createGenesisBlock(data: BlockchainData): Promise<void> {
        const genesisBlock = new Block(this, [], { nonce: 0, cpu: 0 }, data);
        this.chain.push(genesisBlock);
        await this.db.saveChain(this.chain);
    }

    public async mine(amount: number, feeAddress: string): Promise<{ nonce: number; cpu: number }> {
        const nonce = this.pow.prove(this.getLastBlock());
        const miningTransaction = new Transaction(amount, "00", this.getCoinOwnerAddress());
        
        await this.createNewBlock(nonce, [miningTransaction]);
        
        // Calculate and distribute CPU costs
        const cpuCost = (nonce.cpu / BlockchainConfig.CPU_COST_FACTOR) * amount;
        const feeTransaction = new Transaction(cpuCost, this.getCoinOwnerAddress(), feeAddress);
        
        await this.createNewBlock({ nonce: 0, cpu: 0 }, [feeTransaction]);
        
        return nonce;
    }

    public async createNewTransactions(
        transactions: Transaction[],
        cpuCostAddress: string
    ): Promise<{ nonce: number; cpu: number }> {
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

    private async createNewBlock(nonce: { nonce: number; cpu: number }, transactions: Transaction[]): Promise<void> {
        const block = new Block(this, transactions, nonce);
        this.chain.push(block);
        await this.db.saveChain(this.chain);
    }

    public validate(): boolean {
        // Validate chain integrity
        for (let i = 1; i < this.chain.length; i++) {
            if (this.chain[i].previousBlockHash !== this.chain[i - 1].hash) {
                return false;
            }
        }

        // Validate each block
        return this.chain.every(block => block.validate());
    }

    public getLastBlock(): Block {
        return this.chain[this.chain.length - 1];
    }

    public getCoinOwnerAddress(): string {
        return this.chain[0].data.address;
    }

    public getOwnerName(): string {
        return this.chain[0].data.name;
    }

    public coinsInEco(): number {
        return this.chain.reduce((sum, block) => 
            sum + block.transactions.reduce((blockSum, tx) => 
                blockSum + (tx.from === "00" ? tx.amount : 0), 0), 0);
    }

    public coinsInWallet(address: string = this.getCoinOwnerAddress()): number {
        return this.chain.reduce((sum, block) => 
            sum + block.transactions.reduce((blockSum, tx) => 
                blockSum + (tx.to === address ? tx.amount : 0) - (tx.from === address ? tx.amount : 0), 0), 0);
    }
} 