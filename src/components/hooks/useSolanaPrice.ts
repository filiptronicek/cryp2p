import { useEffect, useState } from 'react'

export interface CoincapResponse {
    data: Data;
    timestamp: number;
}

export interface Data {
    id: string;
    rank: string;
    symbol: string;
    name: string;
    supply: string;
    maxSupply: string;
    marketCapUsd: string;
    volumeUsd24Hr: string;
    priceUsd: string;
    changePercent24Hr: string;
    vwap24Hr: string;
}

export const useSolanaPrice = (
    priceUpdated: number
): number => {
    const [price, setSolPrice] = useState<number>(0);
    const getPrice = async () => {
        try {
            const response = await fetch('https://api.coincap.io/v2/assets/solana');
            if (response.ok) {
                const data: CoincapResponse = await response.json();
                setSolPrice(parseFloat(data.data.priceUsd));
            }
        } catch { }
    }

    useEffect(() => {
        getPrice()
    }, [priceUpdated]);

    return price;
}

