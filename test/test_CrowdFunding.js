const { expect } = require('chai');
const { ethers } = require('hardhat');

// To convert normal numbers to ethers.
const toEther = (n) => {
    return ethers.utils.parseEther(n);
}

/* 
    Note: there might be a error on donating becuse the deadline provided at the time of creating are too low.
        If you computer is superfast or little slow it will occur, just because of time, just chane timings,
        at the time of creating new campaign.
*/

describe('Crowd Funding', () => {
    let crowdFunding, owner, addr1, addr2, tx, txBlockNumber, addr3, owner2, addr4, addr5, addr6, addr7;
    let provider = ethers.getDefaultProvider();

    // Used for testing purpose, just to know the current time stamp.
    const getTimeStamp = async () => {
        const blockNumber = await provider.getBlockNumber();
        const block = await provider.getBlock(blockNumber);
        return block.timestamp;
    }

    /* 
        'before' is used instead of 'beforeEach', to work woth the single & same contract instance. 
        If we used beforeEach, then it will create new instance for every testcase, which we don't want.
    */
    before(async function () {
        [owner, addr1, addr2, addr3, owner2, addr4, addr5, addr6, addr7] = await ethers.getSigners();
        const CrowdFunding = await ethers.getContractFactory("CrowdFunding");
        crowdFunding = await CrowdFunding.deploy();
    });

    /* 
    1. This first campaign which checks only the basics like 
        - if the campaign was successfully created.
        - if the donators are able to donate.
        - if the campaign owner can withdaw funds.
        - if the campaign successfully completed.
    */
    describe("Create Campaign", () => {
        it('Should create a new campaign', async () => {
            /* 
            this commented to make sure that the 3rd desribe block passes (deadline).
            tx = await crowdFunding.createCampaign(owner.address, "Charity", "For donating to charity.", toEther('10'), new Date(2023, 2, 23).getTime() / 1000, "image_url");
            */
            tx = await crowdFunding.createCampaign(owner.address, "Charity", "For donating to charity.", toEther('10'), Math.trunc((Date.now() + 1600) / 1000), "image_url");

            await tx.wait(); // wait for the transaction to be mined.
            const event = await crowdFunding.queryFilter("CampaignCreated", tx.blockNumber);
            expect(event[0].args.owner).to.equal(owner.address);
            expect(event[0].args.title).to.equal("Charity");
            expect(event[0].args.description).to.equal("For donating to charity.");
            expect(event[0].args.target).to.equal(toEther('10'));
            // expect(event[0].args.deadline).to.equal(Date.now() + 2000); - date.now will differ so.
            expect(event[0].args.image).to.equal("image_url");
            console.log(event[0].args.deadline);
        });

        it('Should assign correct owner of campaign', async () => {
            const campaign = await crowdFunding.getCampaigns();
            expect(campaign[0].owner).to.equal(owner.address);
        });
        it('Should assign correct target of campaign', async () => {
            const campaign = await crowdFunding.getCampaigns();
            expect(campaign[0].target).to.equal(toEther('10'));
        });
    });

    describe('donate to campaign', () => {

        it('1 - donates to campaign', async () => {
            tx = await crowdFunding.connect(addr1).donateToCampaign(0, true, { value: toEther('5') });
            txBlockNumber = tx.blockNumber;
            const campaign = await crowdFunding.getCampaigns();
            expect(campaign[0].donators[0]).to.equal(addr1.address);
        });

        it('emits an event on donating.', async () => {
            const CampaignCreated = await crowdFunding.queryFilter("DonationMade", txBlockNumber);
            expect(CampaignCreated[0].args.id).to.equal(0);
            expect(CampaignCreated[0].args.donator).to.equal(String(addr1.address));
            expect(CampaignCreated[0].args.amount).to.equal(toEther('5'));
            expect(CampaignCreated[0].args.agreed).to.equal(true);
        });

        it('increments the amount of money collected for the campaign', async () => {
            const campaign = await crowdFunding.getCampaigns();
            expect(campaign[0].AmountCollected).to.equal(toEther('5'));
        });

        it('2 - donates to campaign', async () => {
            tx = await crowdFunding.connect(addr2).donateToCampaign(0, true, { value: toEther('2') });
            txBlockNumber = tx.blockNumber;
            const campaign = await crowdFunding.getCampaigns();
            expect(campaign[0].donators[1]).to.equal(addr2.address);
        });

        it('increments the amount of money collected for the campaign', async () => {
            const campaign = await crowdFunding.getCampaigns();
            expect(campaign[0].AmountCollected).to.equal(toEther('7'));
        });

        it('3 - donates to campaign', async () => {
            tx = await crowdFunding.connect(addr3).donateToCampaign(0, false, { value: toEther('3') });
            const campaign = await crowdFunding.getCampaigns();
            expect(campaign[0].donators[2]).to.equal(addr3.address);
        });

        it('increments the amount of money collected for the campaign', async () => {
            const campaign = await crowdFunding.getCampaigns();
            expect(campaign[0].AmountCollected).to.equal(toEther('10'));
            console.log(Math.trunc(Date.now() / 1000));
        });

    });

    describe('Withdrawing funds by owner', () => {

        it('Should send owner the withdrawn funds', async () => {
            // just to make delay & to ensure that the deadline met.
            console.log(await getTimeStamp());

            const campaign = await crowdFunding.getCampaigns();
            const initialOwnerBalance = await owner.getBalance();

            await crowdFunding.withdrawFunds(0);

            const finalOwnerBalance = await owner.getBalance();
            const expectedOwnerBalance = initialOwnerBalance.add(campaign[0].AmountCollected);
            console.log(finalOwnerBalance, expectedOwnerBalance);

            // expectedOwnerBalance must be greater han the finalOwnerBalance, because some amount will be spent on 'gas' from the owner for calling the transaction.
            expect(expectedOwnerBalance).to.greaterThan(finalOwnerBalance);
            // value must be between 10,000 ethers (defaultly provided by hardhat - 10,000 ethers) and 10,010 because we sent 10 ethers to owner account. 
            expect(expectedOwnerBalance).to.be.within(
                BigInt(10000000000000000000000),
                BigInt(10010000000000000000000)
            );

        });
        it('resets the amount', async () => {
            const campaign = await crowdFunding.getCampaigns();
            expect(campaign[0].AmountCollected).to.equal(0);
        });
    });

    describe('refunding amount by donators', () => {
        it('should revert the transaction, because the campaign was complted & funds withdrawn by the campaign owner.', async () => {
            await expect(crowdFunding.connect(addr1).refund(0)).to.be.revertedWith('Campaign was successfully completed');
        });
    });

    /*
    2. The second campaign will go little intermediate checks.
        - if the target amount is not reached, will the owner be able to withdraw funds by 51% support.
    */
    describe("Create Campaign - 2", () => {
        // it just creates the campaign because all the basic level checks are completed above.
        it('Should create a new campaign', async () => {
            tx = await crowdFunding.createCampaign(owner2.address, "Charity", "For donating to charity.", toEther('10'), Math.trunc((Date.now() + 5600) / 1000), "image_url");

            await tx.wait();
            const event = await crowdFunding.queryFilter("CampaignCreated", tx.blockNumber);
            expect(event[0].args.owner).to.equal(owner2.address);
            expect(event[0].args.title).to.equal("Charity");
            expect(event[0].args.description).to.equal("For donating to charity.");
            expect(event[0].args.target).to.equal(toEther('10'));
            expect(event[0].args.image).to.equal("image_url");
        });
    });

    describe('donate to campaign', () => {
        // it just donates to the campaign because all the basic level checks are completed above.
        it('1 - donates to campaign', async () => {
            tx = await crowdFunding.connect(addr4).donateToCampaign(1, true, { value: toEther('5') });
            txBlockNumber = tx.blockNumber;
            const campaign = await crowdFunding.getCampaigns();
            expect(campaign[1].donators[0]).to.equal(addr4.address);
        });

        it('2 - donates to campaign', async () => {
            tx = await crowdFunding.connect(addr5).donateToCampaign(1, true, { value: toEther('2') });
            txBlockNumber = tx.blockNumber;
            const campaign = await crowdFunding.getCampaigns();
            expect(campaign[1].donators[1]).to.equal(addr5.address);
        });

        it('3 - donates to campaign', async () => {
            tx = await crowdFunding.connect(addr6).donateToCampaign(1, false, { value: toEther('2') });
            const campaign = await crowdFunding.getCampaigns();
            expect(campaign[1].donators[2]).to.equal(addr6.address);
        });
    });

    describe('Withdrawing funds by owner', () => {

        it('Should send owner the withdrawn funds', async () => {
            console.log(await getTimeStamp());
            const campaign = await crowdFunding.getCampaigns();
            const initialOwnerBalance = await owner2.getBalance();

            await crowdFunding.connect(owner2).withdrawFunds(1);

            const finalOwnerBalance = await owner2.getBalance();
            const expectedOwnerBalance = initialOwnerBalance.add(campaign[1].AmountCollected);
            console.log(finalOwnerBalance, expectedOwnerBalance);

            // expectedOwnerBalance must be greater han the finalOwnerBalance, because some amount will be spent on 'gas' from the owner for calling the transaction.
            expect(expectedOwnerBalance).to.greaterThan(finalOwnerBalance);
            // value must be between 10,000 ethers (defaultly provided by hardhat - 10,000 ethers) and 10,010 because we sent 10 ethers to owner account. 
            expect(expectedOwnerBalance).to.be.within(
                BigInt(10000000000000000000000),
                BigInt(10010000000000000000000)
            );

        });
    });

    /*
    3. The third campaign will go little intermediate checks.
        - if the target amount is not reached, will the donator be able to refund their funds.
    */
    describe("Create Campaign - 3", () => {
        // it just creates the campaign because all the basic level checks are completed above.
        it('Should create a new campaign', async () => {
            tx = await crowdFunding.createCampaign(owner2.address, "Charity", "For donating to charity.", toEther('10'), Math.trunc((Date.now() + 9000) / 1000), "image_url");

            await tx.wait();
            const event = await crowdFunding.queryFilter("CampaignCreated", tx.blockNumber);
            expect(event[0].args.owner).to.equal(owner2.address);
            expect(event[0].args.title).to.equal("Charity");
            expect(event[0].args.description).to.equal("For donating to charity.");
            expect(event[0].args.target).to.equal(toEther('10'));
            expect(event[0].args.image).to.equal("image_url");
        });
    });
    describe('donate to campaign', () => {
        // it just donates to the campaign because all the basic level checks are completed above.
        it('1 - donates to campaign', async () => {
            tx = await crowdFunding.connect(addr4).donateToCampaign(2, true, { value: toEther('5') });
            txBlockNumber = tx.blockNumber;
            const campaign = await crowdFunding.getCampaigns();
            expect(campaign[2].donators[0]).to.equal(addr4.address);
        });

        it('2 - donates to campaign', async () => {
            tx = await crowdFunding.connect(addr5).donateToCampaign(2, true, { value: toEther('2') });
            txBlockNumber = tx.blockNumber;
            const campaign = await crowdFunding.getCampaigns();
            expect(campaign[2].donators[1]).to.equal(addr5.address);
        });

        it('3 - donates to campaign', async () => {
            tx = await crowdFunding.connect(addr7).donateToCampaign(2, false, { value: toEther('1') });
            const campaign = await crowdFunding.getCampaigns();
            expect(campaign[2].donators[2]).to.equal(addr7.address);
        });
    });

    describe('Withdrawing funds by donator', () => {
        it('Should allow donator the refund the amount they donated', async () => {
            console.log(await getTimeStamp());
            const initialDonatorBalance = await addr7.getBalance();

            await crowdFunding.connect(addr7).refund(2);

            const finalDonatorBalance = await addr7.getBalance();
            console.log(initialDonatorBalance, finalDonatorBalance);

            // expectedOwnerBalance must be greater han the finalOwnerBalance, because some amount will be spent on 'gas' from the owner for calling the transaction.
            // expect(finalDonatorBalance).to.greaterThan(initialDonatorBalance);
            // value must be between 10,000 ethers (defaultly provided by hardhat - 10,000 ethers) and 10,010 because we sent 10 ethers to owner account. 
            expect(finalDonatorBalance).to.be.within(
                BigInt(9990000000000000000000),
                BigInt(10000000000000000000000)
            );

        });
    });
});