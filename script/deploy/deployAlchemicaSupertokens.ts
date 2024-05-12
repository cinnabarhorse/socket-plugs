import { ethers } from "hardhat";

async function deployAlchemicaSuperTokens() {
  const names = [
    "Test Supertoken",
    // "Aavegotchi FUD Token",
    // "Aavegotchi FOMO Token",
    // "Aavegotchi ALPHA Token",
    // "Aavegotchi KEK Token",
    // "GAX Liquidity Reward Token",
  ];

  const symbols = [
    "TEST",
    // "FUD", "FOMO", "ALPHA", "KEK", "GLTR"
  ];

  const signer = (await ethers.getSigners())[0];

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const symbol = symbols[i];

    const SuperToken = await ethers.getContractFactory("SuperToken");
    const superToken = await SuperToken.deploy(
      name,
      symbol,
      18, //decimals
      signer.address, //initialSupplyOwner
      signer.address, //owner
      0 //initialSupply
    );

    // Wait for the contract to be mined
    await superToken.deployed();

    console.log(`${name} SuperToken deployed at:`, superToken.address);

    // const token = (await ethers.getContractAt(
    //   "SuperToken",
    //   superToken.address
    // )) as SuperToken;

    // const mintRole =
    //   "0x7b765e0e932d348852a6f810bfa1ab891e259123f02db8cdcde614c570223357";

    //  const tx = await token.grantRole(mintRole, signer.address);
    //  await tx.wait()

    //  console

    // await token.mint(signer.address, ethers.utils.parseEther("1000000"));

    // await token.revokeRole(mintRole, signer.address);

    // const bal = await token.balanceOf(signer.address);

    // const totalSupply = await token.totalSupply();

    // const owner = await token.owner();
    // console.log("owner:", owner);

    // console.log("ts:", totalSupply.toString());

    // console.log("minted!", bal.toString());
  }
}

deployAlchemicaSuperTokens()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
