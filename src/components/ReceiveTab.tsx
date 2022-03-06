import { Button, Modal, Result } from "antd";
import { useState } from "react";
import { MdOutlineQrCode, MdOutlineNfc } from "react-icons/md";
import QRCode from 'qrcode.react';
import { writeAddress, WritingError } from "../lib/nfc";
import toast from "react-hot-toast";

const qrCodeSize = 400;

function ReceiveTab({ address }: { address: string }) {
    const [nfcPermission, setNfcPermission] = useState(false);

    enum ScanTypes {
        NFC = 'nfc',
        QR = 'qr'
    }

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [scanningMode, setScanningMode] = useState<ScanTypes>(ScanTypes.QR);

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

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'row', marginTop: 50, marginBottom: 50, gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => showModal(ScanTypes.QR)}>
                    <MdOutlineQrCode size={100} />
                    View QR Code
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => showModal(ScanTypes.NFC)}>
                    <MdOutlineNfc size={100} />
                    Write your address to NFC tag
                </div>
            </div>
            <Modal title="Scan SOL address" visible={isModalVisible} onOk={() => setIsModalVisible(false)} onCancel={() => setIsModalVisible(false)}>
                {typeof window && isModalVisible && scanningMode === ScanTypes.QR && (
                    <>
                        <QRCode value={address} renderAs="svg" width="100%" size={qrCodeSize} imageSettings={
                            { src: 'https://bafkreihfoippppifivpnf6cc5ixwn7lxcw2wz2rrtwazdb4qpa4dabqyvq.ipfs.dweb.link/?filename=solana-sol-logo.png', excavate: true, width: qrCodeSize * 0.15, height: qrCodeSize * 0.15 }
                        } />
                    </>
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
                            <>
                                <Button
                                    type="primary"
                                    key="console"
                                    onClick={async () => {
                                        await writeAddress(address).catch(e => {
                                            if (e instanceof WritingError) {
                                                toast.error(e.message);
                                            }
                                            if (e instanceof ReferenceError) {
                                                toast.error(e.message);
                                            }
                                        }).then(() => toast.success('Wrote to the tag'));
                                    }}
                                >
                                    Start writing
                                </Button>
                            </>
                        )}
                    </>
                )}
            </Modal>
        </>
    )
}

export default ReceiveTab;
