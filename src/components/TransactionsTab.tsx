import { ConfirmedSignatureInfo, Connection, LAMPORTS_PER_SOL, PublicKey, TransactionResponse } from "@solana/web3.js";
import { List } from "antd";
import React from "react";
import { useEffect, useState } from "react";
import { truncate } from "../lib/address";
import { useReadLocalStorage } from 'usehooks-ts'
import { Contact } from "./AddressBook";
import { formatDistance } from 'date-fns'

const loadTransactions = async (connection: Connection, publicKey: PublicKey) => {
    return await connection.getSignaturesForAddress(publicKey, { limit: 50 });
}

const perPage = 20;

function Transaction({ item, connection }: { item: ConfirmedSignatureInfo, connection: Connection }) {
    const [extraDetails, setExtraDetails] = useState<null | TransactionResponse>(null);
    const contacts = useReadLocalStorage<Contact[]>('addrbook');

    useEffect(() => {
        connection.getTransaction(item.signature).then(tx => setExtraDetails(tx));
    }, [item])

    //@ts-ignore
    const transfered = extraDetails?.meta?.postBalances && (extraDetails?.meta?.preBalances?.at(0) - extraDetails?.meta?.postBalances?.at(0) - extraDetails.meta.fee);
    const fromContactName = contacts?.find((ct) => ct.address === extraDetails?.transaction.message.accountKeys[0].toString())?.name || extraDetails && truncate(extraDetails?.transaction.message.accountKeys[0].toString());
    const toContactName = contacts?.find((ct) => ct.address === extraDetails?.transaction.message.accountKeys[1].toString())?.name || extraDetails && truncate(extraDetails?.transaction.message.accountKeys[1].toString());

    return (
        <List.Item
            key={item.signature}
            actions={[
                // <>From {item.err}</>,
            ]}
        >
            <List.Item.Meta
                title={<a target="_blank" href={`https://solscan.io/tx/${item.signature}?cluster=devnet`}>{item.blockTime && formatDistance(
                    new Date(item.blockTime * 1000),
                    new Date(),
                    { addSuffix: true }
                  )}</a>}
                description={`From ${fromContactName} to ${toContactName}`}
            />
            {transfered ? transfered / LAMPORTS_PER_SOL : 0} SOL
        </List.Item>
    )
}

export default function TransactionsTab({ connection, publicKey }: { connection: Connection, publicKey: PublicKey }) {

    const [transactions, setTransactions] = useState<ConfirmedSignatureInfo[]>([]);

    useEffect(() => {
        loadTransactions(connection, publicKey).then((txs) => setTransactions(txs));
    }, [publicKey])

    return (
        <List
            itemLayout="vertical"
            size="large"
            pagination={{
                onChange: page => {
                    console.log(page);
                },
                pageSize: perPage,
            }}
            dataSource={transactions}
            renderItem={item => (
                <Transaction connection={connection} item={item} />
            )}
        />
    )
}