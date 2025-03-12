import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { createConfig, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import { sei, seiTestnet} from "viem/chains";
import Main from "./Main";
import '@sei-js/sei-account/eip6963';


const config = createConfig({
    chains: [sei, seiTestnet],
    multiInjectedProviderDiscovery: false,
    transports: {
        [sei.id]: http(),
        [seiTestnet.id]: http(),
    },
});

const queryClient = new QueryClient();

const App = () => (
    <DynamicContextProvider
        theme="auto"
        settings={{
            environmentId: "f981dab3-486c-4fd9-8e35-0a3cc32f263d",
            walletConnectors: [EthereumWalletConnectors],
        }}
    >
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <DynamicWagmiConnector>
                    <Main />
                </DynamicWagmiConnector>
            </QueryClientProvider>
        </WagmiProvider>
    </DynamicContextProvider>
);

export default App;