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
    uint8 state;         /* 1: all player joined, 2: wait_for_bet, 3: startplaying 4:endturn, 5: endgame */
    uint256 bet_value;   /* bet value in wei */ 
    bool bet_check_creator; 
    bool bet_check_player;
    uint8 code_maker;    /* 1: creator, 2: player*/
    uint8 turns;  
    uint8 guesses_count; 
    
}

/* all struct are declared public for testing purpuses */

contract Lock {
    uint256 public allgameID;     /* all games id come from this coutner */
    address payable public owner; /* owner of the contract */

    event player_joined (address player);
    event random_player_joined (address player);
    event offer_value (address player, uint8 option, uint256 value);

    mapping (uint256 => Game) public games;                   /* list of all the games */
    mapping (address => uint256) public queue_games;          /* for checking if the player already uses a game */ 
    mapping (address => uint256) public random_queue_games;   /* for checking if the player already uses a game */ 
    mapping (address => uint256) public random_player_gameID; /* for letting randomplayer have the gameID */
    address[] public it_random_queue_games;                   /* for iterationg random_queue_games */

    constructor () payable {
        allgameID = 1;
        owner = payable(msg.sender);
    }

    function get_gameid () public returns (uint) {
        return allgameID++;
    }

    function getBalance() public view returns (uint) {
        return address(this).balance;
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
        game.bet_value = 0; 
        game.bet_check_player = false; 
        game.bet_check_creator = false; 
        game.guesses_count = 0; 
        game.turns = 0; 
        game.code_maker = 0; 
        game.bet_check_creator = false; 

        if (game.player == address(0)) {                  /* address(0) if has to wait for others to join in the random queue */
            it_random_queue_games.push(msg.sender);
            random_queue_games[msg.sender] = game.gameID;
        } else {                                          /* the player specified the other player */
            queue_games[msg.sender] = game.gameID;
        }

        games[game.gameID] = game;                        /* dobbiamo aspettare un'altro giocatore */ 
    }

    function get_gameid_byaddress () public view returns (uint256) {
        uint256 id = queue_games[msg.sender];
        if (id != 0) 
            return id;
        id = random_queue_games[msg.sender];
        require(id != 0, "you didn't create any game");
        return random_queue_games[msg.sender];
    }

    function get_gameid_random_player () public view returns (uint256) {
        uint256 id = random_player_gameID[msg.sender];
        require(id != 0, "you aren't in any games");
        return id;
        
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
        random_player_gameID[msg.sender] = current_game_id; /* game id for the player */

        emit random_player_joined(current_game.creator); /* event for the creator that is waiting */
    }

    function make_offer (uint256 gameID, uint8 option, uint256 value) public {
        require(games[gameID].gameID != 0, "gameID isn't correct");
        require(option == 1 || option == 2, "option isn't correct");
        Game memory current_game = games[gameID];
        require (msg.sender == current_game.creator || msg.sender == current_game.player, "you aren't a player of this game");

        if (option == 1) {
            require(value != 0, "value isn't correct");
            current_game.state = 2; /* playing */
            current_game.bet_value = value; /* playing */
            games[gameID] = current_game;
        }

        if (msg.sender == current_game.creator) {
            emit offer_value(current_game.player, option, value);  
        } else {
            emit offer_value(current_game.creator, option, value); 
        }
    }

    //function send() payable public {
    //    //si prendono solo soldi soldi
    //}

    //function withdraw(uint256 amount) public {
    //    require(address(this).balance >= amount, "Saldo del contratto insufficiente");
    //    payable(msg.sender).transfer(amount);
    //}


    function send_wei (uint256 gameID) public payable returns (uint256) {
        require(games[gameID].gameID != 0, "gameID isn't correct");
        uint256 amount_sent = 0;
        Game memory current_game = games[gameID];
        require(msg.sender == current_game.creator || msg.sender == current_game.player,"you aren't part of this game");

        require(msg.value == current_game.bet_value, "please send the correct value");
        require(current_game.state == 2, "the game state is incorrect");

        //(bool success,) = owner.call{value: msg.value}("");
        //require(success, "Failed to send money");

        amount_sent = msg.value;

        if (msg.sender == current_game.creator) {
            current_game.bet_check_creator = true;
        } else {
            current_game.bet_check_player = true;
        }

        games[gameID] = current_game;

        return amount_sent;
    }

    function get_bet_check (uint256 gameID) public view returns (bool) {
        require(games[gameID].gameID != 0, "gameID");

        Game memory current_game = games[gameID];
        require(msg.sender == current_game.creator || msg.sender == current_game.player,"you aren't part of this game");
        require(current_game.state == 2, "the game state is incorrect");
        
        if (msg.sender == current_game.creator) {
            return current_game.bet_check_player;
        } else {
            return current_game.bet_check_creator;
        }
         
    }

    //TODO: test 
    function start_game (uint256 gameID) public view returns (uint) {
        //require(games[gameID].gameID != 0, "gameID"); //TODO: test 
        //Game memory current_game = games[gameID];

        //require(current_game.state == 2, "the game state is incorrect");
        //require(msg.sender == current_game.creator || msg.sender == current_game.player,"you aren't part of this game");

        uint random_value = uint (keccak256(abi.encodePacked (msg.sender, block.timestamp, gameID)));
        return random_value % 2; 
          

        //random_player
        //function setNumber() external {
        //    randNo= uint (keccak256(abi.encodePacked (msg.sender, block.timestamp, randNo)));
        //}
        //function getNumber() external view returns (uint) {
        //    return randNo;
        //} 




         

    }

    //TODO: test
    function afk_checker (uint256 gameID) public returns (uint) {
                 
    }

    //TODO: test
    function end_game () public {
        
    }

}




