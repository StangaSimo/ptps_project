const { exit } = require('process');
var readlineSync = require('readline-sync');
const fs = require('fs');
const path = require('path');
const { ethers, JsonRpcProvider } = require('ethers');
const { start } = require('repl');

let address_2_player;
const abiPath = path.resolve(__dirname, '../contract/artifacts/contracts/Lock.sol/Lock.json');
const contractJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
const abi = contractJson.abi;
const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
let url = "http://127.0.0.1:8545"
let privateKey;

if (process.env.DEBUG == '1') 
        privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';


if (process.env.DEBUG == '2') 
        privateKey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

const provider = new ethers.providers.JsonRpcProvider(url);
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(contractAddress, abi, wallet);


async function waitForGameID() {
    return new Promise(async (resolve, reject) => {
        contract.once("random_player_gameid", (addr, gameID) => {
            resolve([addr, gameID]);
        });
    });
}

async function waitForOffer() {
    return new Promise(async (resolve, reject) => {
        contract.once("offer_value", (addr, option, value) => {
            resolve([addr, option, value]);
        });
    });
}

async function waitForAccept() {
    return new Promise(async (resolve, reject) => {
        contract.once("accept_value", (addr, value) => {
            resolve([addr, value]);
        });
    });
}

async function waitForRandomPlayer() {
    return new Promise(async (resolve, reject) => {
        contract.once("random_player_joined", (addr) => {
            resolve(addr);
        });
    });
}

async function waitForPlayer() {
    return new Promise(async (resolve, reject) => {
        contract.once("player_joined", (addr) => {
            resolve(addr);
        });
    });
}

async function main() {
    /* test function creator_client */
    if (process.env.DEBUG == '1') {
        console.log("debug Mode: Creator");
        console.log("Contract Balance:", (await provider.getBalance(contractAddress)).toString());
        console.log("Wallet Balance:", (await wallet.getBalance()));
        console.log("Wallet Address:", (await wallet.getAddress()));
        await contract.new_game('0x0000000000000000000000000000000000000000'); /* new random game */
        gameID = (await contract.get_gameid_byaddress(wallet.address)).toString();
        console.log("game creato con gameID " + gameID + " in attesa");
        let addr = await waitForRandomPlayer();
        while (addr != wallet.address)
            addr = await waitForRandomPlayer();
        console.log("Secondo player entrato");
        await contract.make_offer(gameID, 2, 100);
        console.log("Offerta di 100wei in attesa risposta")
        let option, value;
        [addr, option, value] = await waitForOffer();
        while (addr != wallet.address)
            [addr, option, value] = await waitForOffer();
        //asserts(option == 2, "option non corretto");
        console.log("Il player ha declinato di 100wei contro offerta di " + value);
        await contract.make_offer(gameID, 2, 70);
        console.log("declinata e abbaimo controfferto 70 wei, in attesa");
        [addr, option, value] = await waitForOffer();
        while (addr != wallet.address)
            [addr, option, value] = await waitForOffer();
        //asserts(option == 1, "option non corretto");
        console.log("Il player ha accettato, uscita");
        exit(0);
    }

    /* test function player_client */
    if (process.env.DEBUG == '2') {
        console.log("debug Mode: Player");
        console.log("Contract Balance:", (await provider.getBalance(contractAddress)).toString());
        console.log("Wallet Balance:", (await wallet.getBalance()));
        console.log("Wallet Address:", (await wallet.getAddress()));
        await contract.join_random_game();
        let [addr, gameID] = await waitForGameID();
        while (addr != wallet.address)
            [addr, gameID] = await waitForGameID();
        console.log("Game joinato con gameid " + gameID + " in attesa offerta");
        let option, value;
        [addr, option, value] = await waitForOffer();
        while (addr != wallet.address)
            [addr, option, value] = await waitForOffer();
        console.log("Il creator del game offre: " + value + " wei");
        await contract.make_offer(gameID, 2, 50);
        console.log("declinata e abbaimo controfferto 50 wei, in attesa");
        [addr, option, value] = await waitForOffer();
        while (addr != wallet.address)
            [addr, option, value] = await waitForOffer()
        await contract.make_offer(gameID, option, value);
        console.log("Il creator del game offre: " + value + " wei, offerta accettata uscita");
        exit(0);
    }


}

main().catch(console.error);
