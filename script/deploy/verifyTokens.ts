import hre from "hardhat";

async function verifyTokens() {
  const fud = "0x4595Ea2d4d76e067D6701552b8A66743f048A38b";

  const fomo = "0xB501045c286E2e499D761106Da367B7b9D72De9e";

  const alpha = "0x73e49fa294e6198400cA693a856816E23D0968Ee";

  const kek = "0x59c98408F27517937D2065d61862eBF129B07FD9";
  const gltr = "0x2D400eB3beee681471F59da5B1a0d61A18Dee743";

  const addresses = [fud, fomo, alpha, kek, gltr];
  const names = [
    "Aavegotchi FUD Token",
    "Aavegotchi FOMO Token",
    "Aavegotchi ALPHA Token",
    "Aavegotchi KEK Token",
    "GAX Liquidity Reward Token",
  ];

  const symbols = ["FUD", "FOMO", "ALPHA", "KEK", "GLTR"];

  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i];

    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [
        names[i],
        symbols[i],
        18,
        "0x027Ffd3c119567e85998f4E6B9c3d83D5702660c",
        "0x027Ffd3c119567e85998f4E6B9c3d83D5702660c",
        0,
      ],
    });
  }
}

verifyTokens()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
