import WAValidator from "multicoin-address-validator";

export const init = async () => {
    if (!('NDEFReader' in window)) { return false }

    //@ts-ignore
    const nfcPermissionStatus = await navigator.permissions.query({ name: "nfc" });
    return nfcPermissionStatus.state === 'granted';
}

const readTextRecord = (record: NDEFRecord) => {
    if (record.recordType !== "text") return null;
    const textDecoder = new TextDecoder(record.encoding);
    return textDecoder.decode(record.data);
}

/**
 * Reads a SOL address from an NFC tag
 * @returns the first found SOL address on the tag
 */
export const readAddresss = async (): Promise<undefined | string> => {
    const ndef = new NDEFReader();
    let result: undefined | string;
    ndef.scan().then(() => {
        console.log("Scan started successfully.");
        ndef.onreadingerror = () => {
            console.error("Cannot read data from the NFC tag. Try another one?");
        };
        ndef.onreading = event => {
            const message = event.message;
            for (const record of message.records) {
                console.log(record);
                switch (record.recordType) {
                    case "text":
                        const decoded = readTextRecord(record);
                        if (!decoded) continue;
                        if (WAValidator.validate(decoded, 'sol')) {
                            result = decoded;
                            break;
                        }
                }
            }
        };
    }).catch(error => {
        console.log(`Error! Scan failed to start: ${error}.`);
    });
    return result;
}
