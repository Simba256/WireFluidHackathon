import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const signerAddress = process.env.SIGNER_ADDRESS;
  if (!signerAddress || !ethers.isAddress(signerAddress)) {
    throw new Error("SIGNER_ADDRESS env var missing or invalid");
  }

  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  const chainId = Number(net.chainId);
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`Network:        ${network.name} (chainId ${chainId})`);
  console.log(`Deployer:       ${deployer.address}`);
  console.log(`Balance:        ${ethers.formatEther(balance)} native`);
  console.log(`Trusted signer: ${signerAddress}`);
  console.log("");

  if (balance === 0n) {
    throw new Error("Deployer has zero balance — fund it from the faucet first.");
  }

  console.log("1/3 Deploying PSLPoints...");
  const Points = await ethers.getContractFactory("PSLPoints");
  const points = await Points.deploy(signerAddress, deployer.address);
  await points.waitForDeployment();
  const pointsAddress = await points.getAddress();
  const pointsDeployTx = points.deploymentTransaction();
  console.log(`    → ${pointsAddress}  (tx ${pointsDeployTx?.hash})`);

  console.log("2/3 Deploying PSLTrophies...");
  const Trophies = await ethers.getContractFactory("PSLTrophies");
  const initialTournamentId = 1n;
  const trophies = await Trophies.deploy(pointsAddress, initialTournamentId, deployer.address);
  await trophies.waitForDeployment();
  const trophiesAddress = await trophies.getAddress();
  const trophiesDeployTx = trophies.deploymentTransaction();
  console.log(`    → ${trophiesAddress}  (tx ${trophiesDeployTx?.hash})`);

  console.log("3/3 Wiring PSLPoints.setTrophies()...");
  const setTx = await points.setTrophies(trophiesAddress);
  const setReceipt = await setTx.wait();
  console.log(`    → tx ${setTx.hash}  (block ${setReceipt?.blockNumber})`);
  console.log("");

  const out = {
    network: network.name,
    chainId,
    deployer: deployer.address,
    trustedSigner: signerAddress,
    contracts: {
      PSLPoints: pointsAddress,
      PSLTrophies: trophiesAddress,
    },
    deploymentTxs: {
      PSLPoints: pointsDeployTx?.hash ?? null,
      PSLTrophies: trophiesDeployTx?.hash ?? null,
      setTrophies: setTx.hash,
    },
    initialTournamentId: Number(initialTournamentId),
    deployedAt: new Date().toISOString(),
  };

  // Spec filename is kebab-case (see docs/CONTRACTS.md and CLAUDE.md §6).
  const fileName = network.name === "wirefluidTestnet" ? "wirefluid-testnet" : network.name;
  const outDir = path.join(__dirname, "..", "deployments");
  const outPath = path.join(outDir, `${fileName}.json`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);

  if (network.name === "wirefluidTestnet") {
    console.log("");
    console.log("Explorer links:");
    console.log(`  PSLPoints:   https://wirefluidscan.com/address/${pointsAddress}`);
    console.log(`  PSLTrophies: https://wirefluidscan.com/address/${trophiesAddress}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
