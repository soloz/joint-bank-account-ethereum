const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("BankAccount", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployBankAccount() {

    // Contracts are deployed using the first signer/account by default
    const [addr0, addr1, addr2, addr3, addr4] = await ethers.getSigners();

    const BankAccount = await ethers.getContractFactory("BankAccount");
    const bankAccount = await BankAccount.deploy();

    return { bankAccount, addr0, addr1, addr2, addr3, addr4 };
  }

  async function deployBankAccountWithAccounts(owners=1, deposit=0, withdrawalAmounts=[]) {
    const {bankAccount, addr0, addr1, addr2, addr3, addr4} = await loadFixture(deployBankAccount);
    let addresses = [];

    if (owners == 2) addresses = [addr1.address];
    else if (owners == 3) addresses = [addr1.address, addr2.address];
    else if (owners == 4) addresses = [addr1.address, addr2.address, addr3.address];

    await bankAccount.connect(addr0).createAccount(addresses);

    if (deposit >0){
      await bankAccount.connect(addr0).deposit(0, {value: deposit.toString()});
    }

    for( const withdrawalAmount of withdrawalAmounts){
      await bankAccount.connect(addr0).requestWithdrawal(0, withdrawalAmount);
    }

    return {bankAccount, addr0, addr1, addr2, addr3, addr3, addr4};
  }

  describe("Deployment", () => {
    it("Should deploy without error", async () => {
      await loadFixture(deployBankAccount);
    });
  });

  describe("Create an account", () => {
    it("should allow creating a single user account", async () => {
      const { bankAccount, addr0 }  = await loadFixture(deployBankAccount);
      await bankAccount.connect(addr0).createAccount([]);
      const accounts = await bankAccount.connect(addr0).getAccounts();
      expect(accounts.length).to.equal(1);
    });

    it("should allow creating a double user account", async () => {
      const { bankAccount, addr0, addr1 }  = await loadFixture(deployBankAccount);
      await bankAccount.connect(addr0).createAccount([addr1.address]);

      const accounts1 = await bankAccount.connect(addr0).getAccounts();
      expect(accounts1.length).to.equal(1);

      const accounts2 = await bankAccount.connect(addr1).getAccounts();
      expect(accounts2.length).to.equal(1);      
    });


    it("should allow creating a triple user account", async () => {
      const { bankAccount, addr0, addr1, addr2 }  = await loadFixture(deployBankAccount);
      await bankAccount.connect(addr0).createAccount([addr1.address, addr2.address]);

      const accounts1 = await bankAccount.connect(addr0).getAccounts();
      expect(accounts1.length).to.equal(1);

      const accounts2 = await bankAccount.connect(addr1).getAccounts();
      expect(accounts2.length).to.equal(1);  
       
      const accounts3 = await bankAccount.connect(addr2).getAccounts();
      expect(accounts3.length).to.equal(1);         
    });

    it("should allow creating a quad user account", async () => {
      const { bankAccount, addr0, addr1, addr2, addr3 }  = await loadFixture(deployBankAccount);
      await bankAccount.connect(addr0).createAccount([addr1.address, addr2.address, addr3.address]);

      const accounts1 = await bankAccount.connect(addr0).getAccounts();
      expect(accounts1.length).to.equal(1);

      const accounts2 = await bankAccount.connect(addr1).getAccounts();
      expect(accounts2.length).to.equal(1);  
       
      const accounts3 = await bankAccount.connect(addr2).getAccounts();
      expect(accounts3.length).to.equal(1); 
      
      const accounts4 = await bankAccount.connect(addr3).getAccounts();
      expect(accounts4.length).to.equal(1); 

    });

    it("should not allow creating account with duplicate owners", async () => {
      const { bankAccount, addr0, addr1, addr2, addr3 }  = await loadFixture(deployBankAccount);
      await expect(bankAccount.connect(addr0).createAccount([addr0.address])).to.be.reverted;
    });    
    
    it("should not allow creating account with 5 owners", async () => {
      const { bankAccount, addr0, addr1, addr2, addr3, addr4 }  = await loadFixture(deployBankAccount);
      await expect(bankAccount.connect(addr0).createAccount([addr0.address, addr1.address, addr2.address, addr3.address, addr4.address])).to.be.reverted;
    });  

    it("should not allow creating account with 5 owneers", async () => {
      const { bankAccount, addr0 }  = await loadFixture(deployBankAccount);

      for(let idx=0; idx < 3; idx++){
        bankAccount.connect(addr0).createAccount([]);
      }
      await expect(bankAccount.connect(addr0).createAccount([addr0.address])).to.be.reverted;
    });

  });

  describe("Depositing", () => {
    it("should allow deposit from valid account numbers", async () => {
      const {bankAccount, addr0} = await deployBankAccountWithAccounts(1);
      await expect(bankAccount.connect(addr0).deposit(0, {value: "100"})).to.changeEtherBalances([bankAccount, addr0], ["100", "-100"]);
    });
  });

  describe("Depositing", () => {
    it("should not allow deposit from non-account number", async () => {
      const {bankAccount, addr1} = await deployBankAccountWithAccounts(1);
      await expect(bankAccount.connect(addr1).deposit(0, {value: "100"})).to.be.reverted;
    });
  });

  describe("Withdrawal", () => {
    describe("Request a Withdrawal", () => {
      it("account owner requests a withdrawal", async () => {
        const {bankAccount, addr0} = await deployBankAccountWithAccounts(1, 100);
        await bankAccount.connect(addr0).requestWithdrawal(0, 100);
      });

      it("account owner cannot request withdrawal of invalid amount", async () => {
        const {bankAccount, addr0} = await deployBankAccountWithAccounts(1, 100);
        await expect(bankAccount.connect(addr0).requestWithdrawal(0, 101)).to.be.reverted;
      });


      it("non-account owner cannot request withdrawal", async () => {
        const {bankAccount, addr1} = await deployBankAccountWithAccounts(1, 100);
        await expect(bankAccount.connect(addr1).requestWithdrawal(0, 90)).to.be.reverted;
      });

      it("account owner can create multiple withdrawal requests", async () => {
        const {bankAccount, addr0} = await deployBankAccountWithAccounts(1, 100);
        await bankAccount.connect(addr0).requestWithdrawal(0, 90);
        await bankAccount.connect(addr0).requestWithdrawal(0, 10);

      });

    });
    describe("Approve a withdrawal", () => {
      it("should allow account owner to approve withdrawal", async () => {
        const {bankAccount, addr1} = await deployBankAccountWithAccounts(2, 100,[100]);
        await bankAccount.connect(addr1).approveWithdrawal(0, 0);
        expect(await bankAccount.getApprovals(0, 0)).to.equal(1);

      });

      it("should not allow non-accoount owner to approve withdrawal", async () => {
        const {bankAccount, addr2} = await deployBankAccountWithAccounts(2, 100,[100]);
        await expect(bankAccount.connect(addr2).approveWithdrawal(0, 0)).to.be.reverted;

      });

      it("should not allow same owner to approve withdrawal multiple times", async () => {
        const {bankAccount, addr1} = await deployBankAccountWithAccounts(2, 100,[100]);
        bankAccount.connect(addr1).approveWithdrawal(0, 0);
        await expect(bankAccount.connect(addr1).approveWithdrawal(0, 0)).to.be.reverted;

      });

      it("should not allow creator of request to approve request", async () => {
        const {bankAccount, addr0} = await deployBankAccountWithAccounts(2, 100,[100]);
        await expect(bankAccount.connect(addr0).approveWithdrawal(0, 0)).to.be.reverted;

      });

    });
    describe("Make a withdrawal", () => {
    
      it("should allow creator of request to withdraw approved request", async () => {
        const {bankAccount, addr0, addr1} = await deployBankAccountWithAccounts(2, 200,[100]);
        await bankAccount.connect(addr1).approveWithdrawal(0, 0);
        await expect(bankAccount.connect(addr0).withdraw(0, 0)).to.changeEtherBalances([bankAccount, addr0], ["-100", "+100"]);

      });

      it("should not allow creator of request to withdraw approved request twice", async () => {
        const {bankAccount, addr0, addr1} = await deployBankAccountWithAccounts(2, 200,[100]);
        await bankAccount.connect(addr1).approveWithdrawal(0, 0);
        await expect(bankAccount.connect(addr0).withdraw(0, 0)).to.changeEtherBalances([bankAccount, addr0], ["-100", "+100"]);
        expect(await bankAccount.connect(addr0).withdraw(0, 0)).to.be.reverted;

      });

      it("should not allow non-creator of request to withdraw approved request", async () => {
        const {bankAccount, addr1} = await deployBankAccountWithAccounts(2, 200,[100]);
        await bankAccount.connect(addr1).approveWithdrawal(0, 0);
        expect(await bankAccount.connect(addr1).withdraw(0, 0)).to.be.reverted;

      });

      it("should not allow withdrawal of non-approved request", async () => {
        const {bankAccount, addr0, addr1} = await deployBankAccountWithAccounts(2, 200,[100]);
        await bankAccount.connect(addr1).approveWithdrawal(0, 0);
        expect(await bankAccount.connect(addr0).withdraw(0, 0)).to.be.reverted;

      });

    });

  });

});
