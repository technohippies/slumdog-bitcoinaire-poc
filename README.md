# Karaoke Access - Lit Protocol Example

A decentralized karaoke or gameshow access system using Lit Protocol for encryption, Ceramic/Orbis for storage, and Base Sepolia for access control

## Features

- 🔐 Encrypted lyrics storage using Lit Protocol
- 📝 Decentralized data storage with Ceramic/Orbis
- 💳 Pay-per-song access control via smart contract
- ⛓️ Built on Base Sepolia testnet

## Prerequisites

- Node.js 16+ or Bun 1.0+
- A wallet with Base Sepolia ETH (for testing)
- Environment variables (see below)

## Smart Contract Deployment

1. Open [Remix IDE](https://remix.ethereum.org)
2. Create a new file `KaraokeAccess.sol` and paste the contract code from [contracts/KaraokeAccess.sol](./contracts/KaraokeAccess.sol)
3. Compile the contract (make sure you're using Solidity 0.8.20)
4. In the "Deploy & Run Transactions" tab:
   - Select "Injected Provider - MetaMask" as your environment
   - Connect to Base Sepolia network in MetaMask
   - Deploy the contract
5. Save the deployed contract address for the next steps

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/karaoke-access-example
cd karaoke-access-example
```

2. Install dependencies:

```bash
bun install
# or
npm install
```

3. Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

## Environment Variables

Create a `.env` file with the following variables:

```env
# Orbis/Ceramic Configuration
VITE_ORBIS_SONG_MODEL=your_model_id
VITE_CERAMIC_NODE_URL=https://ceramic-orbisdb-mainnet-direct.hirenodes.io/
VITE_ORBIS_NODE_URL=https://studio.useorbis.com/
VITE_ORBIS_ENVIRONMENT_ID=your_environment_id
VITE_ORBIS_CONTEXT_ID=your_context_id

# Private Keys (NEVER commit these to git!)
VITE_ORBIS_PRIVATE_KEY=your_private_key
VITE_USER_PRIVATE_KEY=your_user_wallet_private_key
```

## Usage

### Adding a New Song (Admin)

```typescript
import { KaraokeService } from "./ceramic-orbis";

const service = new KaraokeService(contractAddress, provider, signer);
await service.addSong(
  songId,
  "Song Title",
  "Artist Name",
  "Lyrics...",
  chainId,
  authSig
);
```

### Purchasing Access

```typescript
await service.purchaseSongAccess(songId);
```

### Accessing Lyrics

```typescript
const lyrics = await service.getSongLyrics(song, chainId, authSig);
```

## Example Scripts

1. Add a new song (admin only):

```bash
bun run example-usage.ts
```

2. Purchase and unlock a song:

```bash
bun run unlock-song.ts
```

## License

This project is licensed under the AGPLv3 License - see the [LICENSE](LICENSE) file for details.