import React from 'react';
import logo from './logo.svg';
import {
  PublicKey, Transaction
} from "@solana/web3.js";
import { useEffect, useState } from "react";
import './App.css';
import { generateSenderAndAirdrop, getTransferTxn, getSenderBalance, sendAndConfirmTxn } from "./services/transaction";

type DisplayEncoding = "utf8" | "hex";
type PhantomEvent = "disconnect" | "connecst" | "accountChanged";
type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

/**
 * @description gets Phantom provider, if it exists
 */
const getProvider = (): PhantomProvider | undefined => {
  if ("solana" in window) {
    // @ts-ignore
    const provider = window.solana as any;
    if (provider.isPhantom) return provider as PhantomProvider;
  }
};

function App() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<String>();
  const [balance, setBalance] = useState<number>();
  const [provider, setProvider] = useState<PhantomProvider>();
  const [walletKey, setWalletKey] = useState<PhantomProvider>();

  // this is the function that runs whenever the component updates (e.g. render, refresh)
  useEffect(() => {
    setStatus("Create sender account to start");
    const provider = getProvider();
    if (provider) setProvider(provider);
    else setProvider(undefined);
  }, []);

  // this removes the loader image once processing is done
  useEffect(() => {
    setLoading(false);
  }, [balance, provider, walletKey]);

  /**
   * @description generates a new sender account and airdrops $SOL into it.
   * This function is called when the 'Create a new Solana account' button is clicked
   */
  const initSender = async () => {
    setStatus("Generating sender account");
    setLoading(true);
    setStatus(await generateSenderAndAirdrop());
    setBalance(await getSenderBalance());
  }

  /**
   * @description prompts user to connect wallet if it exists.
   * This function is called when the 'Connect to Phantom Wallet' button is clicked
   */
  const connectWallet = async () => {
    // @ts-ignore
    const { solana } = window;

    if (solana) {
      try {
        setStatus("Please approve to connect your wallet");
        setLoading(true);
        const response = await solana.connect();
        console.log('wallet account ', response.publicKey.toString());
        setStatus("Wallet connected, ready for transfer");
        setWalletKey(response.publicKey.toString());
      } catch (err) {
        setStatus("Error Occured / User rejected the connect request");
        setLoading(false);
        console.log(err);
      }
    }
  };

  /**
   * @description multi-step transfer: create transaction -> sign by wallet -> send and confirm
   * This function is called when the 'Transfer to new wallet' button is clicked
   */
  const transferSol = async () => {
    try {
      setStatus("Please approve to transfer $SOL to your wallet");
      setLoading(true);
      const transaction = await getTransferTxn(provider!.publicKey!);
      const signed = await provider!.signTransaction(transaction!);
      setStatus(await sendAndConfirmTxn(signed));
      setBalance(await getSenderBalance());
    } catch (err) {
      setStatus("Error Occured / User rejected the transfer request");
      setLoading(false);
      console.log(err);
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <h2>Airdrop & Transfer</h2>
        <div>
          {
            loading ? <img src={logo} className="App-logo" alt="logo" /> :
              !balance || balance < 2 ? // sender not initialized
                <button
                  style={{
                    fontSize: "16px",
                    padding: "15px",
                    fontWeight: "bold",
                    borderRadius: "5px",
                  }}
                  onClick={initSender}
                >
                  Create a new Solana account
                </button> :
                !provider ?
                  <p>
                    No provider found. Install{" "}
                    <a href="https://phantom.app/">Phantom Browser extension</a>
                  </p> :
                  !walletKey ? // wallet is not connected
                    <button
                      style={{
                        fontSize: "16px",
                        padding: "15px",
                        fontWeight: "bold",
                        borderRadius: "5px",
                      }}
                      onClick={connectWallet}
                    >
                      Connect to Phantom Wallet
                    </button> : // all conditions met, ready for transfer
                    <button
                      style={{
                        fontSize: "16px",
                        padding: "15px",
                        fontWeight: "bold",
                        borderRadius: "5px",
                      }}
                      onClick={transferSol}
                    >
                      Transfer to new wallet
                    </button>
          }
          <br /><i>{status}</i>
        </div>
      </header>
    </div >
  );
}

export default App;