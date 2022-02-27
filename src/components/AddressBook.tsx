import { Avatar, Card, Skeleton } from "antd";
import Meta from "antd/lib/card/Meta";
import { SettingOutlined, DeleteOutlined, EditOutlined, CopyOutlined } from "@ant-design/icons";
import { truncate } from "../lib/address";
import { useState } from "react";
import { useCopyToClipboard, useLocalStorage } from 'usehooks-ts'
import toast from "react-hot-toast";

interface Contact {
    name: string,
    address: string,
}

export default function AddressBook() {

    const [contacts, setContacts] = useLocalStorage<Contact[]>('addrbook', [{ name: "Tronislav Rostíček", address: "57xndEKxm8hjinu81YAzakxWiC2u7AxS7rZyC2y2KfDC" }])
    const [_value, copy] = useCopyToClipboard()

    return (
        <>
            {contacts.map(contact => (
                <Card
                    style={{ width: 300, marginTop: 16 }}
                    actions={[
                        <SettingOutlined key="setting" />,
                        <DeleteOutlined title="Delete contact" key="delete" onClick={() => {
                            const newContacts = contacts.filter(currContact => currContact.address !== contact.address);
                            setContacts(newContacts);
                        }} />,
                        <CopyOutlined title="Copy address" key="copy" onClick={() => { copy(contact.address); toast.success('Address copied') }} />,
                    ]}
                >
                    <Skeleton loading={false} avatar active>
                        <Meta
                            avatar={<Avatar src="https://joeschmoe.io/api/v1/random" />}
                            title={contact.name}
                            description={truncate(contact.address)}
                        />
                    </Skeleton>
                </Card>
            ))}
        </>
    );
}
