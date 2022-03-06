import { validateSolAddress } from "./address";

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

export class WritingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "WritingError";
    }
}

export const writeAddress = async (address: string): Promise<boolean> => {
    if (!(await init())) throw new ReferenceError('Your browser does not support NFC tags');  
    const ndef = new NDEFReader();
    await ndef.write(
        address
    ).catch(error => {
        throw new WritingError(`Write failed :-( try again: ${error}.`);
    });
    return true;
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
                        if (validateSolAddress(decoded)) {
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
