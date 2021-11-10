require('dotenv').config();

async function main() {
    const winner = "";
    const poId = "bilygb&^9871354lijh ,!@#$%^&*().";
    const depositToken = "0x9c8fa1ee532f8afe9f2e27f06fd836f3c9572f71"; //USDC ropstein
	const amount = ethers.utils.parseUnits("1", 6);
    const deadline = Math.round(Date.now() / 1000) + 3600;
    const depositReceiver = "";

    const dataHash = web3.utils.soliditySha3(winner, poId, depositToken, amount.toString(), deadline, depositReceiver);
    const signature = web3.eth.accounts.sign(dataHash, process.env.DEPLOYER_PRIVATE_KEY).signature;
    
    console.log("Winner:", winner);
    console.log("PO ID:", poId);
    console.log("Deposit token:", depositToken);
    console.log("Amount:", amount.toString());
    console.log("Deadline:", deadline);
    console.log("Deposit receiver:", depositReceiver);
    console.log();
    console.log("Signature:", signature);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
