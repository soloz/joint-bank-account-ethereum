
const provider = new ethers.providers.Web3Provider(window.ethereum);

const abi = [
    "event AccountCreated(address[] owners, uint256 indexed id, uint256 timestamp)",
    "event Deposit(address indexed depositer, uint256 indexed accountId, uint256 value, uint256 timestamp)",
    "event Withdraw(uint256 indexed withdrawalId, uint256 timestamp)",
    "event WithdrawalRequested(address indexed user, uint256 indexed accountId, uint256 indexed withdrawalId, uint256 amount, uint256 timestamp)",
    "function approveWithdrawal(uint256 accountId, uint256 withdrawalId)",
    "function createAccount(address[] otherOwners)",
    "function deposit(uint256 accountId) payable",
    "function getAccounts() view returns (uint256[])",
    "function getApprovals(uint256 accountId, uint256 withdrawalId) view returns (uint256)",
    "function getBalance(uint256 accountId) view returns (uint256)",
    "function getOwners(uint256 accountId) view returns (address[])",
    "function requestWithdrawal(uint256 accountId, uint256 amount)",
    "function withdraw(uint256 accountId, uint256 withdrawalId)"
  ];

  const address = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  let contract = null;

  async function createAccount(){
    await getAccess();
    const owners = document.getElementById("owners").value.split(",").filter((n) => n);
    console.log(owners);
    await contract.createAccount(owners).then(() => alert("Success"));
  }

  async function viewAccounts(){
    await getAccess();

    const result = await contract.getAccounts();
    console.log(result);
    document.getElementById("accounts").innerHTML = result;
  }

  async function getAccess(){
    if (contract) return;
    
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    contract = new ethers.Contract(address, abi, signer);

    const eventLog = document.getElementById("events");
    contract.on("AccountCreated", (owners, id, event) => {
      eventLog.append(`Account Created: ID = ${id}, Owners = ${owners}`);
    });
  }