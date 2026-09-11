import { wagmiConnectors } from "./wagmiConnectors";
import { Chain, createClient, fallback, http } from "viem";
import { hardhat, mainnet } from "viem/chains";
import { createConfig } from "wagmi";
import scaffoldConfig, { DEFAULT_ALCHEMY_API_KEY, ScaffoldConfig } from "~~/scaffold.config";
import { emDesenvolvimento } from "~~/utils/desenvolvimento";
import { getAlchemyHttpUrl } from "~~/utils/scaffold-eth";

/**
 * A cadeia local fica fora do wagmi em producao.
 *
 * `scaffold.config` mantem a foundry na lista porque e dela que os hooks tiram
 * a tipagem dos contratos implantados -- mas o wagmi nao liga para tipo: ele
 * cria um transporte de verdade para cada cadeia e fica consultando. Publicada,
 * a aplicacao passava a bombardear `127.0.0.1:8545` a cada poucos segundos: o
 * anvil da maquina de quem programou, que nao existe para o visitante. O
 * console do navegador enchia de ERR_FAILED e de erro de CORS de loopback.
 */
const redesAtivas = scaffoldConfig.targetNetworks.filter(
  rede => emDesenvolvimento() || rede.id !== (hardhat as Chain).id,
);

const targetNetworks = (redesAtivas.length > 0 ? redesAtivas : scaffoldConfig.targetNetworks) as readonly [
  Chain,
  ...Chain[],
];

// We always want to have mainnet enabled (ENS resolution, ETH price, etc). But only once.
export const enabledChains = targetNetworks.find((network: Chain) => network.id === 1)
  ? targetNetworks
  : ([...targetNetworks, mainnet] as const);

export const wagmiConfig = createConfig({
  chains: enabledChains,
  connectors: wagmiConnectors(),
  ssr: true,
  client: ({ chain }) => {
    const mainnetFallbackWithDefaultRPC = [http("https://mainnet.rpc.buidlguidl.com")];
    let rpcFallbacks = [...(chain.id === mainnet.id ? mainnetFallbackWithDefaultRPC : []), http()];
    const rpcOverrideUrl = (scaffoldConfig.rpcOverrides as ScaffoldConfig["rpcOverrides"])?.[chain.id];
    if (rpcOverrideUrl) {
      rpcFallbacks = [http(rpcOverrideUrl), ...rpcFallbacks];
    } else {
      const alchemyHttpUrl = getAlchemyHttpUrl(chain.id);
      if (alchemyHttpUrl) {
        const isUsingDefaultKey = scaffoldConfig.alchemyApiKey === DEFAULT_ALCHEMY_API_KEY;
        rpcFallbacks = isUsingDefaultKey
          ? [...rpcFallbacks, http(alchemyHttpUrl)]
          : [http(alchemyHttpUrl), ...rpcFallbacks];
      }
    }
    return createClient({
      chain,
      transport: fallback(rpcFallbacks),
      ...(chain.id !== (hardhat as Chain).id ? { pollingInterval: scaffoldConfig.pollingInterval } : {}),
    });
  },
});
