# TEK (Teoseptoskratia)

A decentralized distributed multi-chain cryptocurrency system built with Node.js and Express.

## Features

- **Multi-Chain Support**: Each namespace can host multiple independent blockchains
- **CPU-Based Mining**: Mining difficulty is based on CPU usage
- **Transaction Fees**: Automatic fee calculation based on CPU usage
- **Real-time Updates**: WebSocket-based communication for live blockchain updates
- **Customizable UI**: Different themes for different namespaces
- **ES6 Standards**: Modern JavaScript implementation using ES6+ features

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/teoseptoskratia.git
cd teoseptoskratia
```

2. Install dependencies:
```bash
npm install
```

## Configuration

The application can be configured through command-line arguments:

- `namespace`: The name of your blockchain namespace (default: "My Circle")
- `port`: The port number to run the server on (default: 8080)

Example:
```bash
node src/server.js "My Circle" 8080
```

## Running Multiple Nodes

You can run multiple nodes with different namespaces:

```bash
# Node 1
npm run node_1  # Runs on port 8080 with namespace "Our Circle"

# Node 2
npm run node_2  # Runs on port 8081 with namespace "Itay's Circle"

# Node 3
npm run node_3  # Runs on port 8082 with namespace "Shiriloo's Circle"
```

## Development

### Code Style

The project uses ESLint with Airbnb's JavaScript style guide. To check code style:

```bash
npm run lint
```

To automatically fix linting issues:

```bash
npm run lint:fix
```

### Testing

Run the test suite:

```bash
npm test
```

## Project Structure

```
src/
├── blockchain.js     # Core blockchain implementation
├── db.js            # Database operations
├── server.js        # Express server and routes
├── socket.io-cb.js  # WebSocket communication
├── test.js          # Test suite
├── views/           # Pug templates
├── public/          # Static assets
├── utils/           # Utility functions
├── network/         # Network-related code
├── core/            # Core functionality
└── config/          # Configuration files
```

## API Endpoints

### GET /
- Home page
- Displays blockchain information

### GET /ideology
- Displays project ideology and documentation

### GET /:coinname/home
- Displays specific blockchain information
- Parameters:
  - `coinname`: Name of the blockchain
  - `new`: Query parameter to create new blockchain

### GET /:from/:blockchain/partner
- Partner view for blockchain interaction
- Parameters:
  - `from`: Source blockchain
  - `blockchain`: Target blockchain

### POST /mine
- Mine new blocks
- Body: `{ "from": "blockchain_name" }`

### POST /transfer
- Transfer coins between blockchains
- Body: `{ "from": "source", "to": "destination", "amount": number }`

## Blockchain Features

### Mining
- CPU-based proof of work
- Mining reward: 12.5 coins per block
- Automatic fee calculation based on CPU usage

### Transactions
- Secure transfer between blockchains
- Automatic fee calculation
- Transaction validation

### Security
- SHA-256 hashing
- Chain validation
- CPU usage tracking
- Automatic fee calculation

## License

MIT License - See LICENSE file for details

## Author

Noam-Tal Cohen