import { ethers } from "hardhat";
import { SuperToken } from "../../typechain-types";

async function deployAlchemicaSuperTokens() {
  const addresses = [
    "0x4595Ea2d4d76e067D6701552b8A66743f048A38b", //fud
    "0xB501045c286E2e499D761106Da367B7b9D72De9e", //fomo
    "0x73e49fa294e6198400cA693a856816E23D0968Ee", //alpha
    "0x59c98408F27517937D2065d61862eBF129B07FD9", //kek
    "0x2D400eB3beee681471F59da5B1a0d61A18Dee743", //gltr
  ];

  const controllers = [
    "0xBdc2420b1E7F1f97d45b55a2ea9d3b4eB2675B75",
    "0x321fCfC2cc0d45d2eb252A11bBA8274543819feB",
    "0xc87653358D5EDc7716057c865b8cD9ac5eB44A16",
    "0x3D57A1a3429825C35B7C432F8885fA1D0Eede460",
    "0x8B2D15F61B99De5Fd53dfCFFf8AF995f17f9536d",
  ];

  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];

    const token = (await ethers.getContractAt(
      "SuperToken",
      address
    )) as SuperToken;

    const mintRole =
      "0x7b765e0e932d348852a6f810bfa1ab891e259123f02db8cdcde614c570223357";

    const tx = await token.grantRole(mintRole, controllers[i]);
    await tx.wait();

    console.log(`Mint role granted to ${controllers[i]} for ${address}`);
  }
}

deployAlchemicaSuperTokens()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
