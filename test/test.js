const { expect } = require("chai");
const { time } = require("@openzeppelin/test-helpers");

const parseUnits = (value, decimals = 18) => {
    return ethers.utils.parseUnits(value.toString(), decimals);
}

describe("PO", () => {
    let contract, depositToken, depositReceiver, organizer, winner1, winner2, winner3, hacker;
    let depositToken2, depositReceiver2, organizer2;
    let poId = "ABC1234567";

    before(async() => {
        const PO = await ethers.getContractFactory("PO");
        const ERC20 = await ethers.getContractFactory('ERC20Mock');

        depositToken = await ERC20.deploy("MOCK token", "MOCK", 6, parseUnits(8000, 6));
        depositToken2 = await ERC20.deploy("MOCK token 2 ", "MOCK 2", 6, parseUnits(8000, 6));

        [owner, depositReceiver, organizer, winner1, winner2, winner3, depositReceiver2, organizer2, hacker] 
            = await ethers.getSigners();

        contract = await PO.deploy(organizer2.address, depositReceiver2.address);
        await contract.deployed();

        const initialBalance = parseUnits(2000, 6);
        await depositToken.transfer(winner2.address, initialBalance);
        await depositToken2.transfer(winner2.address, initialBalance);
        await depositToken.transfer(winner3.address, initialBalance);
        await depositToken.transfer(hacker.address, initialBalance);

        depositToken = depositToken.connect(winner1);
        await depositToken.approve(contract.address, initialBalance);
        depositToken = depositToken.connect(winner2);
        await depositToken.approve(contract.address, initialBalance);
        depositToken2 = depositToken2.connect(winner2);
        await depositToken2.approve(contract.address, initialBalance);
        depositToken = depositToken.connect(winner3);
        await depositToken.approve(contract.address, initialBalance);
        depositToken = depositToken.connect(hacker);
        await depositToken.approve(contract.address, initialBalance);
    });

    describe("Full flow test", () => {
        let signature1, signature2, signature3, amount, deadline;

        before(async() => {
            const currentTime = await time.latest();
            amount = parseUnits(500, 6);
            deadline = Number(currentTime) + Number(time.duration.hours('12'));

            const dataHash1 = web3.utils.soliditySha3(winner1.address, poId, depositToken.address, amount.toString(), deadline, depositReceiver.address);
            signature1 = await web3.eth.sign(dataHash1, organizer.address);

            const dataHash2 = web3.utils.soliditySha3(winner2.address, poId, depositToken.address, amount.toString(), deadline, depositReceiver.address);
            signature2 = await web3.eth.sign(dataHash2, organizer.address);

            signatureWrongPoOrganizer = await web3.eth.sign(dataHash2, winner2.address);

            const dataHashWrongDepositReceiver = web3.utils.soliditySha3(winner2.address, poId, depositToken.address, amount.toString(), deadline, winner2.address);
            signatureWrongDepositReceiver = await web3.eth.sign(dataHashWrongDepositReceiver, organizer.address);

            const dataHash3 = web3.utils.soliditySha3(winner3.address, poId, depositToken.address, amount.toString(), deadline, depositReceiver.address);
            signature3 = await web3.eth.sign(dataHash3, organizer.address);
        });

        it("Changing deposit receiver, organizer and pausing - only owner", async() => {
            contract = contract.connect(winner1);
            await expect(contract.setPoOrganizer(organizer.address)).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(contract.setDepositReceiver(depositReceiver.address)).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(contract.pause()).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(contract.unpause()).to.be.revertedWith("Ownable: caller is not the owner");

            contract = contract.connect(owner);
            await contract.setPoOrganizer(organizer.address);
            await contract.setDepositReceiver(depositReceiver.address);
            await contract.pause();
            await contract.unpause();
        });

        it("Winner 1 tries to deposit - fails, not enough balance", async() => {
            contract = contract.connect(winner1);
            await expect(contract.deposit(signature1, poId, depositToken.address, amount, deadline))
                .to.be.revertedWith("ERC20: transfer amount exceeds balance");
                
            depositToken = depositToken.connect(owner);
            await depositToken.transfer(winner1.address, parseUnits(2000, 6));
        });

        it("Winner 1 tries to deposit and unpause while paused", async() => {
            contract = contract.connect(owner);
            await contract.pause();

            contract = contract.connect(winner1);
            await expect(contract.deposit(signature1, poId, depositToken.address, amount, deadline))
                .to.be.revertedWith("Pausable: paused");
            await expect(contract.unpause())
                .to.be.revertedWith("Ownable: caller is not the owner");
            
            // Verify that the deposit did not take place
            const depositReceiverBalanceAfter = await depositToken.balanceOf(depositReceiver.address);
            expect(depositReceiverBalanceAfter).to.equal(0);

            contract = contract.connect(owner);
            await contract.unpause();
        });

        it("Winner 1 deposits - succeeds", async() => {
            contract = contract.connect(winner1);

            const depositReceiverBalanceBefore = await depositToken.balanceOf(depositReceiver.address);
            await contract.deposit(signature1, poId, depositToken.address, amount, deadline);
            const depositReceiverBalanceAfter = await depositToken.balanceOf(depositReceiver.address);
            expect(depositReceiverBalanceAfter).to.equal(depositReceiverBalanceBefore.add(amount));
        });

        it("Winner 1 tries to deposit again - fails", async() => {
            contract = contract.connect(winner1);

            await expect(contract.deposit(signature1, poId, depositToken.address, amount, deadline)).to.be.revertedWith("PO: this wallet already made a deposit for this PO");
        });
        
        it("Winner 2 tries to deposit with wrong parameters - fails", async() => {
            contract = contract.connect(winner2);

            await expect(contract.deposit(signature1, poId, depositToken.address, amount, deadline))
                .to.be.revertedWith("PO: signature verification failed");
            await expect(contract.deposit(signature2, poId + "8", depositToken.address, amount, deadline))
                .to.be.revertedWith("PO: signature verification failed");
            await expect(contract.deposit(signature2, poId, depositToken2.address, amount, deadline))
                .to.be.revertedWith("PO: signature verification failed");
            await expect(contract.deposit(signature2, poId, depositToken.address, parseUnits(1, 6), deadline))
                .to.be.revertedWith("PO: signature verification failed");
            await expect(contract.deposit(signature2, poId, depositToken.address, parseUnits(1000, 6), deadline))
                .to.be.revertedWith("PO: signature verification failed");
            await expect(contract.deposit(signature2, poId, depositToken.address, amount, deadline + 1))
                .to.be.revertedWith("PO: signature verification failed");
            await expect(contract.deposit(signatureWrongPoOrganizer, poId, depositToken.address, amount, deadline))
                .to.be.revertedWith("PO: signature verification failed");
            await expect(contract.deposit(signatureWrongDepositReceiver, poId, depositToken.address, amount, deadline))
                .to.be.revertedWith("PO: signature verification failed");
        });

        it("Winner 2 deposits after 6 hours - succeeds", async() => {
            await time.increase(time.duration.hours('6'));
            contract = contract.connect(winner2);

            const depositReceiverBalanceBefore = await depositToken.balanceOf(depositReceiver.address);
            await contract.deposit(signature2, poId, depositToken.address, amount, deadline);
            const depositReceiverBalanceAfter = await depositToken.balanceOf(depositReceiver.address);
            expect(depositReceiverBalanceAfter).to.equal(depositReceiverBalanceBefore.add(amount));
        });

        it("A hacker sends deposit directly to the PO contract - the owner withdraws it", async() => {
            depositToken = depositToken.connect(hacker);
            await depositToken.transfer(contract.address, amount);

            contract = contract.connect(owner);
            const ownerBalanceBefore = await depositToken.balanceOf(owner.address);
            await contract.recoverERC20(depositToken.address);
            const ownerBalanceAfter = await depositToken.balanceOf(owner.address);
            expect(ownerBalanceAfter).to.equal(ownerBalanceBefore.add(amount));
        })

        it("Winner 3 deposits 2 hours after the deadline - fails", async() => {
            await time.increase(time.duration.hours('8'));
            contract = contract.connect(winner3);

            await expect(contract.deposit(signature3, poId, depositToken.address, amount, deadline)).to.be.revertedWith("PO: the deadline for this PO has passed");
        });
    });
});
