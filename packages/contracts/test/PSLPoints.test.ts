import { expect } from "chai";
import { ethers } from "hardhat";
import { MIN_EARNED, ONE_BNDY, signClaim, signSync } from "./helpers";

describe("PSLPoints", () => {
  async function deploy() {
    const [owner, signer, alice, bob, mallory] = await ethers.getSigners();

    const Points = await ethers.getContractFactory("PSLPoints");
    const points = await Points.deploy(signer.address, owner.address);
    await points.waitForDeployment();
    const pointsAddress = await points.getAddress();

    const Trophies = await ethers.getContractFactory("PSLTrophies");
    const trophies = await Trophies.deploy(pointsAddress, 1n, owner.address);
    await trophies.waitForDeployment();

    await (await points.setTrophies(await trophies.getAddress())).wait();

    return { points, trophies, pointsAddress, owner, signer, alice, bob, mallory };
  }

  describe("sync", () => {
    it("mints correct amount and bumps earnedBalance", async () => {
      const { points, pointsAddress, signer, alice } = await deploy();
      const amount = 5_000n * ONE_BNDY;
      const nonce = 1n;
      const sig = await signSync(signer, pointsAddress, alice.address, amount, nonce);

      await expect(points.connect(alice).sync(amount, nonce, sig))
        .to.emit(points, "Synced")
        .withArgs(alice.address, amount, amount, nonce);

      expect(await points.balanceOf(alice.address)).to.equal(amount);
      expect(await points.earnedBalance(alice.address)).to.equal(amount);
    });

    it("reverts on replayed nonce", async () => {
      const { points, pointsAddress, signer, alice } = await deploy();
      const amount = 100n * ONE_BNDY;
      const nonce = 42n;
      const sig = await signSync(signer, pointsAddress, alice.address, amount, nonce);
      await points.connect(alice).sync(amount, nonce, sig);

      await expect(
        points.connect(alice).sync(amount, nonce, sig),
      ).to.be.revertedWithCustomError(points, "NonceAlreadyUsed");
    });

    it("reverts on bad signature (wrong signer)", async () => {
      const { points, pointsAddress, alice, mallory } = await deploy();
      const amount = 100n * ONE_BNDY;
      const nonce = 7n;
      const sig = await signSync(mallory, pointsAddress, alice.address, amount, nonce);

      await expect(
        points.connect(alice).sync(amount, nonce, sig),
      ).to.be.revertedWithCustomError(points, "InvalidSignature");
    });

    it("reverts on signature with wrong user address", async () => {
      const { points, pointsAddress, signer, alice, bob } = await deploy();
      const amount = 100n * ONE_BNDY;
      const nonce = 9n;
      const sigForBob = await signSync(signer, pointsAddress, bob.address, amount, nonce);

      await expect(
        points.connect(alice).sync(amount, nonce, sigForBob),
      ).to.be.revertedWithCustomError(points, "InvalidSignature");
    });

    it("reverts on zero amount", async () => {
      const { points, pointsAddress, signer, alice } = await deploy();
      const sig = await signSync(signer, pointsAddress, alice.address, 0n, 1n);
      await expect(
        points.connect(alice).sync(0n, 1n, sig),
      ).to.be.revertedWithCustomError(points, "ZeroAmount");
    });
  });

  describe("transfers vs earnedBalance", () => {
    it("transfer moves balanceOf but NOT earnedBalance", async () => {
      const { points, pointsAddress, signer, alice, bob } = await deploy();
      const amount = 1_000n * ONE_BNDY;
      const sig = await signSync(signer, pointsAddress, alice.address, amount, 1n);
      await points.connect(alice).sync(amount, 1n, sig);

      await points.connect(alice).transfer(bob.address, 400n * ONE_BNDY);

      expect(await points.balanceOf(alice.address)).to.equal(600n * ONE_BNDY);
      expect(await points.balanceOf(bob.address)).to.equal(400n * ONE_BNDY);
      expect(await points.earnedBalance(alice.address)).to.equal(amount);
      expect(await points.earnedBalance(bob.address)).to.equal(0n);
    });
  });

  describe("claimTier", () => {
    async function aliceWithMinEarned() {
      const ctx = await deploy();
      const sig = await signSync(ctx.signer, ctx.pointsAddress, ctx.alice.address, MIN_EARNED, 1n);
      await ctx.points.connect(ctx.alice).sync(MIN_EARNED, 1n, sig);
      return ctx;
    }

    it("reverts if earnedBalance is below threshold", async () => {
      const { points, pointsAddress, signer, alice } = await deploy();
      const amount = 5_000n * ONE_BNDY; // half of MIN_EARNED
      const syncSig = await signSync(signer, pointsAddress, alice.address, amount, 1n);
      await points.connect(alice).sync(amount, 1n, syncSig);

      const claimSig = await signClaim(signer, pointsAddress, alice.address, 3, 2n);
      await expect(
        points.connect(alice).claimTier(3, 2n, claimSig),
      ).to.be.revertedWithCustomError(points, "BelowEarnedThreshold");
    });

    it("reverts on replayed claim nonce", async () => {
      const { points, pointsAddress, signer, alice } = await aliceWithMinEarned();
      const claimSig = await signClaim(signer, pointsAddress, alice.address, 3, 99n);
      await points.connect(alice).claimTier(3, 99n, claimSig);

      // second attempt — earnedBalance is zero AND nonce is used.
      // We top up earned balance to bypass the threshold check so the nonce
      // check is the one that fires.
      const top = await signSync(signer, pointsAddress, alice.address, MIN_EARNED, 123n);
      await points.connect(alice).sync(MIN_EARNED, 123n, top);

      await expect(
        points.connect(alice).claimTier(3, 99n, claimSig),
      ).to.be.revertedWithCustomError(points, "NonceAlreadyUsed");
    });

    it("reverts on bad signature", async () => {
      const { points, pointsAddress, alice, mallory } = await aliceWithMinEarned();
      const claimSig = await signClaim(mallory, pointsAddress, alice.address, 3, 2n);
      await expect(
        points.connect(alice).claimTier(3, 2n, claimSig),
      ).to.be.revertedWithCustomError(points, "InvalidSignature");
    });

    it("burns full wallet balance including gifted excess", async () => {
      const { points, pointsAddress, signer, alice, bob } = await aliceWithMinEarned();
      // Bob earns and gifts BNDY to Alice — pure wallet inflation.
      const bobSig = await signSync(signer, pointsAddress, bob.address, 50_000n * ONE_BNDY, 10n);
      await points.connect(bob).sync(50_000n * ONE_BNDY, 10n, bobSig);
      await points.connect(bob).transfer(alice.address, 50_000n * ONE_BNDY);

      const aliceBalBefore = await points.balanceOf(alice.address);
      expect(aliceBalBefore).to.equal(MIN_EARNED + 50_000n * ONE_BNDY);

      const claimSig = await signClaim(signer, pointsAddress, alice.address, 3, 2n);
      await expect(points.connect(alice).claimTier(3, 2n, claimSig))
        .to.emit(points, "TierClaimed")
        .withArgs(alice.address, 3, aliceBalBefore, 1n);

      expect(await points.balanceOf(alice.address)).to.equal(0n);
      expect(await points.earnedBalance(alice.address)).to.equal(0n);
    });

    it("mints a trophy via cross-call on successful claim", async () => {
      const { points, trophies, pointsAddress, signer, alice } = await aliceWithMinEarned();
      const claimSig = await signClaim(signer, pointsAddress, alice.address, 4, 2n);

      await expect(points.connect(alice).claimTier(4, 2n, claimSig))
        .to.emit(trophies, "TrophyMinted")
        .withArgs(alice.address, 1n, 4, 1n);

      expect(await trophies.ownerOf(1n)).to.equal(alice.address);
      expect(await trophies.tokenTier(1n)).to.equal(4);
    });

    it("blocks a second claim because earnedBalance was reset", async () => {
      const { points, pointsAddress, signer, alice } = await aliceWithMinEarned();
      const sig1 = await signClaim(signer, pointsAddress, alice.address, 3, 2n);
      await points.connect(alice).claimTier(3, 2n, sig1);

      const sig2 = await signClaim(signer, pointsAddress, alice.address, 3, 3n);
      await expect(
        points.connect(alice).claimTier(3, 3n, sig2),
      ).to.be.revertedWithCustomError(points, "BelowEarnedThreshold");
    });

    it("reverts if nothing to burn (balance zero, e.g. all transferred away)", async () => {
      const { points, pointsAddress, signer, alice, bob } = await aliceWithMinEarned();
      await points.connect(alice).transfer(bob.address, MIN_EARNED);

      const sig = await signClaim(signer, pointsAddress, alice.address, 3, 2n);
      await expect(
        points.connect(alice).claimTier(3, 2n, sig),
      ).to.be.revertedWithCustomError(points, "NothingToBurn");
    });
  });

  describe("setTrophies", () => {
    it("is one-shot: reverts on second call", async () => {
      const { points, owner } = await deploy();
      await expect(
        points.connect(owner).setTrophies(owner.address),
      ).to.be.revertedWithCustomError(points, "TrophiesAlreadySet");
    });

    it("reverts on zero address", async () => {
      const [owner, signer] = await ethers.getSigners();
      const Points = await ethers.getContractFactory("PSLPoints");
      const points = await Points.deploy(signer.address, owner.address);
      await expect(
        points.connect(owner).setTrophies(ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(points, "InvalidAddress");
    });

    it("reverts for non-owner", async () => {
      const [owner, signer, alice] = await ethers.getSigners();
      const Points = await ethers.getContractFactory("PSLPoints");
      const points = await Points.deploy(signer.address, owner.address);
      await expect(
        points.connect(alice).setTrophies(alice.address),
      ).to.be.revertedWithCustomError(points, "OwnableUnauthorizedAccount");
    });
  });
});
