/** @type import('hardhat/config').HardhatUserConfig */
require("dotenv").config();

module.exports = {
  solidity: {
    version: '0.8.9',
    defaultNetwork: 'goerli',
    networks:{
      goerli:{
        url: 'https://rpc.ankr.com/eth_goerli',
        accounts: [process.env.PRIVATE_KEY]
      }
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};
