import { run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const fileName = network.name === "wirefluidTestnet" ? "wirefluid-testnet" : network.name;
  const deploymentsPath = path.join(__dirname, "..", "deployments", `${fileName}.json`);
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error(`No deployments file for network "${network.name}" at ${deploymentsPath}`);
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const points = deployment.contracts.PSLPoints;
  const trophies = deployment.contracts.PSLTrophies;
  const signer = deployment.trustedSigner;
  const deployer = deployment.deployer;
  const initialTournamentId = deployment.initialTournamentId ?? 1;

  console.log(`Verifying on ${network.name}...`);

  try {
    await run("verify:verify", {
      address: points,
      constructorArguments: [signer, deployer],
      contract: "contracts/token/PSLPoints.sol:PSLPoints",
    });
    console.log(`✓ PSLPoints verified: ${points}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("already verified")) {
      console.log(`✓ PSLPoints already verified: ${points}`);
    } else {
      console.warn(`! PSLPoints verification failed: ${msg}`);
    }
  }

  try {
    await run("verify:verify", {
      address: trophies,
      constructorArguments: [points, initialTournamentId, deployer],
      contract: "contracts/token/PSLTrophies.sol:PSLTrophies",
    });
    console.log(`✓ PSLTrophies verified: ${trophies}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("already verified")) {
      console.log(`✓ PSLTrophies already verified: ${trophies}`);
    } else {
      console.warn(`! PSLTrophies verification failed: ${msg}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
