import { LitNodeClient, uint8arrayFromString } from "@lit-protocol/lit-node-client";
import { LIT_CHAINS, LIT_NETWORK } from "@lit-protocol/constants";
import { ethers } from "ethers";
import type { 
  AuthSig,
  ILitNodeClient,
  AccsEVMParams,
  EvmContractConditions,
  Chain,
  SessionSigsMap,
  EncryptRequest,
  DecryptRequest
} from "@lit-protocol/types";
import { LPACC_EVM_CONTRACT } from '@lit-protocol/accs-schemas';
import { SiweMessage } from 'siwe';

type EVMChainName = LPACC_EVM_CONTRACT['chain'];

const KARAOKE_ACCESS_ABI = {
  inputs: [
    { name: "user", type: "address" },
    { name: "songId", type: "uint256" }
  ],
  name: "hasSongAccess",
  outputs: [{ name: "", type: "bool" }],
  stateMutability: "view",
  type: "function"
};

export class LitProtocolService {
  private client: ILitNodeClient;
  private karaokeAccessContract: ethers.Contract;

  constructor(contractAddress: string, provider: ethers.Provider) {
    this.client = new LitNodeClient({
      litNetwork: LIT_NETWORK.DatilTest,
      debug: false
    });
    this.karaokeAccessContract = new ethers.Contract(
      contractAddress,
      [KARAOKE_ACCESS_ABI],
      provider
    );
  }

  async connect() {
    console.log("Connecting to Lit Protocol...");
    await this.client.connect();
    console.log("Connected to Lit Protocol");
  }

  private getChainName(chainId: number): EVMChainName {
    for (const [name, chain] of Object.entries(LIT_CHAINS)) {
      if (chain.chainId === chainId) {
        return name as EVMChainName;
      }
    }
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  async createAccessControlConditions(songId: number, chainId: number): Promise<LPACC_EVM_CONTRACT[]> {
    const chain = this.getChainName(chainId);
    
    const contractCondition: LPACC_EVM_CONTRACT = {
      contractAddress: this.karaokeAccessContract.target as string,
      functionAbi: KARAOKE_ACCESS_ABI,
      functionName: 'hasSongAccess',
      functionParams: [':userAddress', songId.toString()],
      chain,
      returnValueTest: {
        key: '',
        comparator: '=',
        value: 'true'
      }
    };

    return [contractCondition];
  }

  private authSigToSessionSigs(authSig: AuthSig, chain: Chain): SessionSigsMap {
    return {
      [chain]: {
        sig: authSig.sig,
        derivedVia: authSig.derivedVia,
        signedMessage: authSig.signedMessage,
        address: authSig.address
      }
    };
  }

  async encryptString(
    text: string,
    songId: number,
    chainId: number,
    authSig: AuthSig
  ) {
    console.log("Creating access control conditions...");
    const evmContractConditions = await this.createAccessControlConditions(songId, chainId);
    console.log("Access control conditions created");

    console.log("Getting chain name...");
    const chain = this.getChainName(chainId);
    console.log("Chain name:", chain);

    const request: EncryptRequest = {
      chain,
      dataToEncrypt: uint8arrayFromString(text),
      evmContractConditions,
      authSig
    };

    console.log("Encrypting data...");
    const { ciphertext, dataToEncryptHash } = await this.client.encrypt(request);
    console.log("Data encrypted");

    return {
      ciphertext,
      dataToEncryptHash,
      evmContractConditions
    };
  }

  async decryptString(
    encryptedData: {
      ciphertext: string;
      dataToEncryptHash: string;
      evmContractConditions: LPACC_EVM_CONTRACT[];
    },
    chainId: number,
    authSig: AuthSig
  ) {
    const chain = this.getChainName(chainId);
    
    const request: DecryptRequest = {
      chain,
      ciphertext: encryptedData.ciphertext,
      dataToEncryptHash: encryptedData.dataToEncryptHash,
      evmContractConditions: encryptedData.evmContractConditions,
      authSig
    };

    console.log("Decrypt request:", JSON.stringify(request, null, 2));
    const { decryptedData } = await this.client.decrypt(request);

    return Buffer.from(decryptedData.buffer).toString();
  }

  async purchaseSongAccess(songId: number) {
    try {
      console.log("Sending purchase transaction...");
      const tx = await this.karaokeAccessContract.purchaseSong(songId, {
        value: ethers.parseEther("0.001")
      });
      console.log("Transaction sent:", tx.hash);
      console.log("Waiting for confirmation...");
      const receipt = await tx.wait();
      console.log("Transaction confirmed!");

      // Verify access
      const address = receipt.from;  // Get address from receipt
      const hasAccess = await this.karaokeAccessContract.hasSongAccess(
        address,
        songId
      );
      console.log("Access verified:", hasAccess);

      return hasAccess;
    } catch (error: any) {
      // Check if the error is just insufficient funds
      if (error.code === 'INSUFFICIENT_FUNDS') {
        // Check if we actually have access already
        if (this.karaokeAccessContract.runner instanceof ethers.Wallet) {
          const address = await this.karaokeAccessContract.runner.getAddress();
          const hasAccess = await this.karaokeAccessContract.hasSongAccess(
            address,
            songId
          );
          if (hasAccess) {
            console.log("Already have access to this song!");
            return true;
          }
        }
      }
      throw error;
    }
  }

  private async createAuthSig(signer: ethers.Signer): Promise<AuthSig> {
    const address = await signer.getAddress();
    const timestamp = new Date().toISOString();
    const message = `I am signing this message to access Lit Protocol at ${timestamp}`;
    const signature = await signer.signMessage(message);
    
    return {
      sig: signature,
      derivedVia: "web3.eth.personal.sign",
      signedMessage: message,
      address: address,
    };
  }
} 