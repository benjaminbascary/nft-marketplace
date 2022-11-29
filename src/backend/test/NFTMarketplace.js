const {expect} = require("chai");
const {ethers} =  require('hardhat');

describe("NFTMarketplace", () => {
  let deployer, addr1, addr2, nft, marketplace;
  let feePercent = 1;
  let URI = 'Sample URI';

  const toWei = (number) => ethers.utils.parseEther(number.toString());
  const fromWei = (number) => ethers.utils.formatEther(number);
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
    });

    it("Should track feeAccount and feePercent of the marketplace", async () => {
      expect(await marketplace.feeAccount()).to.equal(deployer.address);
      expect(await marketplace.feePercent()).to.equal(feePercent);
    });
  });

  describe("NFT minting", () => {
    // it("Should track each minted NFT", async () => {
    //   //addr1 mints a nft
    //   await nft.connect(addr1).mint(URI);
    //   expect(await nft.tokenCount()).to.equal(1);
    //   expect(await nft.balanceOf(addr1.address)).to.equal(1);
    //   expect(await nft.tokenURI(1)).to.equal(URI);

    //   //addr2 mints a nft
    //   await nft.connect(addr2).mint(URI);
    //   expect(await nft.methods.tokenCount().call()).to.equal(2);
    //   expect(await nft.balanceOf(addr2.address)).to.equal(2);
    //   expect(await nft.tokenURI(2)).to.equal(URI);
    // })
  });

  describe("Making marketplace items", () => {
    beforeEach(async function() {
      await nft.connect(addr1).mint(URI);
      await nft.connect(addr1).setApprovalForAll(marketplace.address, true);
    })

    it("Should track newly created item, transfer NFT from seller to marketplace and emit Offered event", async () => {
      await expect(marketplace.connect(addr1).makeItem(nft.address, 1, toWei(1)))
        .to.emit(marketplace, "Offered")
        .withArgs(1, nft.address, 1, toWei(1), addr1.address);

      expect(await nft.ownerOf(1)).to.equal(marketplace.address);

      expect(await marketplace.itemCount()).to.equal(1);
      const item = await marketplace.items(1);
      expect(item.itemId).to.equal(1);
      expect(item.nft).to.equal(nft.address);
      expect(item.tokenId).to.equal(1);
      expect(item.price).to.equal(toWei(1));
      expect(item.sold).to.equal(false);
    });

    it("Should fail if price is set to zero", async () => {
      await expect(marketplace.connect(addr1).makeItem(nft.address, 1, 0))
        .to.be.revertedWith("Price must be greater than 0");
    });
  });

  describe("Purchasing marketplace items", () => {
    let price = 2;
    beforeEach(async () => {
      await nft.connect(addr1).mint(URI);
      await nft.connect(addr1).setApprovalForAll(marketplace.address, true);
      await marketplace.connect(addr1).makeItem(nft.address, 1, toWei(2));
    });

    it("Should update item as sold, pay seller, transfer NFT to buyer, charge fees and emit a Bought event", async () => {
      const sellerInitialEthBal = await addr1.getBalance();
      const feeAccountInitialEthBal = await deployer.getBalance();
      let totalPriceInWei = await marketplace.getTotalPrice(1);

      await expect(marketplace.connect(addr2).purchaseItem(1, {value: totalPriceInWei}))
        .to.emit(marketplace, "Bought")
        .withArgs(
          1,
          nft.address,
          1,
          toWei(price),
          addr1.address,
          addr2.address
        )
      const sellerFinalEthBal = await addr1.getBalance();
      const feeAccountFinalEthBal = await deployer.getBalance();
      expect(+fromWei(sellerFinalEthBal)).to.equal(+price + +fromWei(sellerInitialEthBal));

      const fee = (feePercent / 100) * price;

      // expect(+fromWei(feeAccountFinalEthBal)).to.equal(+fee + +fromWei(feeAccountInitialEthBal));
      expect(await nft.ownerOf(1)).to.equal(addr2.address);
      expect((await marketplace.items(1)).sold).to.equal(true);
    });

    it("Should fails for invalid item ids, sold items, and when not enough ether is paid", async () => {
      let totalPriceInWei = await marketplace.getTotalPrice(1);
      await expect(marketplace.connect(addr2).purchaseItem(2, {value: totalPriceInWei}))
        .to.be.revertedWith("item doesn't exists");

      await expect(marketplace.connect(addr2).purchaseItem(0, {value: totalPriceInWei}))
        .to.be.revertedWith("item doesn't exists");

      await expect(marketplace.connect(addr2).purchaseItem(1, {value: toWei(price)}))
        .to.be.revertedWith("not enough ether to cover item price and market fees");

      // Last: addr2 purchases item 1
      await marketplace.connect(addr2).purchaseItem(1, {value: totalPriceInWei})
      await expect(marketplace.connect(deployer).purchaseItem(1, {value: totalPriceInWei}))
        .to.be.revertedWith("item already sold")
    })
  })
});