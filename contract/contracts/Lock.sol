// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "hardhat/console.sol";

uint constant NT = 3; /* number of turns */
uint constant NG = 6; /* number of guesses */

struct Game {
    uint256 gameID;
    address creator /* first player */;
    address player /* second player */;
    bytes32[NT] secrets /* all the hashes of the secrets */;
    uint8 state /* 1: appena creato, 2: playing, 3: endturn, 4: endgame */;
}

contract Lock {
    uint256 private gameID; /* all games id come from this coutner */
    address payable public owner; /* owner of the contract */

    mapping (uint256 => Game) games;

    event Withdrawal(uint amount, uint when);
    event new_game_event(uint gameid);

    constructor() payable {
        gameID = 0;
        owner = payable(msg.sender);
    }

    function withdraw() public {
        require(msg.sender == owner, "You aren't the owner");
        emit Withdrawal(address(this).balance, block.timestamp);
        owner.transfer(address(this).balance);
    }

    //TODO: add test
    function get_gameid() private returns (uint) {
        return gameID++;
    }

    //TODO: add test
    function new_game() public returns (uint) {
        // TODO: maybe check giocatore online in un'altra partita
        Game memory game;
        game.gameID = get_gameid();
        game.creator = msg.sender;
        game.player = address(0); /* null inizialization */
        for (uint32 i = 0; i < NT; i++) game.secrets[i] = 0;
        game.state = 0;
        games[game.gameID] = game;
        console.log("creato %o", game.gameID);
        emit new_game_event(game.gameID);
        return game.gameID;
    }

    //TODO: add test
    function join_game(uint gameid) public returns (uint) {
        Game memory current_game = games[gameID];
        require(current_game.gameID == gameid, "You aren't the owner");
        return 0;
    }

    function test() public pure returns (uint) {
        //if (games[gameid].state == 1) {
        //    console.log("esiste");
        //} else {
        //    console.log("non esiste");
        //}
        return 100;
    }

    //TODO
    function afk_checker(uint gameid) public returns (uint) {
   
    }
}
