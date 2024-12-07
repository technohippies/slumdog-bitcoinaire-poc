import { ethers } from "ethers";
import { KaraokeService } from "./ceramic-orbis";
import { initAuth } from "./config";
import type { Song } from "./ceramic-orbis";

// Get private key from env
const privateKey = process.env.VITE_ORBIS_PRIVATE_KEY;
if (!privateKey) {
  throw new Error("Missing VITE_ORBIS_PRIVATE_KEY in environment variables");
}

// Mock window.ethereum for Node.js environment
const mockProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
const mockSigner = new ethers.Wallet(privateKey, mockProvider);

async function main() {
  console.log("Starting Karaoke Service...");

  try {
    // Initialize Orbis DB authentication
    console.log("Initializing Orbis DB auth...");
    await initAuth();
    console.log("Orbis DB auth initialized");

    // Setup provider and signer
    console.log("Setting up Web3 provider...");
    const provider = mockProvider;
    const signer = mockSigner;
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    console.log("Connected to network:", {
      chainId,
      name: network.name
    });
    
    // Create auth signature for Lit Protocol
    console.log("Creating Lit Protocol auth signature...");
    const address = await signer.getAddress();
    const message = "Sign this message to access encrypted lyrics";
    const signature = await signer.signMessage(message);
    
    const authSig = {
      sig: signature,
      derivedVia: "web3.eth.personal.sign",
      signedMessage: message,
      address: address,
    };
    console.log("Auth signature created:", { address });
    
    // Initialize KaraokeService
    console.log("Initializing Karaoke Service...");
    const karaokeService = new KaraokeService(
      "0x83F569503ee532A60e90Ab00fF6BC265826556e0",
      provider,
      signer
    );
    await karaokeService.initialize();
    console.log("Karaoke Service initialized");

    try {
      // Add a new song (admin only)
      console.log("Adding new song...");
      const songId = 1;
      const result = await karaokeService.addSong(
        songId,
        "Song Title",
        "Artist Name",
        "Encrypted lyrics here...",
        chainId,
        authSig
      );
      console.log("Song added:", result);

      // Search for songs (public)
      console.log("Searching for songs...");
      const songs = await karaokeService.searchSongs("Song Title");
      console.log("Found songs:", songs);

      if (songs.length > 0) {
        // Type assertion since we know the structure
        const song = songs[0] as Song;
        console.log("Found song:", song);
        
        // Purchase access to a song
        console.log("Purchasing song access...");
        await karaokeService.purchaseSongAccess(song.songId);
        console.log("Song access purchased");

        // Get decrypted lyrics (only works if user has purchased access)
        console.log("Getting decrypted lyrics...");
        const lyrics = await karaokeService.getSongLyrics(song, chainId, authSig);
        console.log("Decrypted lyrics:", lyrics);
      } else {
        console.log("No songs found");
      }
    } catch (error) {
      console.error("Error in Karaoke operations:", error);
      throw error;
    }
  } catch (error) {
    console.error("Fatal error:", error);
    throw error;
  }
}

// Run in any environment
main().catch(error => {
  console.error("Application failed:", error);
  process.exit(1);
}); 