
/********************************************+ new */
/* AFK */
import process from "process";

function sideEffects() {
  console.log("triggering downstream work of child");
}

/* CTRL - Z */
process.on("SIGTSTP", () => sideEffects);


//TODO: in ascolto per evento perditAAA

/********************************************+ end new */


const { exit } = require('process');
const fs = require('fs');
const path = require('path');
const { ethers /* , JsonRpcProvider */ } = require('ethers');

const abiPath = path.resolve(__dirname, '../contract/artifacts/contracts/Lock.sol/Lock.json');
const contractJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
const abi = contractJson.abi;
const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
let url = "http://127.0.0.1:8545"
let privateKey;
var readlineSync = require('readline-sync');

if (process.env.DEBUG == '1') 
        privateKey = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';

    //privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

if (process.env.DEBUG == '2') 
        privateKey = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

const provider = new ethers.providers.JsonRpcProvider(url);
provider.pollingInterval = 100;
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(contractAddress, abi, wallet);

async function waitForOffer() {
    return new Promise(async (resolve) => {
        contract.once("offer_value", (address, option, value) => {
            resolve([address, option, value]);
        });
    });
}

/********************************************+ new */
async function waitForSecret() {
    return new Promise(async (resolve) => {
        contract.once("secret_sent", (address) => {
            resolve([address]);
        });
    });
}

async function waitForGuess() {
    return new Promise(async (resolve) => {
        contract.once("guess_sent", (address, guess) => {
            resolve([address, guess]);
        });
    });
}

async function waitForEndTurn() {
    return new Promise(async (resolve) => {
        contract.once("end_turn", (address, secret) => {
            resolve([address, secret]);
        });
    });
}



async function waitForFeedBack() {
    return new Promise(async (resolve) => {
        contract.once("feed_back", (address, feedback) => {
            resolve([address, feedback]);
        });
    });
}
/********************************************+ end new */

async function waitForRandomPlayer() {
    return new Promise(async (resolve) => {
        contract.once("random_player_joined", (addr) => {
            resolve(addr);
        });
    });
}

async function waitForPlayerCodeMaker() {
    return new Promise(async (resolve) => {
        contract.once("player_code_maker", (player, cm_or_cb) => {
            resolve([player, cm_or_cb]);
        });
    });
}

const sleep = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

async function startPlaying(gameID, creator) {
    console.log("Game iniziato");
    let cm_or_cb;

    if (creator) {

        await sleep(300);
        await contract.start_game(gameID); 
        cm_or_cb = await contract.get_cm_or_cb(gameID); 

    } else {

        [addr, cm_or_cb] = await waitForPlayerCodeMaker();
        while (addr != wallet.address)
            [addr, cm_or_cb] = await waitForPlayerCodeMaker();
    }

    turni = 0;
    while (turni < 2 /*TODO: NT */) {

        if (cm_or_cb == 1) { /* 1 = CM, 0 = CB */
            console.log("Sei il CodeMaker\n ");
            console.log("Quale combinazione vuoi fare? \nb = blue\ng = green\no = orange\nv = violet\nr = red\ny = yellow\n\n");

            let secret = readlineSync.question("Input: ");

            while (!validateGuess(secret)) 
                secret = readlineSync.question("Input errato, riprovare: ");

            let hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(secret));

            await contract.send_secret(gameID, hash);

            for (let i=0; i<3 /*TODO:NT*/; i++) {

                [addr, guess] = await waitForGuess();
                while (addr != wallet.address)
                    [addr, guess] = await waitForGuess();
                
                console.log("Guess: " + guess);
                console.log("\n\nScrivi il feedback: \n\nO = Colore e Posizione corretta\nX = Colore corretto e posizione non corretta\no = sbagliato\n\n");

                let feedback = readlineSync.question("Input: ");

                while (!validateFeedback(feedback)) 
                    feedback = readlineSync.question("Input errato, riprovare: ");

                await contract.send_feedback(gameID, feedback);
            }

            cm_or_cb = 0;
            
            await contract.end_turn(gameID, secret);

            //wait tempo disputa

        } else {

            console.log("Sei il CodeBreaker, in attesa del segreto...\n");

            [addr] = await waitForSecret();
            while (addr != wallet.address)
                [addr] = await waitForSecret();

            console.log("Il CodeMaker ha depositato il segreto\n");

            for (let i=0; i<3; i++) {
                console.log("Quale combinazione vuoi fare? \nb = blue\ng = green\no = orange\nv = violet\nr = red\ny = yellow\n\n");

                let guess = readlineSync.question("Input: ");

                while (!validateGuess(guess)) 
                    guess = readlineSync.question("Input errato, riprovare: ");
                
                await contract.send_guess(gameID, guess);

                [addr, feedback] = await waitForFeedBack();
                while (addr != wallet.address)
                    [addr, feedback] = await waitForFeedBack();

                console.log("Feedback: " + feedback);
            }

            //TODO wait for end turn
            console.log("Turno finito\n ");
            console.log("Avviare una Disputa?\n ");
            let check = readlineSync.question("y/n: ");
            if (check == "y") {
                console.log("Su quale guess?");
                let number_guess = readlineSync.question("Inserisci il numero: ");
                await contract.send_dispute(gameID, number_guess);
            }

            cm_or_cb = 1;
        }

        turni++;
        //end turn
    }
    
    console.log("esco\n");
}

function validateGuess(input) {
    if (input.length !== 4) {
        return false;
    }
    const validChars = /^[bgovry]+$/;

    return validChars.test(input);
}

function validateFeedback(input) {
    if (input.length !== 4) {
        return false;
    }
    const validChars = /^[OXo]+$/;
    return validChars.test(input);
}
/********************************************+ end new */

async function main() {
    /* test function creator_client */
    if (process.env.DEBUG == '1') {
        console.log("debug Mode: Creator");
        await initial_setup(provider, wallet, ethers);
        initial_balance = await wallet.getBalance();
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
        [addr, option, value] = await waitForOffer();
        while (addr != wallet.address)
            [addr, option, value] = await waitForOffer();
        await sleep(100);
        console.log("Il player ha declinato, contro offerta di " + value);
        await contract.make_offer(gameID, 2, 20);
        console.log("Declinata e abbiamo controfferto 2000 wei, in attesa");
        [addr, option, value] = await waitForOffer();
        while (addr != wallet.address)
            [addr, option, value] = await waitForOffer();
        console.log("Il player ha accettato l'offerta di " + value.toString() + " wei");
        args = {value: value.toString()}
        const transaction = await contract.send_wei(gameID, args); 
        const receipt = await transaction.wait();
        console.log("\n\nTransaction mined:"/* , receipt*/);
        let bet_check =  await contract.get_bet_check(gameID);
        while (bet_check != true) {
            await sleep(1000);
            bet_check =  await contract.get_bet_check(gameID);
        }
        console.log("I pagamenti sono stati effettuati");
        await end_debug(provider, wallet, ethers, initial_balance);

        await startPlaying(gameID, 1);
        exit(0);
    }

    /* test function player_client */
    if (process.env.DEBUG == '2') {
        console.log("debug Mode: Player");
        await initial_setup(provider, wallet, ethers);
        initial_balance = await wallet.getBalance();
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
        console.log("Il creator del game offre: " + value.toString() + " wei, offerta accettata uscita");
        await contract.make_offer(gameID, 1, value);
        args = {value: value.toString()}
        const transaction = await contract.send_wei(gameID, args);
        const receipt = await transaction.wait();
        console.log("\n\nTransaction mined"/* receipt */);
        let bet_check =  await contract.get_bet_check(gameID);
        while (bet_check != true) {
            await sleep(1000);
            bet_check =  await contract.get_bet_check(gameID);
        }
        console.log("I pagamenti sono stati effettuati");
        await end_debug(provider, wallet, ethers, initial_balance);
        
        await startPlaying(gameID, 0);
        exit(0);
    }
}

main().catch(console.error);


/* address balance is broken in etherjs */

async function  initial_setup(provider, wallet, ethers) {
    const contract_balance = await provider.getBalance(contractAddress);
    console.log("Contract balance:" + contract_balance);
    wallet_balance = await wallet.getBalance();
    wallet_balance_gwei = ethers.utils.formatUnits(wallet_balance, 'gwei');
    wallet_balance_eth = ethers.utils.formatUnits(wallet_balance, 'ether');
    console.log("Wallet Balance:" + wallet_balance + " wei");
    console.log("Wallet Balance:" + wallet_balance_gwei + " gwei");
    console.log("Wallet Balance:" + wallet_balance_eth + " eth");
    console.log("Wallet Address:", (await wallet.getAddress()) );
}

async function end_debug(provider, wallet, ethers, initial_balance) {
    contract_balance = await provider.getBalance(contractAddress);
    console.log("Contract Balance:" + contract_balance + "wei");
    wallet_balance = await wallet.getBalance();
    wallet_balance_gwei = ethers.utils.formatUnits(wallet_balance, 'gwei');
    wallet_balance_eth = ethers.utils.formatUnits(wallet_balance, 'ether');
    console.log("Wallet Balance:" + wallet_balance + " wei");
    console.log("Wallet Balance:" + wallet_balance_gwei + " gwei");
    console.log("Wallet Balance:" + wallet_balance_eth + " eth");
    console.log("Sono stati spesi " + (initial_balance - wallet_balance) + " wei"); 
}
