import { Button, Card, Divider, Form, Input, Modal, Skeleton, Space } from "antd";
import Meta from "antd/lib/card/Meta";
import { SettingOutlined, DeleteOutlined, CopyOutlined, PlusSquareFilled } from "@ant-design/icons";
import { truncate } from "../lib/address";
import { useState } from "react";
import { useCopyToClipboard, useLocalStorage } from 'usehooks-ts'
import toast from "react-hot-toast";
import { validateSolAddress } from "./SendTab";

interface Contact {
    name: string,
    address: string,
}

type ValidateStatus = Parameters<typeof Form.Item>[0]['validateStatus'];

const sampleData = [
    { name: "Tronislav Rostíček", address: "57xndEKxm8hjinu81YAzakxWiC2u7AxS7rZyC2y2KfDC" },
    { name: "Rostislav Troníček", address: "Dbo9t2QVibUZYfgywhPo5BQh8tNSxFnAFzrSZc7mZF8x" },
];

export default function AddressBook() {

    const [contacts, setContacts] = useLocalStorage<Contact[]>('addrbook', sampleData);
    const [isModalVisible, setIsAddModalVisible] = useState(false);
    const [_value, copy] = useCopyToClipboard();

    const [addAddress, setAddaddress] = useState<{
        value: string;
        validateStatus?: ValidateStatus;
        errorMsg?: string | null;
    }>({
        value: '',
    });

    const onNumberChange = (value: string) => {
        setAddaddress({
            ...validatePrimeNumber(value),
            value,
        });
    };

    function validatePrimeNumber(
        address: string,
    ): { validateStatus: ValidateStatus; errorMsg: string | null } {
        console.log(contacts.map(contact => contact.address));
        console.log(address);
        if (contacts.map(contact => contact.address).includes(address)) {
            return {
                validateStatus: 'error',
                errorMsg: 'This address is already in your contact book!',
            };
        }
        if (!validateSolAddress(address)) {
            return {
                validateStatus: 'error',
                errorMsg: 'Invalid address',
            };
        }
        return {
            validateStatus: 'success',
            errorMsg: null,
        };
    }

    return (
        <>
            <Button
                type="primary"
                icon={<PlusSquareFilled />}
                onClick={() => { setIsAddModalVisible(true) }}
            >
                Add address
            </Button>
            <Modal title="Add contact" visible={isModalVisible} onOk={() => setIsAddModalVisible(false)} onCancel={() => setIsAddModalVisible(false)}>
                <Form
                    name="basic"
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                    initialValues={{ remember: true }}
                    onFinish={(values) => {
                        const newContacts = contacts;
                        newContacts.push({ name: values.name, address: values.address })
                        setContacts(newContacts);
                        setIsAddModalVisible(false);
                    }}
                    autoComplete="off"
                >
                    <Form.Item
                        label="Name"
                        name="name"
                        rules={[{ required: true, message: 'Please input the name of the contact!' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Address"
                        name="address"
                        validateStatus={addAddress.validateStatus}
                        rules={[{ required: true, message: 'Please input the address of the contact!' }]}
                        help={addAddress.errorMsg || undefined}
                    >
                        <Input value={addAddress.value} onChange={(e) => { onNumberChange(e.target.value) }} />
                    </Form.Item>
                    <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
                        <Button type="primary" htmlType="submit">
                            Add
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
            <Divider />
            {contacts.map(contact => (
                <Card
                    style={{ width: 300, marginTop: 16 }}
                    actions={[
                        <SettingOutlined key="setting" disabled={true} />,
                        <DeleteOutlined title="Delete contact" key="delete" onClick={() => {
                            const newContacts = contacts.filter(currContact => currContact.address !== contact.address);
                            setContacts(newContacts);
                        }} />,
                        <CopyOutlined title="Copy address" key="copy" onClick={() => { copy(contact.address); toast.success('Address copied') }} />,
                    ]}
                    key={contact.address}
                >
                    <Skeleton loading={false} avatar active>
                        <Meta
                            title={contact.name}
                            description={truncate(contact.address)}
                        />
                    </Skeleton>
                </Card>
            ))}
        </>
    );
}
