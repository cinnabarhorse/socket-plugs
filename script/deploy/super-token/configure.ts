import { BigNumber, Contract, Wallet, utils } from "ethers";
import { ChainSlug, getAddresses } from "@socket.tech/dl-core";

import {
  SuperTokenAddresses,
  SuperTokenChainAddresses,
  SuperTokenContracts,
} from "../../../src";
import { getSignerFromChainSlug, overrides } from "../../helpers/networks";
import { getInstance } from "../../helpers/utils";
import { getSocket } from "../../bridge/utils";
import {
  getSuperTokenLimitBN,
  getSuperTokenProjectAddresses,
  getSuperTokenRateBN,
} from "./utils";
import { config } from "./config";
import { getMode } from "../../constants/config";

type UpdateLimitParams = [
  boolean,
  number,
  string | number | BigNumber,
  string | number | BigNumber
];

const LIMIT_UPDATER_ROLE = utils
  .keccak256(utils.toUtf8Bytes("LIMIT_UPDATER_ROLE"))
  .toString();
const RESCUE_ROLE = utils
  .keccak256(utils.toUtf8Bytes("RESCUE_ROLE"))
  .toString();

export const main = async () => {
  try {
    const addresses: SuperTokenAddresses = await getSuperTokenProjectAddresses(
      config.projectName.toLowerCase()
    );
    const chains = Object.keys(addresses)
      .filter((c) => c !== "default")
      .map((c) => parseInt(c) as ChainSlug);

    await Promise.all(
      chains.map(async (chain) => {
        const addr: SuperTokenChainAddresses | undefined = addresses[chain];
        const plug: string = addr?.[SuperTokenContracts.SocketPlug];
        const siblingSlugs: ChainSlug[] = chains.filter((c) => c != chain);
        if (!addr || !plug) return;
        console.log(`Configuring ${chain} for ${siblingSlugs}`);

        const socketSigner = getSignerFromChainSlug(chain);
        await connect(addresses, chain, siblingSlugs, socketSigner);
        await grantRoles(addr, chain, socketSigner);

        const updateLimitParams: UpdateLimitParams[] = [];
        for (let sibling of siblingSlugs) {
          // mint/lock/deposit limits
          updateLimitParams.push([
            true,
            sibling,
            getSuperTokenLimitBN(
              config.depositLimit,
              true,
              config.tokenDecimal
            ),
            getSuperTokenRateBN(config.depositRate, true, config.tokenDecimal),
          ]);

          // burn/unlock/withdraw limits
          updateLimitParams.push([
            false,
            sibling,
            getSuperTokenLimitBN(
              config.withdrawLimit,
              false,
              config.tokenDecimal
            ),
            getSuperTokenRateBN(
              config.withdrawRate,
              false,
              config.tokenDecimal
            ),
          ]);
        }

        if (!updateLimitParams.length) return;

        let contract: Contract;
        if (addr[SuperTokenContracts.SuperToken]) {
          contract = await getInstance(
            SuperTokenContracts.SuperToken,
            addr[SuperTokenContracts.SuperToken]
          );
        } else if (addr[SuperTokenContracts.SuperTokenVault]) {
          contract = await getInstance(
            SuperTokenContracts.SuperTokenVault,
            addr[SuperTokenContracts.SuperTokenVault]
          );
        } else throw new Error(`Not a super token address config, ${addr}`);

        contract = contract.connect(socketSigner);
        let tx = await contract.updateLimitParams(updateLimitParams, {
          ...overrides[chain],
        });
        console.log(chain, tx.hash);
        await tx.wait();

        console.log(`Setting vault limits for ${chain} - COMPLETED`);
      })
    );
  } catch (error) {
    console.log("Error while sending transaction", error);
  }
};

const grantRoles = async (
  addresses: SuperTokenChainAddresses,
  chain: ChainSlug,
  socketSigner: Wallet
) => {
  try {
    const addr = addresses[SuperTokenContracts.SuperToken]
      ? addresses[SuperTokenContracts.SuperToken]
      : addresses[SuperTokenContracts.SuperTokenVault];
    let tokenOrVault: Contract = await getInstance(
      SuperTokenContracts.SuperToken,
      addr
    );
    tokenOrVault = tokenOrVault.connect(socketSigner);

    // limit updater
    {
      const contractState = await tokenOrVault.hasRole(
        LIMIT_UPDATER_ROLE,
        socketSigner.address
      );
      console.log(
        `contract state: ${contractState}, role: limit updater, ${chain}`
      );
      if (contractState) {
        console.log("limit updater role already set!");
      } else {
        let tx = await tokenOrVault.grantRole(
          LIMIT_UPDATER_ROLE,
          socketSigner.address,
          {
            ...overrides[chain],
          }
        );
        console.log(chain, tx.hash);
        await tx.wait();
      }
    }

    const contractState = await tokenOrVault.hasRole(
      RESCUE_ROLE,
      socketSigner.address
    );
    console.log(
      `contract state: ${contractState}, role: rescue updater, ${chain}`
    );
    if (contractState) {
      console.log("Rescue role already set!");
    } else {
      let tx = await tokenOrVault.grantRole(RESCUE_ROLE, socketSigner.address, {
        ...overrides[chain],
      });
      console.log(chain, tx.hash);
      await tx.wait();
    }

    console.log("Initialized Socket plug!");
  } catch (error) {
    console.log("Error in setting roles in contracts", error);
  }
};

const connect = async (
  addresses: SuperTokenAddresses,
  chain: ChainSlug,
  siblingSlugs: ChainSlug[],
  socketSigner: Wallet
) => {
  try {
    console.log("connecting plugs for ", chain, siblingSlugs);

    const localPlug = addresses[chain][SuperTokenContracts.SocketPlug];
    const socketContract: Contract = getSocket(chain, socketSigner);
    if (!localPlug) return;

    for (let sibling of siblingSlugs) {
      const siblingPlug: string | undefined =
        addresses?.[sibling]?.[SuperTokenContracts.SocketPlug];
      if (!siblingPlug) continue;

      // connect socket
      const switchboard = getAddresses(chain, getMode()).integrations[sibling][
        config.integrationType
      ]?.switchboard;

      if (!switchboard) {
        console.log(
          `switchboard not found for ${chain}, ${sibling}, ${config.integrationType}`
        );
      }

      let plugConfig = await socketContract.getPlugConfig(localPlug, sibling);
      if (plugConfig[0].toLowerCase() === siblingPlug.toLowerCase()) {
        console.log("already set, confirming ", { plugConfig });
        continue;
      }

      const connectorContract = (
        await getInstance(SuperTokenContracts.SocketPlug, localPlug)
      ).connect(socketSigner);

      let tx = await connectorContract.functions["connect"](
        sibling,
        siblingPlug,
        switchboard,
        switchboard,
        { ...overrides[chain] }
      );
      console.log(chain, tx.hash);
      await tx.wait();
    }
  } catch (error) {
    console.log("error while connecting plugs: ", error);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
