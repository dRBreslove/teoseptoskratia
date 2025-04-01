export class ProofOfWork {
  prove(block) {
    const start = process.cpuUsage().user;
    let nonce = 0;
    let hash = block.hashBlock({ nonce, cpu: 0 });

    while (hash.substring(0, 4) !== '0000') {
      nonce++;
      hash = block.hashBlock({ nonce, cpu: 0 });
    }

    const cpu = process.cpuUsage().user;
    return { nonce, cpu };
  }
}
