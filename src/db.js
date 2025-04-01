import fs from 'fs';
import path from 'path';

const DB_FOLDER = '/DB';

// Create DB directory if it doesn't exist
if (!fs.existsSync(process.cwd() + DB_FOLDER)) {
  fs.mkdirSync(process.cwd() + DB_FOLDER, { recursive: true });
}

class DB {
  constructor(blockchainName, namespace) {
    if (blockchainName === '00' && namespace === '00') {
      return;
    }

    // Sanitize namespace
    const sanitizedNamespace = namespace.replace(':', '');
    this.namespace = path.join(process.cwd() + DB_FOLDER, sanitizedNamespace);
    this.path = this.namespace;

    if (blockchainName) {
      if (!fs.existsSync(this.path)) {
        try {
          fs.mkdirSync(this.path, { recursive: true });
        } catch (error) {
          console.error('Error creating namespace directory:', error);
        }
      }

      this.path = path.join(this.path, blockchainName);
      if (!fs.existsSync(this.path)) {
        try {
          fs.mkdirSync(this.path, { recursive: true });
        } catch (error) {
          console.error('Error creating blockchain directory:', error);
        }
      }
      this.path = path.join(this.path, 'blockchain.json');
    }
  }

  saveChain(chain, cb) {
    fs.writeFile(this.path, JSON.stringify(chain), cb);
  }

  loadChain(cb) {
    if (!fs.existsSync(this.path)) {
      return cb(null);
    }

    fs.readFile(this.path, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading blockchain file:', err);
        return cb(null);
      }
      
      try {
        const chain = JSON.parse(data);
        return cb(chain);
      } catch (error) {
        console.error('Error parsing blockchain data:', error);
        return cb(null);
      }
    });
  }

  getAllChainNames(cb) {
    fs.readdir(this.namespace, (err, files) => {
      if (err) {
        console.error('Error reading directory:', err);
        return cb([]);
      }
      return cb(files);
    });
  }

  deleteDB() {
    const dbPath = process.cwd() + DB_FOLDER;
    if (fs.existsSync(dbPath)) {
      try {
        fs.rmSync(dbPath, { recursive: true, force: true });
      } catch (error) {
        console.error('Error deleting DB:', error);
      }
    }

    try {
      fs.mkdirSync(process.cwd() + DB_FOLDER, { recursive: true });
    } catch (error) {
      console.error('Error recreating DB folder:', error);
    }
  }
}

export default DB;
