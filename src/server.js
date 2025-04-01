import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import bodyParser from 'body-parser';
import { v5 as uuid5 } from 'uuid';
import { Blockchain } from './blockchain.js';
import DB from './db.js';

// Get current file's directory
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const MULTICHAIN_NAMESPACE = process.argv[2] || 'My Circle';
if (MULTICHAIN_NAMESPACE.indexOf('>') !== -1) {
  throw new Error("Namespace can't contain '>'");
}

const app = express();
const port = process.argv[3] || 8080;
const nodeOperator = 'o';
const multichain = {};

app.set('views', path.join(dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.static(path.join(dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Function declarations to avoid 'used before defined' errors
const nodeOperatorIsNotInitialized = () => !multichain[nodeOperator];

const loadNodeOperator = () => {
  const uuidHashInput = `http://${MULTICHAIN_NAMESPACE}/i`;
  const multichainWalletAddress = uuid5(uuidHashInput, uuid5.URL).split('-').join('');
  multichain[nodeOperator] = new Blockchain(nodeOperator, multichainWalletAddress, MULTICHAIN_NAMESPACE);
  multichain[nodeOperator].init(onNodeOperatorLoaded);
};

const onNodeOperatorLoaded = (isBlockchainValid) => {
  if (!isBlockchainValid) {
    throw new Error(`Chain ${nodeOperator}, invalid.`);
  }

  loadMultichain(() => {
    // Initialization complete
  });
};

const loadMultichain = (callback) => {
  const db = new DB(null, MULTICHAIN_NAMESPACE);
  db.getAllChainNames((names) => {
    names.forEach((name) => {
      if (name === nodeOperator) return;

      multichain[name] = new Blockchain(name, null, MULTICHAIN_NAMESPACE);
      multichain[name].init((isBlockchainValid) => {
        if (!isBlockchainValid) {
          throw new Error(`Chain ${name}, invalid.`);
        }
      });
    });
    callback();
  });
};

const loadMultichainNamespace = (cb) => {
  if (nodeOperatorIsNotInitialized()) {
    loadNodeOperator();
  }

  // Called by loadNodeOperator -> onNodeOperatorLoaded
  return cb();
};

// Initialize multichain namespace
loadMultichainNamespace(() => {});

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: MULTICHAIN_NAMESPACE });
});

app.get('/ideology', (req, res) => {
  res.render('ideology', { title: MULTICHAIN_NAMESPACE });
});

app.get('/customecss', (req, res) => {
  const host = MULTICHAIN_NAMESPACE;
  if (host === 'Our Circle') {
    return res.send(':root {--bg:white;--text:black;--text-light:#242424;--accent-bg:#fafafa}');
  }
  if (host === "Shiriloo's Circle") {
    return res.send(':root {--accent:purple;--bg:lightpink;--text:black;--text-light:#242424;--accent-bg:pink}}');
  }
  if (host === "Itay's Circle") {
    return res.send(':root {--accent:yellow;--bg:black;--text:white;--text-light:#242424;--accent-bg:#555}}');
  }

  return res.send('');
});

const getBankAccountsDetails = (blockchainName) => {
  const accounts = [];
  
  Object.keys(multichain).forEach((key) => {
    const blockchain = multichain[key];
    const accountNumber = blockchain.getCoinOwnerAddress();
    const accountName = blockchain.getOwnerName();
    const coinsInBank = multichain[blockchainName].coinsInWallet(accountNumber);

    accounts.push({
      home: `${accountName}/${blockchainName}`,
      name: accountName,
      coins: coinsInBank,
    });
  });
  
  return accounts;
};

const checkIfBlockchainNameIsValid = (account) => (
  account === nodeOperator
  || account === MULTICHAIN_NAMESPACE
  || !/^[A-Za-z0-9]*$/.test(account)
  || account === ''
);

app.get('/:coinname/home', (req, res) => {
  const { coinname: account } = req.params;

  if (req.query.new && multichain[account]) {
    return res.render('error', {
      title: MULTICHAIN_NAMESPACE,
      error: 'This blockchain name is already taken.',
    });
  }
  
  if (req.query.new) {
    return res.redirect(req.originalUrl.split('?')[0]);
  }

  if (checkIfBlockchainNameIsValid(account)) {
    return res.render('error', {
      title: MULTICHAIN_NAMESPACE,
      error: 'Invalid blockchain name',
      description: 'Blockchain name cannot contain "@", ":" or "?". Also "o" is an internal blockchain that collects mining & transaction cost due to CPU usage. In addition the blockchain name can\'t be equal to the namespace.',
    });
  }

  const blockchainName = account;

  const renderHome = () => {
    const ownerAddress = multichain[blockchainName].getCoinOwnerAddress();
    const coinsInEco = multichain[blockchainName].coinsInEco();
    const coinsInWallet = multichain[blockchainName].coinsInWallet();
    const accounts = getBankAccountsDetails(blockchainName);

    res.render('home', {
      coinName: blockchainName,
      ownerAddress,
      coinsInEco,
      coinsInWallet,
      canMine: true,
      accounts,
      title: MULTICHAIN_NAMESPACE,
      from: blockchainName,
      namespace: MULTICHAIN_NAMESPACE,
    });
    return true;
  };

  if (!multichain[blockchainName]) {
    const ownerAddress = uuid5(`http://${MULTICHAIN_NAMESPACE}/${blockchainName}`, uuid5.URL)
      .split('-')
      .join('');
    
    multichain[blockchainName] = new Blockchain(blockchainName, ownerAddress, MULTICHAIN_NAMESPACE);
    
    multichain[blockchainName].init((valid) => {
      if (!valid) {
        throw new Error(`Blockchain: ${blockchainName}, invalid`);
      }
      renderHome();
    });
    return true;
  } 
  
  return renderHome();
});

app.get('/:from/:blockchain/partner', (req, res) => {
  const { from: clientName, blockchain: blockchainName } = req.params;
  const clientBankAddress = multichain[clientName].getCoinOwnerAddress();
  const coinsInEco = multichain[blockchainName].coinsInEco();
  const coinsInWallet = multichain[blockchainName].coinsInWallet(clientBankAddress);

  res.render('partner', {
    coinName: blockchainName,
    coinsInEco,
    coinsInWallet,
    accounts: [],
    title: MULTICHAIN_NAMESPACE,
    from: clientName,
    to: blockchainName,
    namespace: MULTICHAIN_NAMESPACE,
  });
});

app.post('/mine', (req, res) => {
  const { from } = req.body;
  multichain[from].mine((nonce) => {
    res.send(nonce);
  });
});

app.post('/transfer', (req, res) => {
  const { from, to, amount } = req.body;
  const blockchain = multichain[from.split('/')[0]];
  const toAddress = multichain[to].getCoinOwnerAddress();
  
  blockchain.transferMoney(toAddress, parseInt(amount, 10), (nonce) => {
    res.send(nonce);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Blockchain app running at port ${port}`);
  console.log(`Namespace: ${MULTICHAIN_NAMESPACE}`);
});

/*
 * Auto-deleted every hour
 */
function executeEveryRoundHour() {
  const db = new DB('00', '00');
  db.deleteDB();
  Object.keys(multichain).forEach((key) => {
    delete multichain[key];
  });
  loadMultichainNamespace(() => {});
}

function scheduleNextRoundHour() {
  const now = new Date();
  const millisecondsUntilNextRoundHour = (60 - now.getMinutes()) * 60 * 1000 
    - now.getSeconds() * 1000 
    - now.getMilliseconds();

  setTimeout(() => {
    executeEveryRoundHour();

    const interval = 60 * 60 * 1000;
    setInterval(() => {
      executeEveryRoundHour();
    }, interval);
  }, millisecondsUntilNextRoundHour);
}

scheduleNextRoundHour();
