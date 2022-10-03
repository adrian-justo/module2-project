import {
    clusterApiUrl, Connection, Keypair,
    LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction
} from "@solana/web3.js";

// global variables to be used in multiple functions
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
let sender: Keypair;

/**
 * @description generates a new sender account
 * @returns value returned by airDropSol function
 */
export const generateSenderAndAirdrop = async () => {
    sender = Keypair.generate();
    return await airDropSol(sender);
}

/**
 * @description airdrops 2 $SOL to address
 * @param address gets the public key to be used in requesting for airdrop
 * @returns status for successful/unsuccessful airdrop
 */
const airDropSol = async (address: Keypair) => {
    try {
        console.log("Airdopping some $SOL to Sender wallet!");
        const fromAirDropSignature = await connection.requestAirdrop(
            new PublicKey(address.publicKey),
            2 * LAMPORTS_PER_SOL
        );
        await confirmTxn(fromAirDropSignature);
        return "Sender account airdropped 2 $SOL";
    } catch (err) {
        console.log(err);
        return "Error Occured";
    }
};

/**
 * @description gets the latest block and confirms the transaction
 * @param signature transaction to be confirmed
 */
const confirmTxn = async (signature: string) => {
    let latestBlockHash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature
    });
}

/**
 * @description exposes sender balance to be used in App validation
 * @returns wallet balance of sender
 */
export const getSenderBalance = async () => {
    return getWalletBalance(sender);
}

/**
 * @description gets the current wallet balance of the address
 * @param address gets the public key to be able to get its' balance
 * @returns current wallet balance
 */
const getWalletBalance = async (address: Keypair) => {
    try {
        const walletBalance = await connection.getBalance(
            new PublicKey(address.publicKey)
        );
        console.log(`Wallet ${address.publicKey} balance: ${walletBalance / LAMPORTS_PER_SOL} $SOL`);
        return walletBalance;
    } catch (err) {
        console.log(err);
        return 0;
    }
};

/**
 * @description builds the transfer transaction, 2 $SOL from sender will be transferred to receiver
 * @param receiver address used to pay the transaction fee and tranfer the $SOL into
 * @returns transfer transaction to be used in signing by provider
 */
export const getTransferTxn = async (receiver: PublicKey) => {
    console.log("Building transaction");
    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: sender.publicKey,
            toPubkey: receiver,
            lamports: 2 * LAMPORTS_PER_SOL
        })
    );
    transaction.feePayer = receiver;
    let latestBlockHash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = latestBlockHash.blockhash;
    return transaction;
}

/**
 * @description sends and confirms signed transaction
 * @param signed transaction that provider has signed
 * @returns status for successful/unsuccessful transfer
 */
export const sendAndConfirmTxn = async (signed: Transaction) => {
    console.log("Processing transaction");
    signed.partialSign(sender); // added due to Error: Signature verification failed
    const signature = await connection.sendRawTransaction(signed.serialize());
    await confirmTxn(signature);
    return "Transfer successful, sender account has no balance";
}