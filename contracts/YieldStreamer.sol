// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract YieldStreamer is ReentrancyGuard {
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientBalance();
    // error InsufficientRewardsBalance();

    IERC20 public immutable token;
    uint256 public constant YIELD_RATE_PER_SECOND = 10;

    // TODO: Add tracking mappings/structs for users here

    struct UserInfo {
        uint256 depositAmount;
        uint256 lastClaimTime;
    }

    mapping(address => UserInfo) public userInfos;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event YieldClaimed(address indexed user, uint256 amount);

    constructor(address _token) {
        if (_token == address(0)) revert ZeroAddress();
        token = IERC20(_token);
    }

    function deposit(uint256 amount) external nonReentrant {
        // TODO: Implement logic (Update yield tracking before changing principal balance)
        if (amount == 0) revert ZeroAmount();

        token.transferFrom(msg.sender, address(this), amount);

        UserInfo storage user = userInfos[msg.sender];

        // Possible this could be an additional deposit, so clear out any pending yield
        if (user.depositAmount > 0) {
            _handlePendingYields();
        }

        user.lastClaimTime = block.timestamp;
        user.depositAmount += amount;

        emit Deposited(msg.sender, amount);
    }

    function pendingYield(address user) public view returns (uint256) {
        // TODO: Calculate linear time delta * YIELD_RATE_PER_SECOND

        UserInfo memory userInfo = userInfos[user];
        // Avoid additional calculations if not needed (gas)
        if (userInfo.depositAmount == 0) return 0;

        // Relative deposit amount not a factor? Instructions/TODO did not specify
        uint256 timeDelta = block.timestamp - userInfo.lastClaimTime;
        // Could consider tokens decimals here if different precision was intended for assignment
        return timeDelta * YIELD_RATE_PER_SECOND;
    }

    function claimYield() external nonReentrant {
        // TODO: Implement logic

        uint256 rewards = pendingYield(msg.sender);
        // if (rewards > token.balanceOf(address(this)))
        //     revert InsufficientRewardsBalance();

        if (rewards > 0) {
            UserInfo storage user = userInfos[msg.sender];
            user.lastClaimTime = block.timestamp;
            token.transfer(msg.sender, rewards);

            emit YieldClaimed(msg.sender, rewards);
        }
    }

    function withdraw(uint256 amount) external nonReentrant {
        // TODO: Implement logic

        if (amount == 0) revert ZeroAmount();

        UserInfo storage user = userInfos[msg.sender];
        if (user.depositAmount < amount) revert InsufficientBalance();

        _handlePendingYields();

        user.lastClaimTime = block.timestamp;
        user.depositAmount -= amount;

        token.transfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    function _handlePendingYields() private {
        uint256 rewards = pendingYield(msg.sender);
        // if (rewards > token.balanceOf(address(this)))
        //     revert InsufficientRewardsBalance();

        if (rewards > 0) {
            token.transfer(msg.sender, rewards);

            emit YieldClaimed(msg.sender, rewards);
        }
    }
}
