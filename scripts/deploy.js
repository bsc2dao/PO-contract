async function main() {
    const poOrganizer = "";
    const depositReceiver = ""

    const PO = await ethers.getContractFactory("PO");
    const sho = await PO.deploy(poOrganizer, depositReceiver);
    await sho.deployed();

    console.log("PO smart contract deployed at:", sho.address);
    console.log("poOrganizer:", poOrganizer);
    console.log("depositReceiver:", depositReceiver);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
