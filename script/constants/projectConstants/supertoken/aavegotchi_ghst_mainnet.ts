import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

export const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.GHST]: {
      vaultChains: [ChainSlug.MAINNET, ChainSlug.POLYGON_MAINNET],
      controllerChains: [ChainSlug.BASE],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000.0",
              receivingLimit: "100000",
            },
          },
          [ChainSlug.POLYGON_MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000.0",
              receivingLimit: "1000000",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000.0",
              receivingLimit: "1000000",
            },
          },
        },
      },
      superTokenInfo: {
        name: "Aavegotchi GHST Token",
        symbol: Tokens.GHST,
        decimals: 18,
        owner: "0x94cb5C277FCC64C274Bd30847f0821077B231022",
        initialSupplyOwner: "0x94cb5C277FCC64C274Bd30847f0821077B231022",
        initialSupply: "0",
      },
    },
  },
};
