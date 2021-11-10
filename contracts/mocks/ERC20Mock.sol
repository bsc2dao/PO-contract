// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// mock class using ERC20
contract ERC20Mock is ERC20 {
    uint8 _decimals;

    constructor (
        string memory name,
        string memory symbol,
        uint8 __decimals,
        uint256 initialBalance
    ) public payable ERC20(name, symbol) {
        _decimals = __decimals;
        _mint(msg.sender, initialBalance);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}
