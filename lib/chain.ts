import { createPublicClient, http, formatEther, defineChain, type Address } from "viem";

export const electroneumMainnet = defineChain({
  id: 52014,
  name: "Electroneum",
  nativeCurrency: { name: "Electroneum", symbol: "ETN", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        "https://rpc.electroneum.com",
        "https://rpc.ankr.com/electroneum",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Electroneum Explorer",
      url: "https://blockexplorer.electroneum.com",
    },
  },
});

export const electroneumTestnet = defineChain({
  id: 5201420,
  name: "Electroneum Testnet",
  nativeCurrency: { name: "Electroneum Testnet", symbol: "ETN", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        "https://rpc.ankr.com/electroneum_testnet",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Electroneum Testnet Explorer",
      url: "https://testnet-blockexplorer.electroneum.com",
    },
  },
});

export function isTestnet(): boolean {
  return process.env.NEXT_PUBLIC_NETWORK?.toLowerCase() !== "mainnet";
}

export function getPublicClient() {
  const chain = isTestnet() ? electroneumTestnet : electroneumMainnet;
  return createPublicClient({
    chain,
    transport: http(undefined, { timeout: 8000 }),
  });
}

export interface RelayerStatus {
  address: string;
  balanceEtn: string;
  balanceRaw: string;
  isLowBalance: boolean;
  evmNonce: number;
  blockNumber: number;
  rpcLatencyMs: number;
  network: "mainnet" | "testnet";
}

export async function getRelayerStatus(): Promise<RelayerStatus> {
  const relayerAddress = (process.env.RELAYER_ADDRESS ||
    "0xED0fa5f6749b398DcD10A1E643cC0aBc3096bEa4") as Address;

  const client = getPublicClient();
  const startTime = Date.now();

  try {
    const [balance, evmNonce, blockNumber] = await Promise.all([
      client.getBalance({ address: relayerAddress }).catch(() => BigInt(0)),
      client.getTransactionCount({ address: relayerAddress }).catch(() => 0),
      client.getBlockNumber().catch(() => BigInt(0)),
    ]);

    const rpcLatencyMs = Date.now() - startTime;
    const balanceEtn = formatEther(balance);
    const balanceNum = parseFloat(balanceEtn);
    const isLowBalance = balanceNum < 50; // Alert threshold

    return {
      address: relayerAddress,
      balanceEtn: balanceNum.toFixed(4),
      balanceRaw: balance.toString(),
      isLowBalance,
      evmNonce,
      blockNumber: Number(blockNumber),
      rpcLatencyMs,
      network: isTestnet() ? "testnet" : "mainnet",
    };
  } catch {
    return {
      address: relayerAddress,
      balanceEtn: "0.0000",
      balanceRaw: "0",
      isLowBalance: true,
      evmNonce: 0,
      blockNumber: 0,
      rpcLatencyMs: Date.now() - startTime,
      network: isTestnet() ? "testnet" : "mainnet",
    };
  }
}
