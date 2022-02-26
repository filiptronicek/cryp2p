import { QrcodeOutlined } from "@ant-design/icons";
import { EtherscanProvider } from "@ethersproject/providers";
import { SendTransactionOptions, WalletNotConnectedError } from "@solana/wallet-adapter-base";
import { useConnection } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import { Input, Tooltip, Button, InputNumber, Result, Modal, Select } from "antd";
import { getDefaultProvider } from "ethers";
import dynamic from "next/dynamic";
import { useState, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { truncate } from "../lib/address";

const BarcodeScannerComponent = dynamic(() => import('react-qr-barcode-scanner'), { ssr: false });
const { Option } = Select;

function validateSolAddress(address: string) {
    try {
        const pubkey = new PublicKey(address);
        return PublicKey.isOnCurve(pubkey.toBuffer());
    } catch (error) {
        return false;
    }
}

export default function SendTab(
    {
        sendTransaction,
        publicKey,
        balance,
        price
    }:
        {
            sendTransaction: (transaction: Transaction, connection: Connection, options?: SendTransactionOptions | undefined) => Promise<string>;
            publicKey: PublicKey;
            balance: number | null;
            price: number
        }) {
    const { connection } = useConnection();
    const [amount, setAmount] = useState(0);
    const [isAddressValid, setIsAddressValid] = useState(false);
    const [recipient, setRecipient] = useState('57xndEKxm8hjinu81YAzakxWiC2u7AxS7rZyC2y2KfDC');
    const [sent, setSent] = useState(false);
    const [currentCurrency, setCurrentCurrency] = useState('SOL');
    const provider = new EtherscanProvider(undefined, process.env.ETHERSCAN_KEY);

    const [isModalVisible, setIsModalVisible] = useState(false);

    useMemo(async () => {
        if (recipient && recipient !== publicKey.toString() && validateSolAddress(recipient)) {
            setIsAddressValid(true);
            return;
        }

        try {
            const address = await provider.resolveName(recipient);
            const resolver = await provider.getResolver(recipient);

            if (!address) {
                setIsAddressValid(false);
                return;
            }

            //TODO(ft): ge the SOL addresss, somehow
            console.log(await resolver?.getText('SOL'))
        } catch {
            setIsAddressValid(false);
            return;
        }

        setIsAddressValid(true);
    }, [recipient]);

    const showModal = () => {
        setIsModalVisible(true);
        setRecipient('');
    };

    const selectAfter = (
        <Select defaultValue="SOL" style={{ width: 80 }} onChange={(e) => {
            switch (e) {
                case 'USD':
                    setAmount(amount * price);
                    break;
                case 'SOL':
                    setAmount(amount / price);
                    break;
            }
            setCurrentCurrency(e);
        }}>
            <Option value="SOL">SOL</Option>
            <Option value="USD">USD</Option>
        </Select>
    );

    const sendMonies = useCallback(async () => {
        if (!publicKey) throw new WalletNotConnectedError();
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: new PublicKey(recipient),
                lamports: currentCurrency === 'SOL' ? amount * LAMPORTS_PER_SOL : (amount / price) * LAMPORTS_PER_SOL,
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
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '2em' }}>
                        <InputNumber<number>
                            style={{ width: 200, marginTop: 7 }}
                            defaultValue={1}
                            value={amount}
                            min={0}
                            max={balance && currentCurrency === "SOL" ? balance / LAMPORTS_PER_SOL : Infinity}
                            step={0.1}
                            onChange={(amnt) => {
                                setAmount(amnt);
                            }}
                            addonAfter={selectAfter}
                            stringMode={false}
                        /> {currentCurrency === 'SOL' && <> ~ ${(price * amount).toLocaleString()}</>}
                    </div>
                    <br />
                    <Button
                        type="primary"
                        onClick={sendMonies}
                        style={{ marginTop: 15 }}
                        disabled={!isAddressValid}
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