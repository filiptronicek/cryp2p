import type { NextPage } from 'next'
import { Button, Divider, Input, InputNumber } from 'antd';

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
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import WAValidator from 'multicoin-address-validator';

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
  const [amount, setAmount] = useState(0);
  const [recipient, setRecipient] = useState('');
  const [balance, setBalance] = useState<null | number>(null);

  console.log(amount);

  const getBalance = async () => {
    if (publicKey) {
      const account = await connection.getAccountInfo(publicKey);
      return account?.lamports ?? null;
    }
    return null;
  }

  useEffect(() => {
    getBalance().then((balance) => setBalance(balance));
  })

  const onClick = useCallback(async () => {
    if (!publicKey) throw new WalletNotConnectedError();

    console.log(amount);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey(recipient),
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );

    const signature = await sendTransaction(transaction, connection);

    await connection.confirmTransaction(signature, 'processed');
  }, [publicKey, sendTransaction, connection, amount]);

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
            {balance && (
              <p>Your balance: { (balance / LAMPORTS_PER_SOL).toLocaleString()}</p>
            )}
            <br />
            <Input placeholder={publicKey.toString()} value={recipient} onChange={(e) => { setRecipient(e.target.value); }} />
            <InputNumber<number>
              style={{ width: 200, marginTop: 7 }}
              defaultValue={1}
              min={0}
              max={10_000_000_000}
              step={0.1}
              onChange={(amnt) => {
                setAmount(amnt);
              }}
              addonAfter="SOL"
              stringMode={false}
            />
            <br />
            <Button
              type="primary"
              onClick={onClick}
              style={{ marginTop: 15 }}
              disabled={!recipient || recipient === publicKey.toString() || !WAValidator.validate(recipient, 'sol')}
            >
              Send
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
