import { ConfirmedSignatureInfo, Connection, PublicKey, TransactionResponse } from "@solana/web3.js";
import { Avatar, List, Space } from "antd";
import React from "react";
import { useEffect, useState } from "react";
import { truncate } from "../lib/address";

const loadTransactions = async (connection: Connection, publicKey: PublicKey) => {
    return await connection.getSignaturesForAddress(publicKey);
}

const perPage = 20;

function Transaction({ item, connection }: { item: ConfirmedSignatureInfo, connection: Connection }) {
    const [extraDetails, setExtraDetails] = useState<null | TransactionResponse>(null);

    useEffect(() => {
        //connection.getTransaction(item.signature).then(tx => setExtraDetails(tx));
    })

    console.log(extraDetails)

    return (
        <List.Item
            key={item.signature}
            actions={[
                // <>From {item.err}</>,
            ]}
        >
            <List.Item.Meta
                title={<a href={item.signature}>{truncate(item.signature)}</a>}
                //description={`From ${extraDetails && extraDetails.transaction.message.accountKeys.map(tx => truncate(tx.toString())).join()}`}
                description={`From ${extraDetails && extraDetails.meta?.logMessages || ""}`}
            />
            {"Gaming"}
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