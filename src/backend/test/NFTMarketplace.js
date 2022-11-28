const {expect} = require("chai");
const {ethers} =  require('hardhat');

describe("NFTMarketplace", () => {
  let deployer, addr1, addr2, nft, marketplace;
  let feePercent = 1;
  beforeEach(async () => {
    // Get contract factories
    const NFT = await ethers.getContractFactory("NFT");
    const Marketplace = await ethers.getContractFactory("Marketplace");
    // signers
    [deployer, addr1, addr2] = await ethers.getSigners();
    // Deploy contracts
    nft = await NFT.deploy();
    marketplace = await Marketplace.deploy(feePercent);
  });

  describe("Deployment", () => {
    it("Should track name and symbol of NFT colection", async () => {
      expect(await nft.name()).to.equal("Pata NFT")
      expect(await nft.symbol()).to.equal("PAT")
    })
  })

});