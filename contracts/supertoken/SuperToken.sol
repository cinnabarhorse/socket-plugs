pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";

import "./IMessageBridge.sol";
import "./ISuperTokenOrVault.sol";

import {AccessControl} from "../common/AccessControl.sol";
import {RescueFundsLib} from "../libraries/RescueFundsLib.sol";
import "../common/Gauge.sol";
import "./Execute.sol";

contract SuperToken is
    ERC20,
    Gauge,
    ISuperTokenOrVault,
    AccessControl,
    Execute
{
    IMessageBridge public bridge__;

    bytes32 constant RESCUE_ROLE = keccak256("RESCUE_ROLE");
    bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");

    struct UpdateLimitParams {
        bool isMint;
        uint32 siblingChainSlug;
        uint256 maxLimit;
        uint256 ratePerSecond;
    }
    // siblingChainSlug => mintLimitParams
    mapping(uint32 => LimitParams) _receivingLimitParams;

    // siblingChainSlug => burnLimitParams
    mapping(uint32 => LimitParams) _sendingLimitParams;

    // siblingChainSlug => receiver => identifier => amount
    mapping(uint32 => mapping(address => mapping(bytes32 => uint256)))
        public pendingMints;

    // siblingChainSlug => amount
    mapping(uint32 => uint256) public siblingPendingMints;

    error SiblingNotSupported();
    error MessageIdMisMatched();
    error ZeroAmount();
    error NotPlug();

    event LimitParamsUpdated(UpdateLimitParams[] updates);
    event PlugUpdated(address newPlug);
    event BridgeTokens(
        uint32 siblingChainSlug,
        address withdrawer,
        address receiver,
        uint256 bridgedAmount,
        bytes32 identifier
    );

    event PendingTokensBridged(
        uint32 siblingChainSlug,
        address receiver,
        uint256 mintAmount,
        uint256 pendingAmount,
        bytes32 identifier
    );
    event TokensPending(
        uint32 siblingChainSlug,
        address receiver,
        uint256 pendingAmount,
        uint256 totalPendingAmount,
        bytes32 identifier
    );
    event TokensBridged(
        uint32 siblingChainSlug,
        address receiver,
        uint256 mintAmount,
        uint256 totalAmount,
        bytes32 identifier
    );

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address user_,
        address owner_,
        uint256 initialSupply_,
        address plug_
    ) ERC20(name_, symbol_, decimals_) AccessControl(owner_) {
        _mint(user_, initialSupply_);
        bridge__ = IMessageBridge(plug_);
    }

    function updatePlug(address plug_) external onlyOwner {
        bridge__ = IMessageBridge(plug_);
        emit PlugUpdated(plug_);
    }

    function updateLimitParams(
        UpdateLimitParams[] calldata updates_
    ) external onlyRole(LIMIT_UPDATER_ROLE) {
        for (uint256 i; i < updates_.length; i++) {
            if (updates_[i].isMint) {
                _consumePartLimit(
                    0,
                    _receivingLimitParams[updates_[i].siblingChainSlug]
                ); // to keep current limit in sync
                _receivingLimitParams[updates_[i].siblingChainSlug]
                    .maxLimit = updates_[i].maxLimit;
                _receivingLimitParams[updates_[i].siblingChainSlug]
                    .ratePerSecond = updates_[i].ratePerSecond;
            } else {
                _consumePartLimit(
                    0,
                    _sendingLimitParams[updates_[i].siblingChainSlug]
                ); // to keep current limit in sync
                _sendingLimitParams[updates_[i].siblingChainSlug]
                    .maxLimit = updates_[i].maxLimit;
                _sendingLimitParams[updates_[i].siblingChainSlug]
                    .ratePerSecond = updates_[i].ratePerSecond;
            }
        }

        emit LimitParamsUpdated(updates_);
    }

    function bridge(
        address receiver_,
        uint32 siblingChainSlug_,
        uint256 sendingAmount_,
        uint256 msgGasLimit_,
        bytes calldata payload_,
        bytes calldata options_
    ) external payable {
        if (_sendingLimitParams[siblingChainSlug_].maxLimit == 0)
            revert SiblingNotSupported();

        if (sendingAmount_ == 0) revert ZeroAmount();
        _consumeFullLimit(
            sendingAmount_,
            _sendingLimitParams[siblingChainSlug_]
        ); // reverts on limit hit
        _burn(msg.sender, sendingAmount_);

        bytes32 messageId = bridge__.getMessageId(siblingChainSlug_);
        bytes32 returnedMessageId = bridge__.outbound{value: msg.value}(
            siblingChainSlug_,
            msgGasLimit_,
            abi.encode(receiver_, sendingAmount_, messageId, payload_),
            options_
        );

        if (returnedMessageId != messageId) revert MessageIdMisMatched();
        emit BridgeTokens(
            siblingChainSlug_,
            msg.sender,
            receiver_,
            sendingAmount_,
            messageId
        );
    }

    function mintPendingFor(
        address receiver_,
        uint32 siblingChainSlug_,
        bytes32 identifier
    ) external nonReentrant {
        if (_receivingLimitParams[siblingChainSlug_].maxLimit == 0)
            revert SiblingNotSupported();

        uint256 pendingMint = pendingMints[siblingChainSlug_][receiver_][
            identifier
        ];
        (uint256 consumedAmount, uint256 pendingAmount) = _consumePartLimit(
            pendingMint,
            _receivingLimitParams[siblingChainSlug_]
        );

        pendingMints[siblingChainSlug_][receiver_][identifier] = pendingAmount;
        siblingPendingMints[siblingChainSlug_] -= consumedAmount;

        _mint(receiver_, consumedAmount);

        if (
            pendingAmount == 0 &&
            pendingExecutions[identifier].receiver != address(0)
        ) {
            // execute
            pendingExecutions[identifier].isAmountPending = false;
            bool success = _execute(
                receiver_,
                pendingExecutions[identifier].payload
            );
            if (success) _clearPayload(identifier);
        }

        emit PendingTokensBridged(
            siblingChainSlug_,
            receiver_,
            consumedAmount,
            pendingAmount,
            identifier
        );
    }

    function inbound(
        uint32 siblingChainSlug_,
        bytes memory payload_
    ) external payable override nonReentrant {
        if (msg.sender != address(bridge__)) revert NotPlug();

        if (_receivingLimitParams[siblingChainSlug_].maxLimit == 0)
            revert SiblingNotSupported();

        (
            address receiver,
            uint256 mintAmount,
            bytes32 identifier,
            bytes memory execPayload
        ) = abi.decode(payload_, (address, uint256, bytes32, bytes));

        (uint256 consumedAmount, uint256 pendingAmount) = _consumePartLimit(
            mintAmount,
            _receivingLimitParams[siblingChainSlug_]
        );

        _mint(receiver, consumedAmount);

        if (pendingAmount > 0) {
            pendingMints[siblingChainSlug_][receiver][
                identifier
            ] = pendingAmount;
            siblingPendingMints[siblingChainSlug_] += pendingAmount;

            emit TokensPending(
                siblingChainSlug_,
                receiver,
                pendingAmount,
                pendingMints[siblingChainSlug_][receiver][identifier],
                identifier
            );

            // cache payload
            if (execPayload.length > 0)
                _cachePayload(
                    identifier,
                    siblingChainSlug_,
                    true,
                    receiver,
                    execPayload
                );
        } else if (execPayload.length > 0) {
            // execute
            bool success = _execute(receiver, execPayload);

            if (!success)
                _cachePayload(
                    identifier,
                    siblingChainSlug_,
                    false,
                    receiver,
                    execPayload
                );
        }

        emit TokensBridged(
            siblingChainSlug_,
            receiver,
            consumedAmount,
            mintAmount,
            identifier
        );
    }

    function getCurrentReceivingLimit(
        uint32 siblingChainSlug_
    ) external view returns (uint256) {
        return _getCurrentLimit(_receivingLimitParams[siblingChainSlug_]);
    }

    function getCurrentSendingLimit(
        uint32 siblingChainSlug_
    ) external view returns (uint256) {
        return _getCurrentLimit(_sendingLimitParams[siblingChainSlug_]);
    }

    function getReceivingLimitParams(
        uint32 siblingChainSlug_
    ) external view returns (LimitParams memory) {
        return _receivingLimitParams[siblingChainSlug_];
    }

    function getSendingLimitParams(
        uint32 siblingChainSlug_
    ) external view returns (LimitParams memory) {
        return _sendingLimitParams[siblingChainSlug_];
    }

    /**
     * @notice Rescues funds from the contract if they are locked by mistake.
     * @param token_ The address of the token contract.
     * @param rescueTo_ The address where rescued tokens need to be sent.
     * @param amount_ The amount of tokens to be rescued.
     */
    function rescueFunds(
        address token_,
        address rescueTo_,
        uint256 amount_
    ) external onlyRole(RESCUE_ROLE) {
        RescueFundsLib.rescueFunds(token_, rescueTo_, amount_);
    }
}
