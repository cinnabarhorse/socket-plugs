import { config as dotenvConfig } from "dotenv";
import { getProjectAddresses } from "../helpers";
import OwnableArtifact from "../../out/Ownable.sol/Ownable.json";
import { Signer, Wallet, ethers } from "ethers";
import { Ownable } from "../../typechain-types/contracts/utils/Ownable";
import { getProviderFromChainSlug, overrides } from "../helpers/networks";
import {
  ChainSlug,
  SBAddresses,
  SBTokenAddresses,
  STAddresses,
  STTokenAddresses,
} from "../../src";
import { ContractList, getContractList } from "./util";

dotenvConfig();

/**
 * Usage
 *
 * --sendtx         Send claim tx along with ownership check.
 *                  Default is only check owner, nominee.
 *                  Eg. npx --sendtx ts-node script/ownership/claim-owner.ts
 *
 * --chains         Run only for specified chains.
 *                  Default is all chains.
 *                  Eg. npx --chains=10,2999 ts-node script/ownership/claim-owner.ts
 */

const signerKey = process.env.OWNER_SIGNER_KEY;
if (!signerKey) {
  console.error("Error: OWNER_SIGNER_KEY is required");
}

const sendTx = process.env.npm_config_sendtx == "true";

const filterChainsParam = process.env.npm_config_chains
  ? process.env.npm_config_chains.split(",")
  : null;
const addresses: SBAddresses | STAddresses = getProjectAddresses();
const allChainSlugs = Object.keys(addresses);
const filteredChainSlugs = !filterChainsParam
  ? allChainSlugs
  : allChainSlugs.filter((c) => filterChainsParam.includes(c));

const ownableABI = OwnableArtifact.abi;

const wallet: Wallet = new ethers.Wallet(signerKey);
const signerAddress = wallet.address.toLowerCase();

const main = async () => {
  await Promise.all(
    filteredChainSlugs.map(async (chainSlug) => {
      const provider = getProviderFromChainSlug(
        parseInt(chainSlug) as ChainSlug
      );
      const signer = wallet.connect(provider);

      const chainAddresses = addresses[chainSlug];
      for (const token of Object.keys(chainAddresses)) {
        const tokenAddresses: SBTokenAddresses | STTokenAddresses =
          addresses[chainSlug][token];
        let contractList: ContractList = getContractList(
          tokenAddresses,
          chainSlug,
          token
        );

        for (const contract of contractList) {
          await checkAndClaim(
            contract.address,
            signer,
            chainSlug,
            contract.label
          );
        }
      }
    })
  );
};

const checkAndClaim = async (
  contractAddress: string,
  signer: Signer,
  chainSlug: string,
  label: string
) => {
  label = label.padEnd(45);
  const contract = new ethers.Contract(
    contractAddress,
    ownableABI,
    signer
  ) as Ownable;

  try {
    const owner = (await contract.owner()).toLowerCase();
    const nominee = (await contract.nominee()).toLowerCase();

    console.log(` - ${label}: Checking: ${owner}, ${nominee}`);

    if (signerAddress === owner) {
      console.log(` ✔ ${label}: Already claimed`);
      return;
    }

    if (signerAddress !== nominee) {
      console.log(`❗ ${label}: Signer is not current nominee`);
      return;
    }

    if (sendTx) {
      console.log(`✨ ${label}: Claiming`);
      const tx = await contract.claimOwner({
        ...overrides[parseInt(chainSlug)],
      });
      const receipt = await tx.wait();
      console.log(`🚀 ${label}: Done: ${receipt.transactionHash}`);
    } else {
      console.log(`✨ ${label}: Needs claiming`);
    }
  } catch (e) {
    console.error(`❗ ${label}: Error while checking ${contractAddress}`);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
