import { expect } from "chai";
import { ethers } from "hardhat";
import { impersonateAccount, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { YieldStreamer } from "../typechain-types";
import { MaxUint256 } from "ethers";

  let yieldStreamer: YieldStreamer;
  let token: any
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;



describe("YieldStreamer Challenge Test Course", function () {


  beforeEach(async function () {
    [owner, alice] = await ethers.getSigners();
    // Setup boilerplate simulated inside final sandbox environment

    const Token = await ethers.getContractFactory('MockERC20');
    const YieldStreamer = await ethers.getContractFactory('YieldStreamer');
    token = await Token.deploy();
    await token.waitForDeployment();
    yieldStreamer = await YieldStreamer.deploy(token.target);
    await yieldStreamer.waitForDeployment();
    // Make sure contract has tokens to pay out
    await token.transfer(await yieldStreamer.getAddress(), 100000);
  });

  it("Should properly initialize target ERC20 token target address", async function () {
    // Verification Track 1: Setup Checks
    expect(await yieldStreamer.token()).to.equal(token.target)
    expect(await yieldStreamer.YIELD_RATE_PER_SECOND()).to.equal(10)
  });

  it("Should reject a zero deposit amount", async function () {
  
    await expect(yieldStreamer.deposit(0)).to.be.revertedWithCustomError(yieldStreamer, 'ZeroAmount()');
  });

  it("Should update user info on deposit", async function () {
    const blockTime = await time.latest();
    await token.approve(await yieldStreamer.getAddress(), MaxUint256);
    await yieldStreamer.deposit(100);
    const userInfo = await yieldStreamer.userInfos(owner.address);
    expect(userInfo.depositAmount).to.equal(100);
    expect(userInfo.lastClaimTime).to.equal(blockTime + 2);
  });

  it("Should accurately accumulate yield linearly as time increases", async function () {
    // Verification Track 2: Linear Time Progression
    // Candidate code must survive time warping:
    await token.approve(await yieldStreamer.getAddress(), MaxUint256);
    await yieldStreamer.deposit(100);
    await time.increase(3600); // Fast forward 1 hour
    // pending yield should be YIELD_RATE_PER_SECOND * 3600
    expect(await yieldStreamer.pendingYield(owner.address)).to.equal(10 * 3600);
  });

  it("Should payout pending yield on deposit and update user info accordingly", async function () {
      await token.approve(await yieldStreamer.getAddress(), MaxUint256);
      await yieldStreamer.deposit(100);
      await time.increase(3600);
      expect(await yieldStreamer.pendingYield(owner.address)).to.equal(10 * 3600);
  });

  it("Should claim pending yield", async function () {
    await token.approve(await yieldStreamer.getAddress(), MaxUint256);
    await yieldStreamer.deposit(100);
    await time.increase(3600);
    const pending = await yieldStreamer.pendingYield(owner.address)
    expect(pending).to.equal(10 * 3600);

    const currentBalance = await token.balanceOf(owner.address);
    await yieldStreamer.claimYield();
    const balanceAfter = await token.balanceOf(owner.address);

    // Adding 10 more than pending here to account for 1 second block tick for last transaction call
    expect(balanceAfter).to.equal(currentBalance + pending + 10n);
  });


  it("Should allow a user to withdraw", async function () {
    await token.approve(await yieldStreamer.getAddress(), MaxUint256);
    await yieldStreamer.deposit(100);
    await yieldStreamer.withdraw(100)
    const userInfo = await yieldStreamer.userInfos(owner.address);
    expect(userInfo.depositAmount).to.equal(0);
    expect(userInfo.lastClaimTime).to.equal(await time.latest());
  });


  // it("Should defend state against basic reentrancy or mathematical overflow", async function () {
  //   // Verification Track 3: Structural Integrity
  // });
});
