import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants, ProjectType, Tokens } from "../../../../src";
import { getSocketOwner } from "../../config";

const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.GUARD]: {
      vaultChains: [ChainSlug.BSC],
      controllerChains: [ChainSlug.ARBITRUM, ChainSlug.POLYGON_MAINNET],
      superTokenInfo: {
        name: "Guardian",
        symbol: "GUARD",
        decimals: 18,
        initialSupplyOwner: getSocketOwner(),
        owner: getSocketOwner(),
        initialSupply: 0,
      },
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.BSC]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "50000",
              receivingLimit: "50000",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "50000",
              receivingLimit: "50000",
            },
          },
          [ChainSlug.POLYGON_MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "50000",
              receivingLimit: "50000",
            },
          },
        },
      },
    },
  },
};

export = pc;
