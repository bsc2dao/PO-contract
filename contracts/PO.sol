//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/// @title Project Offering (PO) contract used to collect funds from PO lottery winners.
/// @notice The flow is the following:
/// 1. PO Organizer runs the lottery off-chain.
/// 2. Once the winners are selected, for every winner, the PO Organzier signs a message cointaining the PO information.
///    The signing, as well as the signature storage, is done off-chain.
/// 3. Winners call this contract passing in the signature and the relevant PO data. By doing this they confirm their
///    particiaption in the PO (i.e. claim their winning spot) and transfer the funds required to participate.
/// 4. The PO contract verifies the signature, to make sure it comes from the PO Organizer, and verifies the signed PO data.
///    If all is correct, the funds are transferred from the winner to the fund receiver.
/// @dev The contract is owned by an admin (intended to be a multisig wallet) who can change critical state variables.
/// PO Organizer is a off-chain role.
contract PO is Ownable, Pausable {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    address public poOrganizer;
    address public depositReceiver;

    mapping(string => mapping(address => bool)) public depositsForPo;

    event PoOrganizerChanged(
        address oldPoOrganizer,
        address newPoOrganizer
    );

    event DepositReceiverChanged(
        address oldDepositReceiver,
        address newDepositReceiver
    );

    event Deposited(
        address indexed winner,
        string indexed indexedPoId,
        string poId,
        IERC20 depositToken,
        uint amount,
        uint deadline,
        address indexed depositReceiver,
        address poOrganizer
    );

    event RecoveredERC20(
        uint amount,
        IERC20 token
    );

    constructor(address _poOrganizer, address _depositReceiver) {
        poOrganizer = _poOrganizer;
        depositReceiver = _depositReceiver;

        emit PoOrganizerChanged(address(0), _poOrganizer);
        emit DepositReceiverChanged(address(0), _depositReceiver);
    }

    function setPoOrganizer(address _poOrganizer) external onlyOwner {
        emit PoOrganizerChanged(poOrganizer, _poOrganizer);
        poOrganizer = _poOrganizer;
    }
    function setDepositReceiver(address _depositReceiver) external onlyOwner {
        emit DepositReceiverChanged(depositReceiver, _depositReceiver);
        depositReceiver = _depositReceiver;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Verifies that the passed PO data is signed correctly and that the signature comes from the PO Organizer.
    /// If all checks out, the caller is marked in contract storage and funds are transferred from the caller to the predefined
    /// fund receiver.
    /// @dev Callable by any account. Security is based on the passed signature. Pausable by the owner.
    /// @param signature Signature from the PO Organizer. The message signed contains the winner address and the other parameters
    ///        passed in the call.
    /// @param poId An opaque PO identifier.
    /// @param depositToken Address of an ERC20-compatible token used for deposits in this PO. The winner must first set the token
    ///        allowance of this contract for the `amount` or more.
    /// @param amount Amount of tokens the winner is allowed to send. The unit is the base unit of the `depositToken`
    ///        (i.e. the smallest subdenomination of the token).
    /// @param deadline Time until the winners have to call this function (in Unix time).
    function deposit(
        bytes calldata signature,
        string calldata poId,
        IERC20 depositToken,
        uint amount,
        uint deadline
    ) external whenNotPaused {
        address winner = msg.sender;

        require(!depositsForPo[poId][winner], "PO: this wallet already made a deposit for this PO");
        require(block.timestamp <= deadline, "PO: the deadline for this PO has passed");

        bytes32 dataHash = keccak256(abi.encodePacked(winner, poId, depositToken, amount, deadline, depositReceiver));
        require(dataHash.toEthSignedMessageHash().recover(signature) == poOrganizer, "PO: signature verification failed");

        depositsForPo[poId][winner] = true;
        depositToken.safeTransferFrom(winner, depositReceiver, amount);

        emit Deposited(winner, poId, poId, depositToken, amount, deadline, depositReceiver, poOrganizer);
    }

    /// @notice Recovers any tokens unintentionally sent to this contract. This contract is not meant to hold any funds.
    /// @dev The admin can call this to recover any tokens sent mistakenly to this contract by users.
    /// @param token ERC20 token address to be recovered.
    function recoverERC20(IERC20 token) external onlyOwner {
        uint balance = token.balanceOf(address(this));
        token.safeTransfer(msg.sender, balance);

        emit RecoveredERC20(balance, token);
    }
}
