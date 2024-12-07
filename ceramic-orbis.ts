import { db, ORBIS_SONG_MODEL_ID, ORBIS_CONTEXT_ID } from "./config";
import { LitProtocolService } from "./lit-protocol";
import { ethers } from "ethers";
import { LPACC_EVM_CONTRACT } from '@lit-protocol/accs-schemas';
import type { AuthSig } from "@lit-protocol/types";
import { SiweMessage } from 'siwe';

// Export the Song interface
export interface Song {
  title: string;
  artist: string;
  songId: number;
  encryptedLyricsCiphertext?: string;
  encryptedLyricsHash?: string;
  encryptedLyricsConditions?: string; // JSON stringified conditions
}

export class KaraokeService {
  private litProtocol: LitProtocolService;
  private karaokeAccessContract: ethers.Contract;

  constructor(
    karaokeAccessAddress: string,
    provider: ethers.Provider,
    signer: ethers.Signer
  ) {
    this.litProtocol = new LitProtocolService(karaokeAccessAddress, provider);
    this.karaokeAccessContract = new ethers.Contract(
      karaokeAccessAddress,
      [
        "function purchaseSong(uint256 songId) external payable",
        "function hasSongAccess(address user, uint256 songId) public view returns (bool)"
      ],
      signer
    );
  }

  async initialize() {
    console.log("Initializing Lit Protocol...");
    await this.litProtocol.connect();
    console.log("Lit Protocol initialized");
  }

  async addSong(
    songId: number,
    title: string,
    artist: string,
    lyrics: string,
    chainId: number,
    authSig: {
      sig: string;
      derivedVia: string;
      signedMessage: string;
      address: string;
    }
  ) {
    console.log("Encrypting lyrics...", { songId, title, artist });
    const encryptedData = await this.litProtocol.encryptString(
      lyrics,
      songId,
      chainId,
      authSig
    );
    console.log("Lyrics encrypted");

    console.log("Creating song object...");
    const song: Song = {
      title,
      artist,
      songId,
      encryptedLyricsCiphertext: encryptedData.ciphertext,
      encryptedLyricsHash: encryptedData.dataToEncryptHash,
      encryptedLyricsConditions: JSON.stringify(encryptedData.evmContractConditions)
    };

    console.log("Storing song in Orbis...");
    const result = await db
      .insert(ORBIS_SONG_MODEL_ID)
      .value(song)
      .context(ORBIS_CONTEXT_ID)
      .run();
    console.log("Song stored in Orbis");

    if (!result) {
      throw new Error('Failed to store song data');
    }

    return result;
  }

  async purchaseSongAccess(songId: number) {
    const tx = await this.karaokeAccessContract.purchaseSong(songId, {
      value: ethers.parseEther("0.001")
    });
    await tx.wait();
  }

  async getSongLyrics(
    song: Song,
    chainId: number,
    authSig: AuthSig
  ): Promise<string> {
    if (!song.encryptedLyricsCiphertext || !song.encryptedLyricsHash || !song.encryptedLyricsConditions) {
      throw new Error("No encrypted lyrics found");
    }

    // Check if we have access
    const hasAccess = await this.karaokeAccessContract.hasSongAccess(
      authSig.address,
      song.songId
    );
    console.log("Contract access check:", { 
      address: authSig.address, 
      songId: song.songId, 
      hasAccess 
    });

    return await this.litProtocol.decryptString(
      {
        ciphertext: song.encryptedLyricsCiphertext,
        dataToEncryptHash: song.encryptedLyricsHash,
        evmContractConditions: JSON.parse(song.encryptedLyricsConditions)
      },
      chainId,
      authSig
    );
  }

  async searchSongs(query?: string) {
    console.log("Searching with query:", query);
    let queryBuilder = db
      .select()
      .from(ORBIS_SONG_MODEL_ID)
      .context(ORBIS_CONTEXT_ID);

    if (query) {
      queryBuilder = queryBuilder.where({
        $or: [
          { title: { $containsInsensitive: query } },
          { artist: { $containsInsensitive: query } }
        ]
      });
    }

    const { rows } = await queryBuilder.run();
    console.log("Raw search results:", rows);
    return rows;
  }

  async createAuthSig(signer: ethers.Signer): Promise<AuthSig> {
    const address = await signer.getAddress();
    const domain = "localhost";
    const origin = "https://localhost/login";
    const statement = "Sign this message to access encrypted lyrics with Lit Protocol.";
    
    // Generate a random 16-character alphanumeric nonce
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Set expiration to 24 hours from now
    const issuedAt = new Date();
    const expirationDate = new Date(issuedAt);
    expirationDate.setHours(expirationDate.getHours() + 24);
    
    const siweMessage = new SiweMessage({
      domain,
      address,
      statement,
      uri: origin,
      version: '1',
      chainId: 1,
      nonce,
      issuedAt: issuedAt.toISOString(),
      expirationTime: expirationDate.toISOString()  // Add expiration time
    });
    
    const messageToSign = siweMessage.prepareMessage();
    const signature = await signer.signMessage(messageToSign);
    
    return {
      sig: signature,
      derivedVia: "web3.eth.personal.sign",
      signedMessage: messageToSign,
      address: address,
    };
  }

  async checkContractBalance(): Promise<string> {
    if (!this.karaokeAccessContract.runner?.provider) {
      throw new Error("Contract not properly initialized");
    }
    const balance = await this.karaokeAccessContract.runner.provider.getBalance(
      this.karaokeAccessContract.target
    );
    return ethers.formatEther(balance);
  }
} 