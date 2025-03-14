import { useState, useEffect } from 'react';
import { useDynamicContext, useIsLoggedIn, useUserWallets } from "@dynamic-labs/sdk-react-core";
import { isEthereumWallet } from '@dynamic-labs/ethereum';
import { seiTestnet } from 'viem/chains';
import './Methods.css';

export default function DynamicMethods({ isDarkMode }) {
    const isLoggedIn = useIsLoggedIn();
    const { sdkHasLoaded, primaryWallet, user } = useDynamicContext();
    const userWallets = useUserWallets();
    const [isLoading, setIsLoading] = useState(true);
    const [result, setResult] = useState('');
    const [count, setCount] = useState(null);
    const [isMinting, setIsMinting] = useState(false);

    const WASMD_PRECOMPILE_ADDRESS = "0x3C56d833e9EC105F1738986b00239186caAe0872";
    const STAKE_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000001005";
    const VALIDATOR_ADDRESS = "seivaloper1sq7x0r2mf3gvwr2l9amtlye0yd3c6dqa4th95v";
    const DEFAULT_MINT_AMOUNT = 1000000000000000;

    const safeStringify = (obj) => {
        const seen = new WeakSet();
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) return '[Circular]';
                seen.add(value);
            }
            return value;
        }, 2);
    };

    useEffect(() => {
        if (sdkHasLoaded && isLoggedIn && primaryWallet) {
            setIsLoading(false);
            if (isEthereumWallet(primaryWallet)) {
                fetchCount();
            }
        } else {
            setIsLoading(true);
        }
    }, [sdkHasLoaded, isLoggedIn, primaryWallet]);

    function clearResult() {
        setResult('');
    }

    function showUser() {
        setResult(safeStringify(user));
    }

    function showUserWallets() {
        setResult(safeStringify(userWallets));
    }

    async function fetchCount() {
        if (!primaryWallet || !isEthereumWallet(primaryWallet)) return;

        try {
            const publicClient = await primaryWallet.getPublicClient();
            if (!publicClient) {
                throw new Error("Could not get public client from wallet");
            }
            const data = await publicClient.readContract({
                address: WASMD_PRECOMPILE_ADDRESS,
                abi: contractAbi,
                functionName: 'balanceOf',
                args: [primaryWallet.address]
            });

            const balanceStr = data.toString();
            console.log("User balance:", balanceStr);
            setCount(balanceStr);
            setResult(`Current count is: ${balanceStr}`);
        } catch (error) {
            console.error("Error fetching count:", error);
        }
    }

    async function mintTokens() {
        if (!primaryWallet || !isEthereumWallet(primaryWallet)) return;

        setIsMinting(true);
        setResult("Minting tokens...");

        try {
            const walletClient = await primaryWallet.getWalletClient();
            if (!walletClient) {
                throw new Error("Could not get wallet client from wallet");
            }
            const txHash = await walletClient.writeContract({
                address: WASMD_PRECOMPILE_ADDRESS,
                abi: contractAbi,
                functionName: 'mint',
                args: [primaryWallet.address, DEFAULT_MINT_AMOUNT]
            });

            setResult(`Mint transaction submitted: ${txHash}\nMinting ${DEFAULT_MINT_AMOUNT} tokens...`);

            const publicClient = await primaryWallet.getPublicClient();
            await publicClient.waitForTransactionReceipt({ hash: txHash });
            setResult(`Successfully minted ${DEFAULT_MINT_AMOUNT} tokens! Transaction: ${txHash}`);

            await fetchCount();
        } catch (error) {
            console.error("Error minting tokens:", error);
            setResult(`Error minting tokens: ${error.message}`);

            try {
                console.log("Trying alternative method to mint tokens...");
                const amount = DEFAULT_MINT_AMOUNT.toString(16).padStart(64, '0');
                const addressPadded = primaryWallet.address.slice(2).padStart(64, '0');
                const data = `0x40c10f19000000000000000000000000${addressPadded}${amount}`;

                const tx = await primaryWallet.request({
                    method: 'eth_sendTransaction',
                    params: [{
                        from: primaryWallet.address,
                        to: WASMD_PRECOMPILE_ADDRESS,
                        data: data
                    }]
                });

                setResult(`Alternative mint method transaction submitted: ${tx}\nMinting ${DEFAULT_MINT_AMOUNT} tokens...`);

                setTimeout(async () => {
                    await fetchCount();
                }, 2000);
            } catch (alternativeError) {
                console.error("Alternative mint method also failed:", alternativeError);
                setResult(`Error minting tokens: ${error.message}\nAlternative method error: ${alternativeError.message}`);
            }
        } finally {
            setIsMinting(false);
        }
    }

    async function signEthereumMessage() {
        if (!primaryWallet || !isEthereumWallet(primaryWallet)) return;

        try {
            const signature = await primaryWallet.signMessage("Hello World");
            setResult(signature);
        } catch (error) {
            console.error("Error signing message:", error);
            setResult("Error signing message: " + error.message);
        }
    }

    async function fetchPublicClient() {
        if (!primaryWallet || !isEthereumWallet(primaryWallet)) return;

        try {
            const publicClient = await primaryWallet.getPublicClient();
            setResult(safeStringify(publicClient));
        } catch (error) {
            console.error("Error fetching public client:", error);
            setResult("Error fetching public client: " + error.message);
        }
    }

    async function fetchWalletClient() {
        if (!primaryWallet || !isEthereumWallet(primaryWallet)) return;

        try {
            const walletClient = await primaryWallet.getWalletClient();
            setResult(safeStringify(walletClient));
        } catch (error) {
            console.error("Error fetching wallet client:", error);
            setResult("Error fetching wallet client: " + error.message);
        }
    }

    async function switchToSeiTestnet() {
        if (!primaryWallet || !isEthereumWallet(primaryWallet)) return;
        try {
            await primaryWallet.switchNetwork(seiTestnet.id);
            setResult(`Successfully switched to Sei Testnet (${seiTestnet.name})`);
        } catch (error) {
        }
    }

    // --- New Delegate Function ---
    async function delegateTokens() {
        if (!primaryWallet || !isEthereumWallet(primaryWallet)) return;
        setResult("Delegating tokens...");

        try {
            const walletClient = await primaryWallet.getWalletClient();
            if (!walletClient) {
                throw new Error("Could not get wallet client from wallet");
            }

            const txHash = await walletClient.writeContract({
                address: STAKE_CONTRACT_ADDRESS,
                abi: stakeContractAbi,
                functionName: 'delegate',
                args: [VALIDATOR_ADDRESS],
                value: DEFAULT_MINT_AMOUNT,
            });

            setResult(`Delegation transaction submitted: ${txHash}`);
            const publicClient = await primaryWallet.getPublicClient();
            await publicClient.waitForTransactionReceipt({ hash: txHash });
            setResult(`Successfully delegated tokens! Transaction: ${txHash}`);
        } catch (error) {
            console.error("Error delegating tokens:", error);
            setResult(`Error delegating tokens: ${error.message}`);
        }
    }

    return (
        <>
            {!isLoading && (
                <div className="dynamic-methods" data-theme={isDarkMode ? 'dark' : 'light'}>
                    <div className="contract-info">
                        <p>Current Count: {count !== null ? count : "Loading..."}</p>
                    </div>
                    <div className="methods-container">
                        <button className="btn btn-primary" onClick={showUser}>Fetch User</button>
                        <button className="btn btn-primary" onClick={showUserWallets}>Fetch User Wallets</button>
                        {primaryWallet && isEthereumWallet(primaryWallet) && (
                            <>
                                <button className="btn btn-primary" onClick={fetchPublicClient}>Fetch Public Client</button>
                                <button className="btn btn-primary" onClick={fetchWalletClient}>Fetch Wallet Client</button>
                                <button className="btn btn-primary" onClick={signEthereumMessage}>Sign "Hello World" on Ethereum</button>
                                <button className="btn btn-primary" onClick={fetchCount}>Fetch Count</button>
                                <button
                                    className="btn btn-primary"
                                    onClick={mintTokens}
                                    disabled={isMinting}
                                >
                                    {isMinting ? "Minting..." : `Mint ${DEFAULT_MINT_AMOUNT} Tokens`}
                                </button>
                                <button className="btn btn-primary" onClick={switchToSeiTestnet}>
                                    Switch to Sei Testnet
                                </button>
                                {/* New button for delegation */}
                                <button className="btn btn-primary" onClick={delegateTokens}>
                                    Delegate Tokens
                                </button>
                            </>
                        )}
                    </div>
                    {result && (
                        <div className="results-container">
              <pre className="results-text">
                {typeof result === "string" && result.startsWith("{")
                    ? JSON.stringify(JSON.parse(result), null, 2)
                    : result}
              </pre>
                        </div>
                    )}
                    {result && (
                        <div className="clear-container">
                            <button className="btn btn-primary" onClick={clearResult}>Clear</button>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

const contractAbi = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const stakeContractAbi = [
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "valAddress",
                "type": "string"
            }
        ],
        "name": "delegate",
        "outputs": [
            {
                "internalType": "bool",
                "name": "success",
                "type": "bool"
            }
        ],
        "stateMutability": "payable",
        "type": "function"
    }
];
