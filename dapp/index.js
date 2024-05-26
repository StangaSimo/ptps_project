
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

var readlineSync = require('readline-sync');


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
    //const contract = new ethers.Contract(contractAddress, abi, wallet);
    //console.log("Contract balance:", (await provider.getBalance(contractAddress)).toString());
    //await contract.('0x0000000000000000000000000000000000000000');
    //console.log("Game ID:", (await contract.get_gameid_byaddress(wallet.address)).toString());

    const contract = new ethers.Contract(contractAddress, abi, wallet);
    console.log("Contract balance:", (await provider.getBalance(contractAddress)).toString());
    var id = readlineSync.question('cosa si chiede?');
    await contract.prova(id);


}

main().catch(console.error);


function showInitialPrompt() {
  console.log("Benvenuto a Mastermind sulla Blockchain!");
  console.log("Scegli un'opzione:");
  console.log("1. Crea un nuovo gioco");
  console.log("2. Unisciti a un gioco specifico (specifica il Game ID)");
  console.log("3. Unisciti a un gioco casuale");

  rl.question("Inserisci il numero dell'opzione scelta: ", (userChoice) => {
    // Gestisci le opzioni con uno switch
    switch (userChoice) {
      case '1':
        createNewGame();
        break;
      case '2':
        rl.question("Inserisci il Game ID: ", (gameId) => {
          joinSpecificGame(gameId);
        });
        break;
      case '3':
        joinRandomGame();
        break;
      default:
        console.log("Opzione non valida. Riprova.");
        showInitialPrompt(); // Riproponi il prompt se l'opzione non è valida
        break;
    }
  });
}