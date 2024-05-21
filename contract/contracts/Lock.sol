// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "hardhat/console.sol";

uint constant NT = 3; /* number of turns */
uint constant NG = 6; /* number of guesses */

struct Game {
    uint gameID;
    address creator /* first player */;
    address player /* second player */;
    bytes32[NT] secrets /* all the hashes of the secrets */;
    string state /* N: appena creato TODO: legenda */;
}

contract Lock {
    uint private gameID; /* all games id come from this coutner */
    address payable public owner; /* owner of the contract */

    Game[] public games; /* all stored games */
    Game[] private online_games; /* all currently playing games */

    event Withdrawal(uint amount, uint when);

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
        // TODO: check giocatore online in un'altra partita

        Game memory game;
        game.gameID = get_gameid();
        game.creator = msg.sender;
        game.player = address(0); /* null inizialization */
        for (uint32 i = 0; i < NT; i++) game.secrets[i] = 0;
        game.state = "N";
        online_games.push(game);
        return game.gameID;

    }

    function join_game(uint gameid) public returns (uint) {
        
    }

    function afk_checker(uint gameid) public returns (uint) {
   
    }
}
