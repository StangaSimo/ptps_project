
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
    
 
const { exit } = require('process');

const fs = require('fs');
const path = require('path');
const { ethers, JsonRpcProvider } = require('ethers');
const { start } = require('repl');
let address_2_player;
const readline = require('readline');
let wallet, contract;
let gameID = 0;
async function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

process.on('SIGTSTP', async () => {
    await contract.afk_checker(gameID);
    await sleep(3000);
    console.log("ho dormito tre secondi");
});

const abiPath = path.resolve(__dirname, '../contract/artifacts/contracts/Lock.sol/Lock.json');

/* provider.getBalance is broken in etherjs with test network */

const contractJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
const abi = contractJson.abi;
const contractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
let url = "http://127.0.0.1:8545"
const provider = new ethers.providers.JsonRpcProvider(url);

async function main() {

 
    console.log("\n\n");
    console.log("1. 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
    console.log("2. 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
    console.log("3. 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
    console.log("4. 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6");
    console.log("5. 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a");
    console.log("\n\n");

    var userChoice = await askQuestion("Quale Account usare?");;
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

    wallet = new ethers.Wallet(privateKey, provider);
    contract = new ethers.Contract(contractAddress, abi, wallet);

    console.log("Contract Balance:", (await provider.getBalance(contractAddress)).toString());
    console.log("Wallet Balance:", (await wallet.getBalance()));
    console.log("Wallet Address:", (await wallet.getAddress()));

    await showInitialPrompt();
}

main().catch(console.error);

async function showInitialPrompt() {
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

    var userChoice = await askQuestion("Inserisci il numero dell'opzione scelta: ");
    console.clear();
    switch (userChoice) {
        case '1':
            newGame();
            break;
        case '2':
            gameID = await askQuestion("Inserisci il Game ID: ");
            joinGame(gameID);
            break;
        case '3':
            joinGame(0);
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

    var userChoice = await askQuestion("Inserisci il numero dell'opzione scelta: ");

    switch (userChoice) {
        case '1':
            await contract.new_game('0x0000000000000000000000000000000000000000');
            break;
        case '2':
            console.log("\n\n");
            address_2_player = await askQuestion("Inserisci l'address: ");
            await contract.new_game(address_2_player.toString());
            break;
        default:
            console.log("Opzione non valida. Riprova.");
            await newGame();
    }

    gameID = (await contract.get_gameid_byaddress()).toString();

    console.clear();
    console.log("gameID : " + gameID);
    console.log("\n\n");
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

    await startNewGame();
}

async function joinGame(id) {
    if (id == 0) {
        try {
            await contract.join_random_game();
            gameID = (await contract.get_gameid_random_player()).toString();
            await startGame();
        } catch (e) {
            console.log("Nessun game disponibile");
            exit(0)
        }
    } else {
        try {
            gameID = id;
            await contract.join_game(gameID);
            await startNewGame();
        } catch (e) {
            console.log("Errore ID");
            exit(0)
        }
    }
}

function afk_handler (id, addr) {
    if (addr == wallet.address) {
        console.log(wallet.address);
    }
}

async function startNewGame() {

    contract.on("afk_check", afk_handler);

    console.clear();
    console.log("Secondo player entrato\n\n");
    console.log("In qualsiasi momento puoi premere crtl-z per accusare l'altro player di AFK, questo ha 5 secondi per rispondere.\n\n");
    value = await askQuestion("Quanto vuoi scommettere? ");
    await contract.make_offer(gameID, 2, value); //2 for let second player go in the while

    console.log("\n\n");
    console.log("In attesa della risposta del secondo player...\n");
    console.log("\n\n");

    [addr, option, value] = await waitForOffer();
    while (addr != wallet.address) 
        [addr, option, value] = await waitForOffer();

    while (option != 1) { //declined
        console.log("Il Secondo player ha declinato l'offerta, offre a sua volta: " + value + " wei");
        console.log("\n\n");
        console.log("Scegli un'opzione:");
        console.log("1. Accettare");
        console.log("2. Contro Offerta");
        console.log("\n\n");

        option = await askQuestion("Inserisci il numero dell'opzione scelta: ");
        switch (option) {
            case '1': //accepted
                await contract.make_offer(gameID, option, value); 
                break;
            case '2': //declined
                var value = await askQuestion("Quanto vuoi offire? ");
                await contract.make_offer(gameID, option, value);
                [addr, option, value] = await waitForOffer();
                while (addr != wallet.address)
                    [addr, option, value] = await waitForOffer();
                break;
            default:
                console.log("Opzione non valida. Riprova.");
        }
    }

    await sendMoney(value);
    await startPlaying(1);
    exit(0);
}

async function startGame() {

    contract.on("afk_check", afk_handler);
    console.log("In qualsiasi momento puoi premere crtl-z per accusare l'altro player di AFK, questo ha 5 secondi per rispondere.");
    console.log("\n\n");
    console.log("GameID " + gameID + "\n\nIn attesa dell'offerta del creator...");

    [addr, option, value] = await waitForOffer();
    while (addr != wallet.address) 
        [addr, option, value] = await waitForOffer();


    while (option != 1) {
        console.log("\n\n");
        console.log("Il creator del game offre: " + value + " wei");
        console.log("\n\n");
        console.log("Scegli un'opzione:");
        console.log("1. Accettare");
        console.log("2. Contro Offerta");
        console.log("\n\n");

        option = await askQuestion("Inserisci il numero dell'opzione scelta: ");

        switch (option) {
            case '1': //accepted
                await contract.make_offer(gameID, option, value);
                break;
            case '2': //declined
                var value = await askQuestion("Quanto vuoi offire? ");
                await contract.make_offer(gameID, option, value);
                [addr, option, value] = await waitForOffer();
                while (addr != wallet.address)
                    [addr, option, value] = await waitForOffer();
                break;
            default:
                console.log("Opzione non valida. Riprova.");
        }

    }

    await sendMoney(value);
    await startPlaying(0);
    exit(0);
}

async function sendMoney(value) {
    const args = {value: value.toString()}
    const transaction = await contract.send_wei(gameID, args);
    await transaction.wait();

    let bet_check =  await contract.get_bet_check(gameID);
    while (bet_check != true) {
        await sleep(1000);
        bet_check =  await contract.get_bet_check(gameID);
    }

    console.log("Entrambi i player hanno depositato la scommessa");
}

const sleep = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

async function startPlaying(creator) {

    contract.on("stop_the_game_event", (id, winner, loser) => {
        if (id == gameID) {
            if (winner == wallet.address)  {
                console.log("game vinto"); 
            }
            if (loser == wallet.address)  {
                console.log("game perso"); 
            }
        }
        exit(0);
    }
    );

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

        if (cm_or_cb == 0) {  
            console.log("Sei il CodeMaker\n ");
            console.log("Quale combinazione vuoi fare? \nb = blue\ng = green\no = orange\nv = violet\nr = red\ny = yellow\n\n");

            let secret = await askQuestion("Input: ");

            while (!validateGuess(secret)) 
                secret = await askQuestion("Input errato, riprovare: ");

            let hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(secret));

            await contract.send_secret(gameID, hash);

            let i = 0;
            while (i < 3) {

                console.log("In attesa della guess...\n\n");

                [addr, guess] = await waitForGuess();
                while (addr != wallet.address)
                    [addr, guess] = await waitForGuess();

                console.log("---- CB GUESS NUMBER " + (i+1) + " : "  + guess + "\n");
                console.log("\nIl segreto scelto: " + secret + "\nScrivi il feedback: \n\nO = Colore e Posizione corretta\nX = Colore corretto e posizione non corretta\no = sbagliato\n\n");

                let feedback = await askQuestion("Input: ");

                while (!validateFeedback(feedback)) 
                    feedback = await askQuestion("Input errato, riprovare: ");

                await contract.send_feedback(gameID, feedback);

                if (feedback == "OOOO")  /* turno finito */
                    break;
                i++;
            }

            console.log("Hai guadagnato " + (i) + " punti");
            i = 0;

            cm_or_cb = 1;
            
            await contract.end_turn(gameID, secret);

            console.log("Il CB ha 10 secondi per avviare una disputa, in attesa...");

            [addr, dispute] = await waitForDispute();
            while (addr != wallet.address)
                [addr, dispute] = await waitForDispute();

            if (dispute == 0){
                console.log("Nessuna disputa avviata\n");
            } else if (dispute == 1){
                console.log ("Hai effettuato un errore, al prossimo sarai punito");
            } else if (dispute == 2) {
                console.log ("Il CB ha effettuato una falsa accusa, alla prossima sarà punito");
            }

        } else { /* 0 = CB */

            console.log("Sei il CodeBreaker, in attesa del segreto...\n");

            [addr] = await waitForSecret();
            while (addr != wallet.address)
                [addr] = await waitForSecret();

            console.log("Il CodeMaker ha depositato il segreto\n");

            for (let i=0; i<3 /* TODO: NT */; i++) {
                console.log("---- GUESS NUMBER " + (i+1));
                console.log("Quale combinazione vuoi fare? \nb = blue\ng = green\no = orange\nv = violet\nr = red\ny = yellow\n\n");

                let guess = await askQuestion("Input: ");

                while (!validateGuess(guess)) 
                    guess = await askQuestion("Input errato, riprovare: ");
                
                await contract.send_guess(gameID, guess);
                console.log("In attesa del feedback...\n\n");

                [addr, feedback] = await waitForFeedBack();
                while (addr != wallet.address)
                    [addr, feedback] = await waitForFeedBack();

                console.log("Feedback: " + feedback + "\n");

                if (feedback == "OOOO") { /* turno finito */
                    console.log("Hai indovinato in " + (i+1) + " mosse");
                    break;
                }
            }

            console.log("Turno finito\n ");

            let dispute = await askQuestionWithTimeout("Hai 10 secondi per avviare una disputa y/n: ", 10000);

            if (dispute === null) {
                console.log("Tempo scaduto, nessuna disputa avviata.");
                await contract.send_dispute(gameID, 0);
            } else {
                if (dispute === 'y') {
                    console.log("Hai scelto di avviare una disputa.");
                    console.log("Su quale guess?");
                    let number_guess = await askQuestion("Inserisci il numero: ");

                    while (!validateNumber(number_guess)) 
                        number_guess = await askQuestion("Input errato, riprovare: ");

                    await contract.send_dispute(gameID, number_guess);

                    let result = await contract.view_dispute(gameID);

                    console.log("risultato disputa " + result);

                    if (result == 1){
                        console.log ("Il CM ha effettuato un errore, al prossimo sarà punito");
                    } else if (result == 2) {
                        console.log ("Hai effettuato una falsa accusa alla prossima sarai punito");

                    } else if (result == 3) { /* for some reason, contract.on inside this function doesn't work */
                        console.log ("game vinto ");
                        exit(0);
                    } else if (result == 4) {
                        console.log ("game perso ");
                        exit(0);
                    }
                } else {
                    await contract.send_dispute(gameID, 0);
                    console.log("Hai scelto di non avviare una disputa.");
                }
            }
            cm_or_cb = 0;
        }
        turni++;
    }
}

function validateGuess(input) {
    if (input.length !== 4) {
        return false;
    }
    const validChars = /^[bgovry]+$/;

    return validChars.test(input);
}

function validateNumber(input) {
    if (input.length !== 1) {
        return false;
    }
    const validChars = /^[1-3]$/;
    return validChars.test(input);
}

function validateFeedback(input) {
    if (input.length !== 4) {
        return false;
    }
    const validChars = /^[OXo]+$/;
    return validChars.test(input);
}


async function waitForOffer() {
    return new Promise(async (resolve) => {
        contract.once("offer_value", (addr, option, value) => {
            resolve([addr, option, value]);
        });
    });
}

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

async function waitForDispute() {
    return new Promise(async (resolve) => {
        contract.once("dispute", (address, dispute) => {
            resolve([address, dispute]);
        });
    });
}

function askQuestionWithTimeout(question, timeout) {
    return new Promise((resolve, reject) => {
        const ru = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const timer = setTimeout(() => {
            ru.close();
            resolve(null);
        }, timeout);

        ru.question(question, (answer) => {
            clearTimeout(timer);
            ru.close();
            resolve(answer);
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

async function waitForRandomPlayer() {
    return new Promise(async (resolve) => {
        contract.once("random_player_joined", (addr) => {
            resolve(addr);
        });
    });
}

async function waitForPlayer() {
    return new Promise(async (resolve) => {
        contract.once("player_joined", (addr) => {
            resolve(addr);
        });
    });
}


