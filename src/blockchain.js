const sha256 = require("sha256");
const DB = require("./db");

class Blockchain{
    constructor(name, ownerAddress,namespace) {
        this.name = name;
        this.address = ownerAddress;
        this.namespace = namespace;
        this.chain = [];
        this.zeroNonce = {nonce: 0,duration:0};
        this.db = new DB(this.name,namespace);
     }

    init(cb){
        this.db.loadChain((chain)=>{
            if(!chain) {
                this.createNewBlock(this.zeroNonce, [],
                    {name: this.name,
                        address: this.address,
                        namespace:this.namespace
                    });
            } else {
                this.name = chain[0].data.name;
                this.address = chain[0].data.address;
                this.namespace = chain[0].data.namespace;

                chain.forEach((block)=>{
                    const b = new Block(this, block.transactions,block.nonce,block.data,block.hash)
                    this.chain.push(b);
                })
            }
            let valid = this.validate();
            cb(valid);
        })
    }
    coinsInEco(){
        let coinCnt = 0;
        this.chain.forEach((block)=>{
            block.transactions.forEach((transaction)=>{
                if(transaction.from==="00")
                    coinCnt+=transaction.amount;
            })
        });
        return coinCnt;
    }

    coinsInWallet(address){
        let coinCnt = 0;
        address = address||this.getCoinOwnerAddress();

        this.chain.forEach((block)=>{
            block.transactions.forEach((transaction)=>{
                if(transaction.from===address)
                    coinCnt-=transaction.amount;
                else if(transaction.to===address)
                    coinCnt+=transaction.amount;
            })
        });
        return coinCnt;
    }

    createNewBlock(nonce,transactions,data){
        const newBlock = new Block(this,transactions,nonce,data||{});

        this.chain.push(newBlock);

        this.lastBlock = newBlock;
        this.db.saveChain(this.chain,()=>{});
        return newBlock;
    }

    createNewTransactionsWithProof(transactions){
        let nonce =  this.proofOfWork();
        return this.createNewBlock(nonce,transactions);
    }
    createNewTransactions(transactions,rewardAddress){
        let start = process.cpuUsage().user;
        let nonce =  this.zeroNonce;
        let newBlock = this.createNewBlock(nonce,transactions);
        newBlock.nonce.duration = process.cpuUsage().user-start;

        if(rewardAddress) {
            let totalAmount = 0;
            let tos = [];
            transactions.forEach((transaction) => {
                totalAmount += transaction.amount;
                tos.push(transaction.to);
            })
            let reward = (newBlock.nonce.duration / 100000000) * totalAmount;
            let rewardTransactions = [];
            tos.forEach((to) => {
                rewardTransactions.push(new Transaction(reward/transactions.length,to,rewardAddress));
            })
            this.createNewTransactions(rewardTransactions);
        }

        return newBlock;
    }
    validate(){
        for(let i=1;i<this.chain.length;i++){
            var block = this.chain[i];
            var prevBlock = this.chain[i-1];
            if(block.previousBlockHash!==prevBlock.hash)
                return false;
        }
        this.chain.forEach((block)=>{
            if(!block.validate())
                return false;
        })
        return true;
    }

    getLastBlock(){
        return this.chain[this.chain.length-1];
    }
    proofOfWork(){
        const start = process.cpuUsage().user;
        let nonce = 0;
        let lastBlock = this.getLastBlock();
        let hash = lastBlock.hashBlock(nonce);
        while(hash.substring(0,4) !== "0000"){
            nonce++;
            hash = lastBlock.hashBlock(nonce);
        }
        const duration = process.cpuUsage().user;
        return {nonce,duration};
    }

    getCoinOwnerAddress(){
        return this.chain[0].data.address;
    }

    getOwnerName(){
        return this.chain[0].data.name;
    }

    mine(amount,feeAddress){
        const newBlock = this.createNewTransactionsWithProof([
            new Transaction(amount,"00",this.getCoinOwnerAddress())
        ]);

        // fee transaction
        this.createNewTransactions([
            new Transaction((newBlock.nonce.duration/100000000)*amount,this.getCoinOwnerAddress(), feeAddress)
        ]);
        return newBlock.nonce;
    }
}

class Block{
    constructor(blockchain, transactions, nonce, data, hash) {
        this.index = blockchain.chain.length+1;
        this.timestamp = Date.now();
        this.data = data;
        this.transactions = transactions;
        this.nonce = nonce;
        this.hash = "";

        let prevHash ="";
        if(blockchain.chain.length===0)
            prevHash = "0"; // Genesis block
        else
            prevHash = blockchain.chain[blockchain.chain.length-1].hash;
        this.previousBlockHash = prevHash

        this.hash = hash||this.hashBlock();
    }
    hashBlock(nonce){
        return sha256(JSON.stringify(nonce||this.nonce) + JSON.stringify(this));
    }

    validate(){
        /*
        You have to remove the hash before re-hashing
        since when the block is created it is hash without a hash
        which is assigned after the hashing.
         */
        let temp = this.hash;
        this.hash = "";
        let isValid = this.hashBlock()===temp;
        this.hash = temp;
        return isValid;
    }
}
class Transaction{
    constructor(amount,from,to) {
        this.amount = amount;
        this.from = from;
        this.to = to;
    }
}
module.exports = {
    Blockchain,
    Transaction
};