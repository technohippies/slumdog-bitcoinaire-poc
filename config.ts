import { OrbisDB } from '@useorbis/db-sdk';
import { OrbisKeyDidAuth, KeyDidSession } from '@useorbis/db-sdk/auth';
import { logger } from './utils/logger';

// Helper function to get environment variables with VITE_ prefix
function getEnvVar(name: string): string {
    // Remove VITE_ prefix if present in the name parameter
    const cleanName = name.replace('VITE_', '');
    // Try both with and without VITE_ prefix
    const value = process.env[`VITE_${cleanName}`] || process.env[cleanName];
    if (!value) {
        throw new Error(`Missing environment variable: VITE_${cleanName} or ${cleanName}`);
    }
    return value;
}

// Initialize Orbis with configuration
export const db = new OrbisDB({
    ceramic: {
        gateway: getEnvVar('CERAMIC_NODE_URL')
    },
    nodes: [
        {
            gateway: getEnvVar('ORBIS_NODE_URL'),
            env: getEnvVar('ORBIS_ENVIRONMENT_ID')
        }
    ]
});

// Initialize authentication
export async function initAuth(): Promise<void> {
    logger.log('Setting up authentication...');
    const privateKey = getEnvVar('ORBIS_PRIVATE_KEY');
    
    // Create a session from the private key
    const session = new KeyDidSession(privateKey, `did:key:${privateKey}`);
    const auth = await OrbisKeyDidAuth.fromSession(session);
    
    logger.log('Connecting to Orbis...');
    await db.connectUser({ auth, saveSession: false });
    
    logger.log('OrbisDB initialized and authenticated');
}

// Model IDs
export const ORBIS_SONG_MODEL_ID = getEnvVar('ORBIS_SONG_MODEL');
export const ORBIS_CONTEXT_ID = getEnvVar('ORBIS_CONTEXT_ID'); 