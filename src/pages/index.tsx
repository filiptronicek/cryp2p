import type { NextPage } from 'next'
import { Button, Divider, InputNumber } from 'antd';

import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import toast, { Toaster } from 'react-hot-toast';

import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { SystemProgram, Transaction } from '@solana/web3.js';
import React, { useCallback, useState } from 'react';

const getTestTokens = async (network: 'testnet' | 'devnet', publicKey: PublicKey) => {
  let connection = new Connection(clusterApiUrl(network));

  toast.promise(new Promise(async (resolve, reject) => {
    const airdropSignature = await connection.requestAirdrop(
      publicKey,
      LAMPORTS_PER_SOL,
    );
    const sig = await connection.confirmTransaction(airdropSignature);
    let account = await connection.getAccountInfo(publicKey);
    console.log(account);
    if (sig.value.err) {
      reject(sig.value.err);
    }
    resolve('success')

  }), {
    loading: 'Sending you tokens',
    success: 'Tokens sent',
    error: 'Error while sending test tokens',
  })
}

const Home: NextPage = () => {

  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [customAmount, setAmount] = useState(0);

  console.log(customAmount);

  const onClick = useCallback(async () => {
    if (!publicKey) throw new WalletNotConnectedError();

    console.log(customAmount);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey('2GLjNxR3Gf37PhDrMMa1copXXHvpSmwMbv9Qb94TK9yx'),
        lamports: customAmount * LAMPORTS_PER_SOL,
      })
    );

    const signature = await sendTransaction(transaction, connection);

    await connection.confirmTransaction(signature, 'processed');
  }, [publicKey, sendTransaction, connection, customAmount]);

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
          <span>Please log in first</span>
        )}

        {publicKey &&
          <div>
            <p>Connected account {publicKey.toString()}</p>
            <br />
            <InputNumber<number>
              style={{ width: 200 }}
              defaultValue={1}
              min={0}
              max={10_000_000_000}
              step={0.1}
              onChange={(amnt) => {
                setAmount(amnt);
              }}
              stringMode={false}
            />
            <Button
              type="primary"
              onClick={onClick}
            >
              Send to yogi
            </Button>
            <Divider orientationMargin={20}></Divider>
            <Button
              type="primary"
              onClick={() => getTestTokens('devnet', publicKey)}
            >
              Get tokens
            </Button>
          </div>}
      </div>
    </div>
  )
}

export default Home
