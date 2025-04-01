import fs from 'fs';
import path from 'path';

export class Database {
  constructor(blockchainName, namespace) {
    if (blockchainName === '00' && namespace === '00') {
      return;
    }

    this.dbPath = path.join(process.cwd(), 'DB');
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }

    namespace = namespace.replace(':', '');
    this.namespace = path.join(this.dbPath, namespace);
    this.path = this.namespace;

    if (blockchainName) {
      if (!fs.existsSync(this.path)) {
        fs.mkdirSync(this.path, { recursive: true });
      }

      this.path = path.join(this.path, blockchainName);
      if (!fs.existsSync(this.path)) {
        fs.mkdirSync(this.path, { recursive: true });
      }
      this.path = path.join(this.path, 'blockchain.json');
    }
  }

  async saveChain(chain) {
    return new Promise((resolve, reject) => {
      fs.writeFile(this.path, JSON.stringify(chain), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async loadChain() {
    if (!fs.existsSync(this.path)) {
      return null;
    }

    return new Promise((resolve, reject) => {
      fs.readFile(this.path, 'utf8', (err, data) => {
        if (err) reject(err);
        else resolve(JSON.parse(data));
      });
    });
  }

  async getAllChainNames() {
    return new Promise((resolve, reject) => {
      fs.readdir(this.namespace, (err, files) => {
        if (err) reject(err);
        else resolve(files);
      });
    });
  }

  async deleteDB() {
    if (fs.existsSync(this.dbPath)) {
      await fs.promises.rm(this.dbPath, { recursive: true, force: true });
    }
    await fs.promises.mkdir(this.dbPath, { recursive: true });
  }
}
