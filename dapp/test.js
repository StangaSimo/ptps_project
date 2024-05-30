const { exit } = require('process');
//var readlineSync = require('readline-sync');
const fs = require('fs');
const path = require('path');
const { ethers /* , JsonRpcProvider */ } = require('ethers');
//const { start } = require('repl');

//let address_2_player;
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
provider.pollingInterval = 100;
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(contractAddress, abi, wallet);

async function waitForOffer() {
    return new Promise(async (resolve) => {
        contract.once("offer_value", (address, option, value) => {
            console.log("ADDR" + address);
            resolve([address, option, value]);
        });
    });
}

async function waitForRandomPlayer() {
    return new Promise(async (resolve) => {
        contract.once("random_player_joined", (addr) => {
            resolve(addr);
        });
    });
}

const sleep = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    /* test function creator_client */
    if (process.env.DEBUG == '1') {
        console.log("debug Mode: Creator");
        console.log("Contract Balance:", (await provider.getBalance(contractAddress)).toString());
        console.log("Wallet Balance:", (await wallet.getBalance()));
        console.log("Wallet Address:", (await wallet.getAddress()));
        await contract.new_game('0x0000000000000000000000000000000000000000'); /* new random game */
        let gameID = (await contract.get_gameid_byaddress()).toString();
        console.log("game creato con gameID " + gameID + " in attesa");
        let addr = await waitForRandomPlayer();
        while (addr != wallet.address)
            addr = await waitForRandomPlayer();
        console.log("Secondo player entrato");
        await sleep(100);
        await contract.make_offer(gameID, 2, 100);
        console.log("Offerta di 100wei in attesa risposta")
        let option, value;
        console.log("ADDR DOPO " + addr + "\nwallet address" + wallet.address);
        [addr, option, value] = await waitForOffer();
        while (addr != wallet.address)
            [addr, option, value] = await waitForOffer();
        await sleep(100);
        console.log("Il player ha declinato, contro offerta di " + value);
        await contract.make_offer(gameID, 2, 70);
        console.log("Declinata e abbiamo controfferto 70 wei, in attesa");
        [addr, option, value] = await waitForOffer();
        while (addr != wallet.address)
            [addr, option, value] = await waitForOffer();
        console.log("Il player ha accettato, uscita");

        args = {value: ethers.utils.parseEther("0.00000001")}
        reciept = await contract.send_money(gameID, args);

        let bet_check =  await contract.get_bet_check(gameID);
        while (bet_check != true) {
            console.log("bet : " + bet_check);
            await sleep(1000);
            bet_check =  await contract.get_bet_check(gameID);
        }

        console.log("I pagamenti sono stati effettuati" + reciept);

        exit(0);
    }

    /* test function player_client */
    if (process.env.DEBUG == '2') {
        console.log("debug Mode: Player");
        console.log("Contract Balance:", (await provider.getBalance(contractAddress)).toString());
        console.log("Wallet Balance:", (await wallet.getBalance()));
        console.log("Wallet Address:", (await wallet.getAddress()));
        await contract.join_random_game();
        let gameID = (await contract.get_gameid_random_player()).toString();
        console.log("Game joinato con gameid " + gameID + " in attesa offerta");
        let option, value;
        [addr, option, value] = await waitForOffer();
        while (addr != wallet.address)
            [addr, option, value] = await waitForOffer();
        console.log("Il creator del game offre: " + value + " wei");
        await sleep(100);
        console.log("Declinata e abbiamo controfferto 50 wei, in attesa");
        await contract.make_offer(gameID, 2, 50);
        [addr, option, value] = await waitForOffer();
        while (addr != wallet.address)
            [addr, option, value] = await waitForOffer()
        await sleep(100);
        console.log("Il creator del game offre: " + value + " wei, offerta accettata uscita");
        await contract.make_offer(gameID, 1, value);

        args = {value: ethers.utils.parseEther("0.00000001")}
        reciept = await contract.send_money(gameID, args);

        let bet_check =  await contract.get_bet_check(gameID);
        while (bet_check != true) {
            console.log("bet : " + bet_check);
            await sleep(1000);
            bet_check =  await contract.get_bet_check(gameID);
        }

        console.log("I pagamenti sono stati effettuati" + reciept);

        exit(0);
    }
}

main().catch(console.error);

