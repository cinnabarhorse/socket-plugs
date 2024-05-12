import hre from "hardhat";

async function verifyTokens() {
  await hre.run("verify:verify", {
    address: "0x99Be843428debDD38342B5129C49fD3d4536ed89",
    constructorArguments: [
      "Test Supertoken",
      "TEST",
      18,
      "0x027Ffd3c119567e85998f4E6B9c3d83D5702660c",
      "0x027Ffd3c119567e85998f4E6B9c3d83D5702660c",
      0,
    ],
  });
}

verifyTokens()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
