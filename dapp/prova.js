
// interact.js
const fs = require('fs');
const path = require('path');
const { ethers, JsonRpcProvider } = require('ethers');

// Leggi l'ABI del contratto
const abiPath = path.resolve(__dirname, '../contract/artifacts/contracts/Lock.sol/Lock.json');
const contractJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
const abi = contractJson.abi;

// Indirizzo del contratto distribuito
const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

/* change in to package.json, etherjs version 5.4 */
let url = "http://127.0.0.1:8545"
const provider = new ethers.providers.JsonRpcProvider(url);

// Account di interazione (secondo account di Hardhat)
const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const wallet = new ethers.Wallet(privateKey, provider);



async function waitForNewGameEvent(contract) {
    return new Promise((resolve, reject) => {
        contract.once("new_game_event", (num) => {
            //console.log(`Function return: ${num}`);
            resolve(num);
        });
    });
}

async function main() {

    const contract = new ethers.Contract(contractAddress, abi, wallet);
    console.log("in attesa ");
    const eventResult = await waitForNewGameEvent(contract);
    console.log("eccooo " + eventResult);

    //contract.on("new_game_event", (num) => {
    //    console.log("evento ogni tanto %o",num);
    //})


    // Ad esempio, se il contratto ha una funzione set(), puoi chiamarla così:
    // const tx = await contract.set(newValue);
    // await tx.wait();
    // console.log("New value set");
}

main().catch(console.error);