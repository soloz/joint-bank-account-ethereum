pragma solidity >=0.4.22 <=0.8.24;

contract BankAccount {
    event Deposit(
        address indexed depositer,
        uint256 indexed accountId,
        uint value,
        uint timestamp
    );
    event WithdrawalRequested(
        address indexed user,
        uint indexed accountId,
        uint indexed withdrawalId,
        uint amount,
        uint timestamp
    );
    event Withdraw(uint indexed withdrawalId, uint timestamp);
    event AccountCreated(address[] owners, uint indexed id, uint timestamp);

    struct WithdrawalRequest {
        address user;
        uint withdrawRequestId;
        uint approvals;
        uint amount;
        mapping(address => bool) ownersApproved;
        bool approved;
    }

    struct Account {
        address[] owners;
        uint id;
        uint balance;
        mapping(uint => WithdrawalRequest) withdrawalRequest;
    }

    mapping(uint => Account) accounts;
    mapping(address => uint[]) userAccounts;

    uint nextWithdrawalId;
    uint nextAccountId;

    modifier canWithdraw(uint accountId, uint withdrawalId) {
        require(
            accounts[accountId].withdrawalRequest[withdrawalId].user ==
                msg.sender,
            "you did not create this request"
        );
        require(
            accounts[accountId].withdrawalRequest[withdrawalId].approved,
            "request not approved"
        );
        _;
    }

    modifier canApprove(uint accountId, uint withdrawalId) {
        require(
            !accounts[accountId].withdrawalRequest[withdrawalId].approved,
            "request already approved"
        );
        require(
            accounts[accountId].withdrawalRequest[withdrawalId].user !=
                msg.sender,
            "you are not an approver"
        );
        require(
            accounts[accountId].withdrawalRequest[withdrawalId].user !=
                address(0),
            "request does not exist"
        );
        require(
            !accounts[accountId].withdrawalRequest[withdrawalId].ownersApproved[
                msg.sender
            ],
            "you are not an approver"
        );
        _;
    }

    modifier sufficientBalance(uint accountId, uint amount) {
        require(accounts[accountId].balance >= amount);
        _;
    }

    modifier accountOwner(uint accountId) {
        bool isOwner;
        for (uint idx; idx < accounts[accountId].owners.length; idx++) {
            if (accounts[accountId].owners[idx] == msg.sender) {
                isOwner = true;
                break;
            }
        }
        require(isOwner, "you are not the account owner");
        _;
    }

    modifier validOwners(address[] calldata owners) {
        require(owners.length + 1 <= 4, "maximum of 4 owners per account");

        for (uint i; i < owners.length; i++) {
            if (owners[i] == msg.sender) {
                revert("no duplicate owners");
            }
            for (uint j = i + 1; j < owners.length; j++) {
                if (owners[i] == owners[j]) {
                    revert("no duplicate owners");
                }
            }
        }
        _;
    }

    function deposit(uint accountId) external payable accountOwner(accountId) {
        accounts[accountId].balance += msg.value;
    }

    function createAccount(
        address[] calldata otherOwners
    ) external validOwners(otherOwners) {
        address[] memory owners = new address[](otherOwners.length + 1);
        owners[otherOwners.length] = msg.sender;

        uint id = nextAccountId;

        for (uint idx; idx < owners.length; idx++) {
            if (idx < owners.length - 1) {
                owners[idx] = otherOwners[idx];
            }

            if (userAccounts[owners[idx]].length > 2) {
                revert("each user can only have a maximum of 3 accounts");
            }
            userAccounts[owners[idx]].push(id);
        }

        accounts[id].owners = owners;
        nextAccountId++;

        emit AccountCreated(owners, id, block.timestamp);
    }

    function requestWithdrawal(
        uint accountId,
        uint amount
    ) external accountOwner(accountId) sufficientBalance(accountId, amount) {
        uint id = nextWithdrawalId;
        WithdrawalRequest storage request = accounts[accountId]
            .withdrawalRequest[id];

        request.user = msg.sender;
        request.amount = amount;

        nextWithdrawalId++;

        emit WithdrawalRequested(
            msg.sender,
            accountId,
            id,
            amount,
            block.timestamp
        );
    }

    function approveWithdrawal(
        uint accountId,
        uint withdrawalId
    ) external accountOwner(accountId) canApprove(accountId, withdrawalId) {
        WithdrawalRequest storage request = accounts[accountId]
            .withdrawalRequest[withdrawalId];
        request.approvals++;
        request.ownersApproved[msg.sender] = true;

        if (request.approvals == accounts[accountId].owners.length - 1) {
            request.approved = true;
        }
    }

    function withdraw(uint accountId, uint withdrawalId) external {
        uint amount = accounts[accountId]
            .withdrawalRequest[withdrawalId]
            .amount;
        require(accounts[accountId].balance >= amount, "insufficient balance");

        accounts[accountId].balance -= amount;
        delete accounts[accountId].withdrawalRequest[withdrawalId];

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent);

        emit Withdraw(withdrawalId, block.timestamp);
    }

    function getBalance(uint accountId) public view returns (uint) {
        return accounts[accountId].balance;
    }

    function getOwners(uint accountId) public view returns (address[] memory) {
        return accounts[accountId].owners;
    }

    function getApprovals(
        uint accountId,
        uint withdrawalId
    ) public view returns (uint) {
        return accounts[accountId].withdrawalRequest[withdrawalId].approvals;
    }

    function getAccounts() public view returns (uint[] memory) {
        return userAccounts[msg.sender];
    }
}
