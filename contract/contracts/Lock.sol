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
    event random_player_gameid (address player, uint256 gameID);
    event offer_value (address player, uint8 option, uint256 value);

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

    function get_gameid_byaddress (address creator) public view returns (uint256) {
        uint256 id = queue_games[creator];
        if (id != 0) 
            return id;
        id = random_queue_games[creator];
        require(id != 0, "you didn't create any game");
        return random_queue_games[creator];
    }

    function join_game (uint gameID) public {
        require(queue_games[msg.sender] == 0, "You already created a game");
        require(random_queue_games[msg.sender] == 0, "You already created a game in the random queue");

        Game memory current_game = games[gameID];

        require(current_game.gameID != 0, "The game doesn't exists");
        require(current_game.state == 0, "The game is already started");
        require(current_game.player == msg.sender, "You are not the one that need to join this game");

        current_game.state = 1; 
        queue_games[current_game.creator] = 0;     /* remove the game on the list of queue_games */
        games[gameID] = current_game;              /* solidity perform a copy and not a reference */

        emit player_joined(current_game.creator);  /* event for the creator that is waiting */
    }

    //TODO add test for event gamIDd
    function join_random_game () public {
        require(queue_games[msg.sender] == 0, "You already created a game");
        require(random_queue_games[msg.sender] == 0, "You already created a game in the random queue");
        require(it_random_queue_games.length != 0, "No games avaliable");

        uint index = it_random_queue_games.length -1;
        address creator = it_random_queue_games[index];
        uint256 current_game_id = random_queue_games[creator];
        Game memory current_game = games[current_game_id];

        random_queue_games[creator] = 0;     /* remove the game from the random queue */
        delete it_random_queue_games[index]; /* remove the last element */
        current_game.state = 1;
        current_game.player = msg.sender;
        games[current_game_id] = current_game;

        emit random_player_joined(current_game.creator); /* event for the creator that is waiting */
        emit random_player_gameid(current_game.player, current_game.gameID); /* event for the second player for letting him save the gameID */
    }

    //TODO: test
    function afk_checker (uint256 gameID) public returns (uint) {

    }

    //TODO: test, remove game in player_game
    function end_game () public {

    }

    //TODO: test
    function make_offer (uint256 gameID, uint8 option, uint256 value) public {
        require(games[gameID].gameID != 0, "gameID not correct");
        require(option == 1 || option == 2, "option not correct");
        Game memory current_game = games[gameID];
        require (msg.sender == current_game.creator || msg.sender == current_game.player, "you can't make the first offer");

        if (option == 2) {
            require(value != 0, "value not corret");
            current_game.state = 2; /* playing */
            //TODO: accettata aggiornare
        }

        if (msg.sender == current_game.creator) {
            emit offer_value(current_game.player, option, value);  
        } else {
            emit offer_value(current_game.creator, option, value); 
        }

        
    }
}




