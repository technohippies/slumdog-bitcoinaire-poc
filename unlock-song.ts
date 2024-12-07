import { ethers } from "ethers";
import { KaraokeService } from "./ceramic-orbis";
import { initAuth } from "./config";
import type { Song } from "./ceramic-orbis";

// Get private key from environment variables
const userPrivateKey = process.env.VITE_USER_PRIVATE_KEY;
if (!userPrivateKey) {
  throw new Error("Missing VITE_USER_PRIVATE_KEY in environment variables");
}

const mockProvider = new ethers.JsonRpcProvider("https://sepolia.base.org");
const userSigner = new ethers.Wallet(userPrivateKey, mockProvider);

async function main() {
  console.log("Starting unlock process...");

  try {
    // Initialize Orbis DB authentication
    console.log("Initializing Orbis DB auth...");
    await initAuth();
    console.log("Orbis DB auth initialized");

    // Setup provider and signer
    console.log("Setting up Web3 provider...");
    const provider = mockProvider;
    const signer = userSigner;
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    console.log("Connected to network:", {
      chainId,
      name: network.name,
      address: await signer.getAddress()
    });
    
    // Initialize KaraokeService first
    console.log("Initializing Karaoke Service...");
    const karaokeService = new KaraokeService(
      "0x83F569503ee532A60e90Ab00fF6BC265826556e0",
      provider,
      signer
    );
    await karaokeService.initialize();
    console.log("Karaoke Service initialized");
    
    // Then create auth signature
    console.log("Creating Lit Protocol auth signature...");
    const authSig = await karaokeService.createAuthSig(signer);
    console.log("Auth signature created:", { address: authSig.address });

    try {
      // Search for the song we want to unlock
      console.log("Fetching all songs...");
      const songs = await karaokeService.searchSongs();
      console.log("Found songs:", JSON.stringify(songs, null, 2));

      if (songs.length > 0) {
        const song = songs[0] as Song;
        console.log("Found song:", song);
        
        // Purchase access to the song
        console.log("Checking/purchasing song access...");
        try {
          await karaokeService.purchaseSongAccess(song.songId);
          console.log("Song access confirmed");

          // Try to decrypt the lyrics
          console.log("Getting decrypted lyrics...");
          const lyrics = await karaokeService.getSongLyrics(song, chainId, authSig);
          console.log("Decrypted lyrics:", lyrics);
        } catch (error: any) {
          if (error.code === 'INSUFFICIENT_FUNDS') {
            // Try decryption anyway - we might already have access
            console.log("Transaction failed but trying decryption anyway...");
            try {
              const lyrics = await karaokeService.getSongLyrics(song, chainId, authSig);
              console.log("Decrypted lyrics:", lyrics);
            } catch (decryptError) {
              console.error("Failed to decrypt:", decryptError);
              throw error; // Throw original error if decryption fails
            }
          } else {
            throw error;
          }
        }
      } else {
        console.log("Song not found");
      }
    } catch (error) {
      console.error("Error in unlock process:", error);
      throw error;
    }
  } catch (error) {
    console.error("Fatal error:", error);
    throw error;
  }
}

// Run the unlock process
main().catch(error => {
  console.error("Application failed:", error);
  process.exit(1);
}); 