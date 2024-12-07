// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.20;

/**
 * @title KaraokeAccess
 * @dev Manages access control for karaoke songs through purchases
 * 
 * This contract is part of a decentralized karaoke system that uses:
 * - This contract for access control
 * - Lit Protocol for encryption
 * - Ceramic/Orbis for storage
 * 
 * === Deployment Instructions ===
 * 1. Open this file in Remix IDE (https://remix.ethereum.org)
 * 2. Make sure you're using Solidity compiler 0.8.20
 * 3. Connect MetaMask to Base Sepolia network
 * 4. Deploy using "Injected Provider - MetaMask"
 * 5. Save the deployed contract address
 * 
 * === Usage ===
 * - Users can purchase access to songs for 0.001 ETH
 * - Contract owner can withdraw accumulated funds
 * - Anyone can check if a user has access to a song
 */

// OpenZeppelin contracts for security
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract KaraokeAccess is Ownable, ReentrancyGuard {
    // Price per song in wei (0.001 ETH)
    uint256 public constant SONG_PRICE = 0.001 ether;
    
    // Mapping: user address => song ID => access status
    mapping(address => mapping(uint256 => bool)) private songAccess;
    
    // Emitted when a song is purchased
    event SongPurchased(address indexed user, uint256 indexed songId);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Purchase access to a song
     * @param songId The ID of the song to purchase
     * @dev Requires exactly 0.001 ETH to be sent
     */
    function purchaseSong(uint256 songId) external payable nonReentrant {
        require(msg.value == SONG_PRICE, "Incorrect payment amount");
        require(!songAccess[msg.sender][songId], "Already purchased");
        
        songAccess[msg.sender][songId] = true;
        emit SongPurchased(msg.sender, songId);
    }
    
    /**
     * @notice Check if a user has access to a song
     * @param user The address to check
     * @param songId The ID of the song
     * @return bool Whether the user has access
     */
    function hasSongAccess(address user, uint256 songId) public view returns (bool) {
        return songAccess[user][songId];
    }
    
    /**
     * @notice Withdraw contract balance (only owner)
     * @dev Sends entire contract balance to owner
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Transfer failed");
    }
} 