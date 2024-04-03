const hre = require("hardhat");
const fs = require("fs/promises");

async function main(){
    const BankAccount = await hre.ethers.getContractFactory("BankAccount");
    const bankAccount = await BankAccount.deploy();

    await bankAccount.waitForDeployment();
    console.log("bankAccount deployed to:", await bankAccount.getAddress());
    // await bankAccount.deployTransaction.wait()
    await writeDeploymentInfo(bankAccount);
}

async function writeDeploymentInfo(contract){

    const data = {
        contract: {
            address: await contract.getAddress(),
            signerAddress: await contract.runner.getAddress(),
            abi: contract.interface.format(),
        },
    };

    const content = JSON.stringify(data, null, 2);
    await fs.writeFile("deployment.json", content, {encoding: "utf-8"});

}

function getMethods(obj) {
    var result = [];
    for (var id in obj) {
      try {
        if (typeof(obj[id]) == "function") {
          result.push(id + ": " + obj[id].toString());
        }
      } catch (err) {
        result.push(id + ": inaccessible");
      }
    }
    return result;
  }


main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});