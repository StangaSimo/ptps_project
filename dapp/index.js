
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

var readlineSync = require('readline-sync');
const { exit } = require('process');
const fs = require('fs');
const path = require('path');
const { ethers, JsonRpcProvider } = require('ethers');
const { start } = require('repl');

const abiPath = path.resolve(__dirname, '../contract/artifacts/contracts/Lock.sol/Lock.json');
const contractJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
const abi = contractJson.abi;

const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

let url = "http://127.0.0.1:8545"
const provider = new ethers.providers.JsonRpcProvider(url);

console.log("\n\n");
console.log("1. 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
console.log("2. 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
console.log("3. 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
console.log("4. 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6");
console.log("5. 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a");

console.log("\n\n");

var userChoice = readlineSync.question("Quale Account usare?");
console.log("\n\n");
var privateKey;

switch (userChoice) {
    case '1':
        privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
        break;
    case '2':
        privateKey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
        break;
    case '3':
        privateKey = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';
        break;
    case '4':
        privateKey = '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6';
        break;
    case '5':
        privateKey = '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a';
        break;
    default:
        console.log("Opzione non valida. Riprova.");
        exit(0)
}

const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(contractAddress, abi, wallet);

async function waitForRandomPlayer() {
    return new Promise(async (resolve, reject) => {
        contract.once("random_player_joined", (num) => {
            //console.log(`Function return: ${num}`);
            resolve(num);
        });
    });
}

async function waitForPlayer() {
    return new Promise(async (resolve, reject) => {
        contract.once("player_joined", (num) => {
            //console.log(`Function return: ${num}`);
            resolve(num);
        });
    });
}

async function main() {
    console.log("Contract balance:", (await provider.getBalance(contractAddress)).toString());
    console.log("Wallet balance:", (await wallet.getBalance()));
    console.log("Wallet address:", (await wallet.getAddress()));
    showInitialPrompt();
}

main().catch(console.error);

function showInitialPrompt() {
    console.clear();
    console.log("********************************************");
    console.log("  Benvenuto a Mastermind sulla Blockchain! ");
    console.log("********************************************");
    console.log("\n\n");
    console.log("Scegli un'opzione:");
    console.log("1. Crea un nuovo gioco");
    console.log("2. Unisciti a un gioco specifico (specifica il Game ID)");
    console.log("3. Unisciti a un gioco casuale");
    console.log("\n\n");

    var userChoice = readlineSync.question("Inserisci il numero dell'opzione scelta: ");
    console.clear();
    switch (userChoice) {
        case '1':
            newGame();
            break;
        case '2':
            var gameId = userChoice.question("Inserisci il Game ID: ");
            joinGame(gameId);
            break;
        case '3':
            joinRandomGame();
            break;
        default:
            console.log("Opzione non valida. Riprova.");
            showInitialPrompt(); 
            break;
    }
}

async function newGame() {
    console.log("1. random secondo player");
    console.log("2. specifica indirizzo secondo player");
    console.log("\n\n");

    var userChoice = readlineSync.question("Inserisci il numero dell'opzione scelta: ");

    switch (userChoice) {
        case '1':
            await contract.new_game('0x0000000000000000000000000000000000000000');
            break;
        case '2':
            console.log("\n\n");
            const gameId = readlineSync.question("Inserisci l'address: ");
            await contract.new_game(gameId.toString());
            break;
        default:
            console.log("Opzione non valida. Riprova.");
            newGame();
    }

    let gameid = (await contract.get_gameid_byaddress(wallet.address)).toString();

    console.clear();
    console.log("gameID : " + gameid + "\n\n");

    console.log(`In attesa del secondo player`);
    console.log("\n\n");

    if (userChoice == 1) {
        let addr = await waitForRandomPlayer();
        while (addr != wallet.address)
            addr = await waitForRandomPlayer();
    } else {
        let addr = await waitForPlayer();
        while (addr != wallet.address)
            addr = await waitForPlayer();
    }

    console.log("Secondo Player entrato");
    startGame();
}

async function joinGame (gameid) {

    try {
        await contract.join_game(gameid);
    } catch (e) {
        console.log("Errore ID");
        exit(0)
    }

    startGame();
}

async function joinRandomGame() {
    try {
        await contract.join_random_game();
    } catch (e) {
        console.log("Nessun game disponibile");
        exit(0)
    }
    startGame();
}

async function startGame() {

}