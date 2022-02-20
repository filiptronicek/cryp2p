import type { NextPage } from 'next'
import { Button, Divider, Input, InputNumber, Modal, Tooltip } from 'antd';

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
import React, { useCallback, useEffect, useState } from 'react';

import WAValidator from 'multicoin-address-validator';
import { QrcodeOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
const BarcodeScannerComponent = dynamic(() => import('react-qr-barcode-scanner'), { ssr: false })

const getTestTokens = async (network: 'testnet' | 'devnet', publicKey: PublicKey) => {
  let connection = new Connection(clusterApiUrl(network));

  toast.promise(new Promise(async (resolve, reject) => {
    const airdropSignature = await connection.requestAirdrop(
      publicKey,
      LAMPORTS_PER_SOL,
    );
    let i = 0;
    const interval = setInterval(async () => {
      if (++i > 100) {
        reject();
        clearInterval(interval);
      }
      if (await connection.getTransaction(airdropSignature, { commitment: 'confirmed' })) {
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
  const [amount, setAmount] = useState(0);
  const [recipient, setRecipient] = useState('');
  const [balance, setBalance] = useState<null | number>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = () => {
    setIsModalVisible(true);
    setRecipient('');
  };

  const getBalance = async () => {
    if (publicKey) {
      const account = await connection.getAccountInfo(publicKey);
      return account?.lamports ?? null;
    }
    return null;
  }

  useEffect(() => {
    getBalance().then((balance) => setBalance(balance));
    if (publicKey) {
      connection.onAccountChange(publicKey, () => {
        getBalance().then((balance) => setBalance(balance));
      }, 'confirmed')
    }
  }, [publicKey])

  const sendMonies = useCallback(async () => {
    if (!publicKey) throw new WalletNotConnectedError();
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey('57xndEKxm8hjinu81YAzakxWiC2u7AxS7rZyC2y2KfDC'),
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );

    const signature = await sendTransaction(transaction, connection);

    getBalance().then((balance) => setBalance(balance));

    toast.promise(new Promise(async (resolve, reject) => {
      let i = 0;
      const interval = setInterval(async () => {
        if (++i > 100) {
          reject();
          clearInterval(interval);
        }

        if (await connection.getTransaction(signature, { commitment: 'confirmed' })) {
          resolve('');
          clearInterval(interval);
        }
      }, 250)
    }), {
      loading: 'Sending tokens',
      success: <>Tokens sent.&nbsp;<a target="_blank" href={`https://solscan.io/tx/${signature}?cluster=devnet`}>View transaction</a></>,
      error: 'Error while sending test tokens',
    }, {
      duration: 5000,
    });

    // We catch and don't do anything with errors because they happen on every transaction for some reason
    const info = await connection.confirmTransaction(signature, 'confirmed').catch(() => { });

    console.log(info);
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
            <p>Connected account: {publicKey.toString()}</p>
            {balance && (
              <p>Your balance: {(balance / LAMPORTS_PER_SOL).toLocaleString()} SOL</p>
            )}
            <br />
            <Input.Group compact>
              <Input style={{ width: 'calc(100% - 200px)' }}
                placeholder={publicKey.toString()} value={recipient} onChange={(e) => { setRecipient(e.target.value); }} suffix />

              <Tooltip title="scan address">
                <Button icon={<QrcodeOutlined />} onClick={showModal} />
              </Tooltip>
            </Input.Group>
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
              onClick={sendMonies}
              style={{ marginTop: 15 }}
              disabled={!recipient || recipient === publicKey.toString() || !WAValidator.validate(recipient, 'sol')}
            >
              Send
            </Button>
            <Divider orientationMargin={20}></Divider>
            <Button
              type="primary"
              onClick={() => { getTestTokens('devnet', publicKey) }}
            >
              Get tokens
            </Button>
          </div>}
      </div>
      <Modal title="Scan SOL address" visible={isModalVisible} onOk={() => setIsModalVisible(false)} onCancel={() => setIsModalVisible(false)}>
        {typeof window && isModalVisible && (
          <BarcodeScannerComponent
            width='100%'
            height={500}
            stopStream={!isModalVisible}
            onUpdate={(err, result) => {
              if (result) {
                //@ts-ignore
                setRecipient(result.text);
                toast.success('Scanned successfully');
                setIsModalVisible(false);
              }
            }}
          />
        )}
      </Modal>
    </div>
  )
}

export default Home
