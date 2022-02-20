import { QrcodeOutlined } from "@ant-design/icons";
import { SendTransactionOptions, WalletNotConnectedError } from "@solana/wallet-adapter-base";
import { useConnection } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import { Input, Tooltip, Button, InputNumber, Result, Modal } from "antd";
import WAValidator from "multicoin-address-validator";
import dynamic from "next/dynamic";
import { useState, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import { useSolanaPrice } from "../hooks/useSolanaPrice";
import { truncate } from "../lib/address";
const BarcodeScannerComponent = dynamic(() => import('react-qr-barcode-scanner'), { ssr: false })

export default function SendTab(
    {
        sendTransaction,
        publicKey,
        balance
    }:
        {
            sendTransaction: (transaction: Transaction, connection: Connection, options?: SendTransactionOptions | undefined) => Promise<string>;
            publicKey: PublicKey;
            balance: number | null;
        }) {
    const { connection } = useConnection();
    const [amount, setAmount] = useState(0);
    const [recipient, setRecipient] = useState('57xndEKxm8hjinu81YAzakxWiC2u7AxS7rZyC2y2KfDC');
    const [sent, setSent] = useState(false);

    const [isModalVisible, setIsModalVisible] = useState(false);
    
    const [priceUpdated, setPriceUpdated] = useState(Date.now());
    const price = useSolanaPrice(priceUpdated);

    useEffect(() => {
        const interval = setInterval(() => {
          setPriceUpdated(Date.now());
        }, 25_000);
      
        return () => clearInterval(interval);
      }, []);

    const showModal = () => {
        setIsModalVisible(true);
        setRecipient('');
    };

    const sendMonies = useCallback(async () => {
        if (!publicKey) throw new WalletNotConnectedError();
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: new PublicKey(recipient),
                lamports: amount * LAMPORTS_PER_SOL,
            })
        );

        const signature = await sendTransaction(transaction, connection);

        toast.promise(new Promise(async (resolve, reject) => {
            let i = 0;
            const interval = setInterval(async () => {
                if (++i > 100) {
                    reject();
                    clearInterval(interval);
                }

                if (await connection.getTransaction(signature, { commitment: 'confirmed' })) {
                    setSent(true);
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
        <>
            {!sent ? (
                <>
                    <Input.Group compact>
                        <Input style={{ width: 'calc(100% - 200px)' }}
                            placeholder={publicKey.toString()} value={recipient} onChange={(e) => { setRecipient(e.target.value); }} suffix />
                        <Tooltip title="scan address">
                            <Button icon={<QrcodeOutlined />} onClick={showModal} />
                        </Tooltip>
                    </Input.Group>
                    <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '2em'}}>
                    <InputNumber<number>
                        style={{ width: 200, marginTop: 7 }}
                        defaultValue={1}
                        min={0}
                        max={balance ? balance / LAMPORTS_PER_SOL : Infinity}
                        step={0.1}
                        onChange={(amnt) => {
                            setAmount(amnt);
                        }}
                        addonAfter="SOL"
                        stringMode={false}
                    />  ~ ${(price * amount).toLocaleString()}
                    </div>
                    <br />
                    <Button
                        type="primary"
                        onClick={sendMonies}
                        style={{ marginTop: 15 }}
                        disabled={!recipient || recipient === publicKey.toString() || !WAValidator.validate(recipient, 'sol')}
                    >
                        Send
                    </Button>
                </>
            ) : (
                <Result
                    status="success"
                    title={`Successfully sent ${amount} SOL to ${truncate(recipient)}`}
                    extra={[
                        <Button type="primary" key="close" onClick={() => setSent(false)}>
                            Send more
                        </Button>,
                    ]}
                />
            )}

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
        </>
    )
}