## Overview

PO contract allows for collection of funds (ERC20 tokens) from participants approved by a central entity (i.e. the PO Organizer). Participants are selected and approved off-chain. For every participant, the PO Organizer signs a message which is used to verify the participants on-chain. Any approved particpant can call the smart contract and pass in the signature to prove they are whitelisted. If the signature is valid, the PO contract transfers the funds to a predefined collection wallet.

The PO contract does not hold any funds - it is a proxy between the participants and the collection wallet. Users claim their PO allocation by calling the smart contract.

## Dev Usage

### Deploy

```console
npx hardhat run --network [NETWORK_NAME] scripts\deploy.js
```

### Verify on Etherscan

```console
npx hardhat verify --network [NETWORK_NAME] [DEPLOYED_CONTRACT_ADDRESS] [PO_ORGANIZER_ADDRESS] [DEPOSIT_RECEIVER_ADDRESS]
```

### Sign a test message

Edit the `sign.js` script as desired and run:

```console
npx hardhat run scripts\sign.js
```
