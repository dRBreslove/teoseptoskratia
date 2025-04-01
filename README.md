# TEK (Teoseptoskratia)

A decentralized distributed multichain cryptocurrency system built with JavaScript.

## Overview

TEK is a blockchain platform that allows multiple blockchains to operate within a single namespace. Each blockchain maintains its own ledger while enabling cross-chain transactions. The system implements a Proof of Work (PoW) consensus mechanism with CPU-based fee calculations.

## Features

- **Multichain Architecture**: Run multiple blockchains in parallel within a namespace
- **Cross-Chain Transactions**: Transfer value between different blockchains
- **PoW Mining**: Generate new coins through computational work
- **CPU-Based Fees**: Transaction costs calculated based on computational resources
- **Web Interface**: User-friendly dashboard for blockchain interactions
- **Auto-Reset**: Hourly reset for demonstration purposes

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/teoseptoskratia.git
cd teoseptoskratia

# Install dependencies
npm install
```

## Usage

The system can run multiple nodes, each with its own blockchain:

```bash
# Start node 1 (default port 8080)
npm run node_1

# Start node 2 (port 8081)
npm run node_2

# Start node 3 (port 8082)
npm run node_3
```

Access the web interfaces at:
- http://localhost:8080/
- http://localhost:8081/
- http://localhost:8082/

## Architecture

TEK consists of several key components:

1. **Blockchain Core**: Handles block creation, mining, and validation
2. **Multi-Chain Management**: Manages multiple blockchain instances
3. **Network Layer**: Facilitates communication between nodes
4. **Database**: Persists blockchain data to the filesystem
5. **Web Server**: Provides API endpoints and user interface

## Development

This project uses ES modules for newer components and CommonJS for legacy code. The codebase is transitioning toward a more modern architecture with TypeScript support in development.

### Key Files

- `src/server.js`: Main application entry point
- `src/blockchain.js`: Core blockchain implementation
- `src/db.js`: Database management
- `src/network/`: WebSocket communication
- `src/core/`: Modern blockchain implementation (ES6+)
- `src/utils/`: Utility functions

### Customization

To create your own blockchain namespace:

```bash
npm start "Your Circle Name" 8080
```

## Live Demo

[Single Node Live Demo](https://plankton-app-w6pzk.ondigitalocean.app)

## Credits

This project draws inspiration from blockchain fundamentals. For a deeper understanding of blockchain technology with JavaScript, check out:
[Learn Blockchain By Building Your Own In JavaScript](https://www.udemy.com/course/build-a-blockchain-in-javascript/)

## Disclaimer

This project is a rapid prototype for educational purposes. The code is not optimized for production use.