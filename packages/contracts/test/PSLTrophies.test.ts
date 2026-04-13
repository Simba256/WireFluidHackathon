import { expect } from "chai";
import { ethers } from "hardhat";

describe("PSLTrophies", () => {
  async function deploy() {
    const [owner, fakeMinter, alice, bob] = await ethers.getSigners();
    const Trophies = await ethers.getContractFactory("PSLTrophies");
    // Use an EOA as "minter" so we can call mintTrophy directly from tests.
    const trophies = await Trophies.deploy(fakeMinter.address, 1n, owner.address);
    await trophies.waitForDeployment();
    return { trophies, owner, fakeMinter, alice, bob };
  }

  it("reverts mintTrophy from non-minter", async () => {
    const { trophies, alice } = await deploy();
    await expect(
      trophies.connect(alice).mintTrophy(alice.address, 3),
    ).to.be.revertedWithCustomError(trophies, "OnlyMinter");
  });

  it("mints to winner with correct tier + tournament tagging", async () => {
    const { trophies, fakeMinter, alice } = await deploy();
    await expect(trophies.connect(fakeMinter).mintTrophy(alice.address, 3))
      .to.emit(trophies, "TrophyMinted")
      .withArgs(alice.address, 1n, 3, 1n);

    expect(await trophies.ownerOf(1n)).to.equal(alice.address);
    expect(await trophies.tokenTier(1n)).to.equal(3);
    expect(await trophies.tokenTournamentId(1n)).to.equal(1n);
  });

  it("is soulbound: transferFrom reverts", async () => {
    const { trophies, fakeMinter, alice, bob } = await deploy();
    await trophies.connect(fakeMinter).mintTrophy(alice.address, 3);

    await expect(
      trophies.connect(alice).transferFrom(alice.address, bob.address, 1n),
    ).to.be.revertedWithCustomError(trophies, "Soulbound");
  });

  it("is soulbound: safeTransferFrom reverts", async () => {
    const { trophies, fakeMinter, alice, bob } = await deploy();
    await trophies.connect(fakeMinter).mintTrophy(alice.address, 3);

    await expect(
      trophies
        .connect(alice)
        ["safeTransferFrom(address,address,uint256)"](alice.address, bob.address, 1n),
    ).to.be.revertedWithCustomError(trophies, "Soulbound");
  });

  it("tokenURI returns a well-formed data URI containing tier metadata", async () => {
    const { trophies, fakeMinter, alice } = await deploy();
    await trophies.connect(fakeMinter).mintTrophy(alice.address, 3);

    const uri = await trophies.tokenURI(1n);
    expect(uri.startsWith("data:application/json;base64,")).to.equal(true);

    const json = Buffer.from(uri.split(",")[1], "base64").toString("utf8");
    const parsed = JSON.parse(json);
    expect(parsed.name).to.include("BoundaryLine Trophy #1");
    expect(parsed.name).to.include("Top 10 Finisher");
    expect(parsed.image.startsWith("data:image/svg+xml;base64,")).to.equal(true);
    expect(parsed.attributes).to.deep.include({ trait_type: "Tournament", value: 1 });
    expect(parsed.attributes).to.deep.include({ trait_type: "Soulbound", value: "true" });
  });

  it("tokenURI for unknown token reverts", async () => {
    const { trophies } = await deploy();
    await expect(trophies.tokenURI(999n)).to.be.reverted;
  });

  it("rollTournament bumps currentTournamentId and new mints tag it", async () => {
    const { trophies, fakeMinter, owner, alice } = await deploy();
    await trophies.connect(owner).rollTournament(2n);
    await trophies.connect(fakeMinter).mintTrophy(alice.address, 5);

    expect(await trophies.tokenTournamentId(1n)).to.equal(2n);
    expect(await trophies.currentTournamentId()).to.equal(2n);
  });

  it("setTierName is owner-gated and reflected in tokenURI", async () => {
    const { trophies, fakeMinter, owner, alice } = await deploy();
    await trophies.connect(owner).setTierName(3, "Legendary 10");
    await trophies.connect(fakeMinter).mintTrophy(alice.address, 3);

    const uri = await trophies.tokenURI(1n);
    const json = Buffer.from(uri.split(",")[1], "base64").toString("utf8");
    expect(json).to.include("Legendary 10");

    await expect(
      trophies.connect(alice).setTierName(3, "hacked"),
    ).to.be.revertedWithCustomError(trophies, "OwnableUnauthorizedAccount");
  });
});
