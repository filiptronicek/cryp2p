import type { NextPage } from 'next'
import { Button, Tabs } from 'antd';
const { TabPane } = Tabs;

import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import toast, { Toaster } from 'react-hot-toast';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import React, { useEffect, useState } from 'react';

import SendTab from '../components/SendTab';
import { useSolanaPrice } from '../components/hooks/useSolanaPrice';

const getTestTokens = async (network: 'testnet' | 'devnet', publicKey: PublicKey) => {
  const connection = new Connection(clusterApiUrl(network));

  toast.promise(new Promise(async (resolve, reject) => {
    const airdropSignature = await connection.requestAirdrop(
      publicKey,
      LAMPORTS_PER_SOL,
    ).catch(error => toast.error(error.message));
    let i = 0;
    const interval = setInterval(async () => {
      if (++i > 25) {
        reject();
        clearInterval(interval);
      }
      if (await connection.getTransaction(airdropSignature, { commitment: 'confirmed' }).catch(e => { toast.error(e.message); clearInterval(interval) })) {
        resolve('');
        clearInterval(interval);
      }
    }, 250)
    try {
      const sig = await connection.confirmTransaction(airdropSignature);
      if (sig.value.err) {
        reject(sig.value.err);
      }
      resolve('success')
    } catch (error) {
      reject('');
    }

  }), {
    loading: 'Sending you tokens',
    success: 'Tokens sent',
    error: 'Error while sending test tokens',
  }, {
    duration: 5000,
  })
}

const Home: NextPage = () => {

  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [balance, setBalance] = useState<null | number>(null);

  const getBalance = async () => {
    if (publicKey) {
      const account = await connection.getAccountInfo(publicKey);
      return account?.lamports ?? null;
    }
    return null;
  }

  const [priceUpdated, setPriceUpdated] = useState(Date.now());
  const price = useSolanaPrice(priceUpdated);

  useEffect(() => {
    getBalance().then((balance) => setBalance(balance));
    if (publicKey) {
      connection.onAccountChange(publicKey, () => {
        getBalance().then((balance) => setBalance(balance));
      }, 'confirmed')
    }
    const interval = setInterval(() => {
      setPriceUpdated(Date.now());
    }, 60_000);

    return () => clearInterval(interval);
  }, [publicKey])

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      flexWrap: 'wrap'
    }}>
      <div><Toaster /></div>

      <div>
        {!publicKey && (
          <span>Please connect your wallet first</span>
        )}

        {publicKey &&
          <div>
            <p>Connected account: {publicKey.toString()}</p>
            {balance && (
              <p>Your balance: {(balance / LAMPORTS_PER_SOL).toLocaleString(undefined, { minimumSignificantDigits: 5, maximumSignificantDigits: 7 })} SOL (${((price * balance) / LAMPORTS_PER_SOL).toLocaleString(undefined, { maximumFractionDigits: 4 })})</p>
            )}
            <br />
            <Tabs defaultActiveKey="1" onChange={console.log}>
              <TabPane tab="Send" key="1">
                <SendTab balance={balance} publicKey={publicKey} sendTransaction={sendTransaction} price={price} />
              </TabPane>
              <TabPane tab="Receive" key="2">
                Content of Tab Pane 2
              </TabPane>
              <TabPane tab="Address book" key="3">
                <Button
                  type="primary"
                  onClick={() => { getTestTokens('devnet', publicKey) }}
                >
                  Get tokens
                </Button>
              </TabPane>
              <TabPane tab="Faucet" key="4">
                <Button
                  type="primary"
                  onClick={() => { getTestTokens('devnet', publicKey) }}
                >
                  Get tokens
                </Button>
              </TabPane>
            </Tabs>
          </div>}
      </div>
    </div>
  )
}

export default Home
