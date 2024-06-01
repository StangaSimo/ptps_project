import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter"

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.24",
        settings: {
            optimizer: {
                enabled: true,
            },
        },
    },
    networks: {
         hardhat:{
            allowUnlimitedContractSize: true,
         },
    },
    gasReporter: {
        enabled: (process.env.REPORT_GAS == "1") ? true : false
    }
};

export default config;
