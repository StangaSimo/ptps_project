
//     \x1B[31m = RED
//     \x1B[32m = GREEN
//     \x1B[96m = Blue
//     \x1B[01;95m = PURPLE
//     \x1B[01;94m = VIOLET
//     \x1B[01;93m = Yellow
//     \x1B[01;91m = ORANGE
//     \x1B[01;90m = GREY
//     \x1B[01;89m = WHITE
//     \x1B[0m = Back to your terminal's default colour
//     ⬤
//     https://www.alt-codes.net/circle-symbols

// https://docs.ethers.org/v5/api/contract/contract/


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

//TODO: wait player joined

async function waitForNewGameEvent(contract) {
    return new Promise(async (resolve, reject) => {
        const naAddress = '0x0000000000000000000000000000000000000000';
        await contract.new_game(naAddress);
        contract.once("new_game_event", (num) => {
            console.log(`Function return: ${num}`);
            resolve(num);
        });
    });
}

async function main() {

    const contract = new ethers.Contract(contractAddress, abi, wallet);
    console.log("Contract balance:", (await provider.getBalance(contractAddress)).toString());
    await contract.new_game('0x0000000000000000000000000000000000000000');
    console.log("Game ID:", (await contract.get_gameid_byaddress(wallet.address)).toString());
    

}

main().catch(console.error);

function real_date(x) {
    var date = new Date(x * 1000);
    var hours = date.getHours();
    var minutes = "0" + date.getMinutes();
    var seconds = "0" + date.getSeconds();
    var formattedTime = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
    return formattedTime
}
