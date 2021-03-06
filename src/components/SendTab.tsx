import { EtherscanProvider } from "@ethersproject/providers";
import { SendTransactionOptions, WalletNotConnectedError } from "@solana/wallet-adapter-base";
import { useConnection } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import { Input, Button, InputNumber, Result, Modal, Select, Divider } from "antd";
import { getDefaultProvider } from "ethers";
import dynamic from "next/dynamic";
import { useState, useCallback, useMemo, Dispatch, SetStateAction, useEffect } from "react";
import toast from "react-hot-toast";
import { truncate } from "../lib/address";
import { MdOutlineNfc, MdOutlineQrCode } from 'react-icons/md';
import { validateSolAddress } from "../lib/address";
import { init, readAddresss } from "../lib/nfc";

const BarcodeScannerComponent = dynamic(() => import('react-qr-barcode-scanner'), { ssr: false });
const { Option } = Select;

export const Scan = ({ isModalVisible, setIsModalVisible, setRecipient }: { isModalVisible: boolean; setIsModalVisible: Dispatch<SetStateAction<boolean>>, setRecipient: Dispatch<SetStateAction<string>> }) => {
    useEffect(() => {
        if (isModalVisible) {
            (async function () {
                if (!(await init())) {
                    toast.error('Permission error');
                    return;
                }

                const foundAddresss = await readAddresss();
                if (!foundAddresss) {
                    toast.error('Could not find any addresses on the tag');
                    return;
                }
                setRecipient(foundAddresss);

            }());
        }
    }, [isModalVisible])
    return (
        < Result
            status="info"
            title="Scanning"
            extra={
                <>
                    <Button type="primary" key="close" onClick={() => setIsModalVisible(false)}>
                        Close scanner
                    </Button>
                </>
            }
        />)
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
    const [sent, setSent] = useState<boolean | string>(false);
    const [currentCurrency, setCurrentCurrency] = useState('SOL');
    const provider = new EtherscanProvider(undefined, process.env.ETHERSCAN_KEY);

    const [cameraPermission, setCameraPermission] = useState(false);
    const [nfcPermission, setNfcPermission] = useState(false);

    enum ScanTypes {
        NFC = 'nfc',
        QR = 'qr'
    }

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [scanningMode, setScanningMode] = useState<ScanTypes>(ScanTypes.QR)

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

    const showModal = async (type: ScanTypes) => {

        setIsModalVisible(true);

        switch (type) {
            case ScanTypes.NFC: {
                if (!('NDEFReader' in window)) {
                    setNfcPermission(false);
                    break
                };

                //@ts-ignore
                const nfcPermissionStatus = await navigator.permissions.query({ name: "nfc" });
                setNfcPermission(nfcPermissionStatus.state === 'granted');
                break;
            }
        }

        setScanningMode(type);
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
                    setSent(signature);
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
                        <label>
                            Enter your desired destination address
                            <Input style={{ width: 'calc(100% - 200px)' }}
                                placeholder={publicKey.toString()} value={recipient} onChange={(e) => { setRecipient(e.target.value); }} suffix />
                        </label>
                    </Input.Group>

                    <Divider dashed={true} />
                    OR

                    <div style={{ display: 'flex', flexDirection: 'row', marginTop: 50, marginBottom: 50, gap: 20 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => showModal(ScanTypes.QR)}>
                            <MdOutlineQrCode size={100} />
                            Scan QR Code
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => showModal(ScanTypes.NFC)}>
                            <MdOutlineNfc size={100} />
                            Scan NFC tag
                        </div>
                    </div>

                    <label>
                        Enter your desired amount
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
                    </label>
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
                        <Button type="primary" key="close">
                            <a href={`https://solscan.io/tx/${sent}?cluster=devnet`} target="_blank" rel="noopener noreferrer">
                                View tx on solscan
                            </a>
                        </Button>
                    ]}
                />
            )}

            <Modal title="Scan SOL address" visible={isModalVisible} onOk={() => setIsModalVisible(false)} onCancel={() => setIsModalVisible(false)}>
                {typeof window && isModalVisible && scanningMode === ScanTypes.QR && (
                    <BarcodeScannerComponent
                        width='100%'
                        height={500}
                        stopStream={!isModalVisible}
                        onUpdate={(_err, result) => {
                            if (result) {
                                //@ts-ignore
                                setRecipient(result.text);
                                toast.success('Scanned successfully');
                                setIsModalVisible(false);
                            }
                        }}
                    />
                )}
                {typeof window && isModalVisible && scanningMode === ScanTypes.NFC && (
                    <>
                        {!('NDEFReader' in window) && (
                            <Result
                                status="error"
                                title="Your browser does not support scanning NFC tags."
                                extra={
                                    <>
                                        {(navigator.userAgentData && navigator.userAgentData.platform === "iOS") || window.navigator.platform === "iOS" && (
                                            <Button type="primary" key="console">
                                                <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">
                                                    Scan with our iOS app
                                                </a>
                                            </Button>
                                        )}
                                        <Button type="primary" key="close" onClick={() => setIsModalVisible(false)}>
                                            Close scanner
                                        </Button>
                                    </>
                                }
                            />
                        )}
                        {!nfcPermission && ('NDEFReader' in window) && (
                            <Result
                                status="error"
                                title="You denied access to scanning."
                                extra={
                                    <>
                                        <Button type="primary" key="close" onClick={() => setIsModalVisible(false)}>
                                            Close scanner
                                        </Button>
                                    </>
                                }
                            />
                        )}
                        {nfcPermission && (
                            <Scan setIsModalVisible={setIsModalVisible} setRecipient={setRecipient} isModalVisible={isModalVisible} />
                        )}
                    </>
                )}
            </Modal>
        </>
    )
}