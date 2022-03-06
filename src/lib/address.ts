import { PublicKey } from "@solana/web3.js";

export const truncate = (address: string) => {
    return `${address.slice(0, 3)}...${address.slice(-3)}`
}

export function validateSolAddress(address: string) {
    try {
        const pubkey = new PublicKey(address);
        return PublicKey.isOnCurve(pubkey.toBuffer());
    } catch (error) {
        return false;
    }
}
