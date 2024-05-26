// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "hardhat/console.sol";

uint constant NT = 3; /* number of turns */
uint constant NG = 6; /* number of guesses */

struct Game {
    uint256 gameID;
    address creator;     /* first player */
    address player;      /* second player */
    bytes32[NT] secrets; /* all the hashes of the secrets */
    uint8 state;         /* 1: all player joined, 2: playing, 3: endturn, 4: endgame */
}

/* all struct are declared public for testing purpuses */

contract Lock {
    uint256 public allgameID;     /* all games id come from this coutner */
    address payable public owner; /* owner of the contract */

    event player_joined (address player);
    event random_player_joined (address player);

    mapping (uint256 => Game) public games;                 /* list of all the games */
    mapping (address => uint256) public queue_games;        /* for checking if the player already uses a game */ 
    mapping (address => uint256) public random_queue_games; /* for checking if the player already uses a game */ 
    address[] public it_random_queue_games;                 /* for iterationg random_queue_games */

    constructor () payable {
        allgameID = 1; /* 0 is for test if a game exists*/
        owner = payable(msg.sender);
    }

    function get_gameid () public returns (uint) {
        return allgameID++;
    }

    function new_game (address player) public {
        require(queue_games[msg.sender] == 0, "You already created a game");
        require(random_queue_games[msg.sender] == 0, "You already created a random joined game");

        /* inizialize game */
        Game memory game;
        game.gameID = get_gameid();
        game.creator = msg.sender;
        for (uint32 i = 0; i < NT; i++) game.secrets[i] = 0;
        game.state = 0;
        game.player = player; 

        if (game.player == address(0)) {                  /* address(0) if has to wait for others to join in the random queue */
            it_random_queue_games.push(msg.sender);
            random_queue_games[msg.sender] = game.gameID;
        } else {                                          /* the player specified the other player */
            queue_games[msg.sender] = game.gameID;
        }

        games[game.gameID] = game;                        /* dobbiamo aspettare un'altro giocatore */ 
    }

    //TODO: test
    function get_gameid_byaddress (address creator) public view returns (uint256) {
        return queue_games[creator];
    }

    //TODO: add test
    function join_game (uint gameid) public {
        require(queue_games[msg.sender] == 0, "You already created a game");
        require(random_queue_games[msg.sender] == 0, "You already created a game in the random");

        Game memory current_game = games[gameid];
        require(current_game.state == 0, "The game is already started");
        require(current_game.creator != msg.sender, "You are the creator owner");
        require(current_game.player == msg.sender, "You are not the one that need to join this game");
        current_game.state = 1; 
        queue_games[current_game.creator] = 0;     /* remove the game on the list of queue_games */
        games[gameid] = current_game;              /* solidity perform a copy and not a reference */

        emit player_joined(current_game.creator);  /* event for the creator that is waiting */
    }

    //TODO: test
    function join_random_game () public {
        require(queue_games[msg.sender] != 0, "You already created a game");
        require(random_queue_games[msg.sender] != 0, "You already created a game");
        require(it_random_queue_games.length != 0, "No games avaliable");

        uint index = it_random_queue_games.length -1;
        address creator = it_random_queue_games[index];
        uint256 current_game_id = random_queue_games[creator];
        Game memory current_game = games[current_game_id];
        random_queue_games[creator] = 0;     /* remove the game from the random queue */
        delete it_random_queue_games[index]; /* remove the last element */
        current_game.state = 1;
        games[current_game_id] = current_game;

        emit random_player_joined(current_game.creator); /* event for the creator that is waiting */
    }

    //TODO: test
    function afk_checker (uint gameid) public returns (uint) {
        //prova new pc
        
    }

    //TODO: test, remove game in player_game
    function join_random () public {

    }

    //TODO: test, remove game in player_game
    function end_game () public {

    }
      
    function start_game () public {

    }
}
