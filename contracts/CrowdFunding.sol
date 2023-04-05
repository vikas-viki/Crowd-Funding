// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract CrowdFunding {
    struct Campaign {
        // Owner of the campaign.
        address owner;
        // title of the campaign.
        string title;
        // Campaign description.
        string description;
        // Campaign target amount.
        uint256 target;
        // Campaign deadline.
        uint256 deadline;
        // Total amount collected through Campaign.
        uint256 AmountCollected;
        // Image of campaign.
        string image;
        // Array of donators.
        address[] donators;
        // Amount donated by donators.
        uint256[] donations;
    }

    mapping(uint256 => Campaign) public campaigns;

    // To keep track of campaigns.
    uint256 public numberOfCampaigns = 0;

    // To create new campaign.
    function createCampaign(
        address _owner,
        string memory _title,
        string memory _description,
        uint256 _target,
        uint256 _deadline,
        string memory _image
    ) public returns(uint256) {
        Campaign storage campaign = campaigns[numberOfCampaigns++];
        // Check if the passed date is valid.
        require(campaign.deadline < block.timestamp, "Deadline should be a date in future");

        campaign.owner = _owner;
        campaign.title = _title;
        campaign.description = _description;
        campaign.target = _target;
        campaign.deadline = _deadline;
        campaign.image = _image;

        return numberOfCampaigns - 1;
    }

    // To donate to a campaign of a specific ID
    function donateToCampaign(uint256 _id) public payable{
        uint256 amount = msg.value;

        Campaign storage campaign = campaigns[_id];
        campaign.donators.push(msg.sender);

        campaign.donations.push(amount);

        (bool sent, ) = payable(campaign.owner).call{value: amount}("");

        if(sent){
            campaign.AmountCollected += amount;
        }
    }

    // Get all the donators with their donations amount.
    function getDonators(uint256 _id) public view returns(address[] memory, uint256[] memory) {
        return (campaigns[_id].donators, campaigns[_id].donations);
    }

    // Get all the campaigns that are created.
    function getCampaigns() public view returns(Campaign[] memory){
        Campaign[] memory allCampaigns = new Campaign[](numberOfCampaigns);

        for(uint i =0;i<numberOfCampaigns;i++){
            Campaign storage item = campaigns[i];

            allCampaigns[i] = item;
        }

        return allCampaigns;
    }
}
