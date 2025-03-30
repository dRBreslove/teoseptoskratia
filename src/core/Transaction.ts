export class Transaction {
    constructor(
        public readonly amount: number,
        public readonly from: string,
        public readonly to: string
    ) {}
} 