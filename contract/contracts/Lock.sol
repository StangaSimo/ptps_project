// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "hardhat/console.sol";

uint constant NT = 2; /* number of turns */
uint constant NG = 3; /* number of guesses */

struct Game {
    uint256 gameID;
    address creator;     /* first player */
    address player;      /* second player */
    uint8 winner;        /* 0: creator, 1: player */
    uint8 state;         /* 1: all player joined, 2: wait_for_bet, 3: wait_for_secret 4:start_playing, 5: endgame */
    uint256 bet_value;   /* bet value in wei */ 
    bool bet_check_creator; 
    bool bet_check_player;
    uint code_maker;    /* 0: creator, 1: player*/
    uint8 nt;  
    uint8 ng;  
    bytes32 secret; /* the hashes of the current secrets */
    string[NG] secrets; /* all the hashes of the secrets */
    string[NG][NT] guesses; /* solidity funziona al contrario */
    string[NG][NT] feedbacks; /* solidity funziona al contrario */
    uint8[2] false_accusation;  /* index 0 for creator, index 1 for player */
    uint8[2] dispute; 
    uint8 last_dispute;  /* 1: error from CM, 2: false accusation from CB */
    uint256[2] points;  /* index 0 for creator, index 1 for player */
    bool[2] last_action;  /* index 0 for creator, index 1 for player */
    
    /* 0 for creator and 1 for player, if one player have more than 1 the game is lost, 
        if the codemaker make more than one error than the game is lost */
}

/* all struct are declared public for testing purpuses */
        
// TODO RIMUVOVERE TUTTI I REQUIRE PER FUNZIONI SOLO VIEW

contract Lock {
    uint256 public allgameID;     /* all games id come from this coutner */
    address payable public owner; /* owner of the contract */

    event player_joined (address player);
    event random_player_joined (address player);
    event offer_value (address player, uint8 option, uint256 value);
    event player_code_maker (address player, uint8 cm);
    event secret_sent (address player); 
    event feed_back (address player, string feedback); 
    event guess_sent (address player, string guess); 
    event stop_the_game_event (uint256 gameID, address winner, address loser);
    event dispute (address addr, uint8 result);
    event afk_check(address addr); 

    mapping (uint256 => Game) public games;                   /* list of all the games */
    mapping (address => uint256) public queue_games;          /* for checking if the player already uses a game */ 
    mapping (address => uint256) public random_queue_games;   /* for checking if the player already uses a game */ 
    mapping (address => uint256) public random_player_gameID; /* for letting randomplayer have the gameID */
    address[] public it_random_queue_games;                   /* for iterationg random_queue_games */

    constructor () payable {
        allgameID = 1;
        owner = payable(msg.sender);
    }

    /* for testing */
    function get_guesses(uint256 gameID) public view returns (string[NG][NT] memory) {
        require(games[gameID].gameID != 0, "gameID");
        return games[gameID].guesses;
    }

    function get_points(uint256 gameID) public view returns (uint256[2] memory) {
        require(games[gameID].gameID != 0, "gameID");
        return games[gameID].points;
    }

    /* for testing */
    function get_feedbacks(uint256 gameID) public view returns (string[NG][NT] memory) {
        require(games[gameID].gameID != 0, "gameID");
        return games[gameID].feedbacks;
    }

    function get_dispute(uint256 gameID) public view returns (uint8[2] memory) {
        require(games[gameID].gameID != 0, "gameID");
        return games[gameID].dispute;
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
        game.state = 0;
        game.player = player; 
        game.bet_value = 0; 
        game.bet_check_player = false; 
        game.bet_check_creator = false; 
        game.nt = 0; 
        game.ng = 0; 
        game.code_maker = 0; 
        game.secret = 0; 
        game.false_accusation[0] = 0;
        game.false_accusation[1] = 0;
        game.dispute[0] = 0;
        game.dispute[1] = 0;
        game.last_dispute = 0;
        game.last_action[0] = false;
        game.last_action[1] = false;

        for (uint32 i=0; i < NT; i++ ){
            game.secrets[i] = " "; 
            for (uint32 j=0; j < NG; j++) {
                game.guesses[i][j] = " ";
                game.feedbacks[i][j] = " ";
            }
        }

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
            current_game.bet_value = value; 
        }

        if (msg.sender == current_game.creator) {
            current_game.last_action[0] = false; 
            emit offer_value(current_game.player, option, value);  
        } else {
            current_game.last_action[1] = false; 
            emit offer_value(current_game.creator, option, value); 
        }
        games[gameID] = current_game;
    }

    function send_wei (uint256 gameID) public payable returns (uint256) {
        require(games[gameID].gameID != 0, "gameID isn't correct");
        uint256 amount_sent = 0;
        Game memory current_game = games[gameID];
        require(msg.sender == current_game.creator || msg.sender == current_game.player,"you aren't part of this game");

        require(msg.value == current_game.bet_value, "please send the correct value");
        require(current_game.state == 2, "the game state is incorrect");
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

    function start_game (uint256 gameID) public  {
        require(games[gameID].gameID != 0, "gameID"); //TODO: test 
        Game memory current_game = games[gameID];

        require(current_game.state == 2, "the game state is incorrect");
        require(msg.sender == current_game.creator || msg.sender == current_game.player,"you aren't part of this game");

        uint random_value = uint (keccak256(abi.encodePacked (msg.sender, block.timestamp, gameID))); /* game id for random number */

        if ((random_value % 2) == 1) { /* creator start as CM, player as CB */
            emit player_code_maker(current_game.player, 1); /* for player */
            current_game.code_maker = 0;                    /* for creator */
        } else {                      /* creator start as CB, player as CM */
            emit player_code_maker(current_game.player, 0);
            current_game.code_maker = 1;
        }

        current_game.state = 3; /* start playing */
        games[gameID] = current_game;
    }

    function get_cm_or_cb (uint256 gameID) public view returns (uint) {
        require(games[gameID].gameID != 0, "gameID");
        Game memory current_game = games[gameID];
        require(msg.sender == current_game.creator,"you aren't the creator of this game");
        return current_game.code_maker;
    }

    function send_secret (uint256 gameID, bytes32 secret) public {
        require(games[gameID].gameID != 0, "gameID");

        Game memory current_game = games[gameID];

        require(msg.sender == current_game.creator || msg.sender == current_game.player,"you aren't part of this game");
      
        current_game.secret = secret;
        current_game.state = 3;
        
        if (msg.sender == current_game.creator) {
            require(current_game.code_maker == 0, "you're not suppose to send the secret"); 
            current_game.last_action[0] = false; 
            games[gameID] = current_game;
            emit secret_sent (current_game.player); 
        } else {
            require(current_game.code_maker == 1, "you're not suppose to send the secret"); 
            current_game.last_action[1] = false; 
            games[gameID] = current_game;
            emit secret_sent (current_game.creator); 
        }
    }

    function send_guess (uint256 gameID, string memory guess) public {
        require(games[gameID].gameID != 0, "gameID");

        Game memory current_game = games[gameID];

        require(msg.sender == current_game.creator || msg.sender == current_game.player,"you aren't part of this game");

        current_game.guesses[current_game.nt][current_game.ng] = guess;

        if (msg.sender == current_game.creator) {
            require(current_game.code_maker == 1, "you're not suppose to send the guess"); 
            current_game.last_action[0] = false; 
            games[gameID] = current_game;
            emit guess_sent (current_game.player, guess);
        } else {
            require(current_game.code_maker == 0, "you're not suppose to send the guess"); 
            current_game.last_action[1] = false; 
            games[gameID] = current_game;
            emit guess_sent (current_game.creator, guess);
        }
    }

    function send_feedback (uint256 gameID, string memory feedback) public {
        require(games[gameID].gameID != 0, "gameID");
        Game memory current_game = games[gameID];
        require(msg.sender == current_game.creator || msg.sender == current_game.player,"you aren't part of this game");
        current_game.feedbacks[current_game.nt][current_game.ng] = feedback;
        current_game.ng++;

        if (msg.sender == current_game.creator) {
            require(current_game.code_maker == 0, "you're not suppose to send the feedback"); 
            current_game.last_action[0] = false; 
            games[gameID] = current_game;
            emit feed_back (current_game.player, feedback);
        } else {
            require(current_game.code_maker == 1, "you're not suppose to send the feedback"); 
            current_game.last_action[1] = false; 
            games[gameID] = current_game;
            emit feed_back (current_game.creator, feedback);
        }   

    }
 
    function send_dispute (uint256 gameID, uint256 guess_number) public returns (uint8) {
        require(games[gameID].gameID != 0, "gameID");
        Game memory current_game = games[gameID];
        require(msg.sender == current_game.creator || msg.sender == current_game.player,"you aren't part of this game");

        /* code maker is reverted becouse of end_turn, so 1 = creator, 0 = player */
        if (msg.sender == current_game.creator) {
            require(current_game.code_maker == 0, "you're not suppose to send the dispute"); 
        } else {
            require(current_game.code_maker == 1, "you're not suppose to send the dispute"); 
        }

        if (guess_number == 0) {
            if (current_game.code_maker == 1) {
                emit dispute(current_game.creator, 0); 
            }
            else {
                emit dispute(current_game.player, 0); 
            }
            return 0;
        }

        bytes memory guess = bytes(current_game.guesses[current_game.nt-1][guess_number-1]);
        bytes memory feedback = bytes(current_game.feedbacks[current_game.nt-1][guess_number-1]);
        bytes memory secret = bytes(current_game.secrets[current_game.nt-1]);
        bytes memory check = bytes("OXo");
        uint8 errors = 0;
        uint8 z = 0;

        for (uint i=0; i<4; i++) 
            if (guess[i] == secret[i]) 
                if (feedback[z] != check[0]) { z++; errors++; } 
                else { z++; }
            else 
                for (uint j=0; j<4; j++) 
                    if (i != j) 
                        if (guess[i] == secret[j]) 
                            if (feedback[z] != check[1]) { z++; errors++; } 
                            else { z++; }

        if (errors >= 2) { /* its lost */
            current_game.last_dispute = 3;
            stop_the_game(gameID, msg.sender);
        } else if (errors == 1) /* one more dispute, at 2 its lost */
            if (msg.sender == current_game.creator) {
                if (current_game.dispute[0] == 1){
                    current_game.last_dispute = 3; /* CB win */
                    stop_the_game(gameID, current_game.player);
                } else {
                    current_game.dispute[0]++;
                    current_game.last_dispute = 1;
                }
            } else {
                if (current_game.dispute[1] == 1) {
                    current_game.last_dispute = 3; /* CB win */
                    stop_the_game(gameID, current_game.creator);
                } else {
                    current_game.dispute[1]++;
                    current_game.last_dispute = 1;
                }
            } else if (errors == 0) { /* 2 false accusation and its lost */
                if (msg.sender == current_game.creator) { 
                    if (current_game.false_accusation[0] == 1) {
                        current_game.last_dispute = 4; /* CM win */
                        stop_the_game(gameID, current_game.player);
                    } else {
                        current_game.false_accusation[0]++;
                        current_game.last_dispute = 2;
                    }
                } else {  
                    if (current_game.false_accusation[1] == 1) {
                        current_game.last_dispute = 4; /* CB win */
                        stop_the_game(gameID, current_game.creator);
                    } else {
                        current_game.false_accusation[1]++;
                        current_game.last_dispute = 2;
                    }
                }
            }

        if (current_game.code_maker == 1) 
            emit dispute(current_game.creator, current_game.last_dispute); 
        else 
            emit dispute(current_game.player, current_game.last_dispute); 

        games[gameID] = current_game;

        return 1; 
    }

    function view_dispute (uint256 gameID) public view returns (uint8) {
        require(games[gameID].gameID != 0, "gameID");
        return games[gameID].last_dispute;
    }

    function end_turn (uint256 gameID, string memory secret) public {
        require(games[gameID].gameID != 0, "gameID");
        Game memory current_game = games[gameID];
        require(msg.sender == current_game.creator || msg.sender == current_game.player,"you aren't part of this game");
        current_game.nt++;
        
        if (msg.sender == current_game.creator) { /* set the code_make for the next turn */
            require(current_game.code_maker == 0, "you're not suppose to end turn"); 
            current_game.code_maker = 1; /* set the player as CM */
        } else { 
            require(current_game.code_maker == 1, "you're not suppose to end turn"); 
            current_game.code_maker = 0; /* set the creator as CM */
        }

        bytes32 hash = keccak256(bytes(secret));

        if (hash != current_game.secret){ /* its lost, the secret has changed */
            if (msg.sender == current_game.creator) 
                stop_the_game(gameID, current_game.player);
            else 
                stop_the_game(gameID, current_game.creator);
        }

        current_game.secrets[current_game.nt-1] = secret;
 
        if (msg.sender == current_game.creator) /* 0 for creator, 1 for player */
                current_game.points[0]  = current_game.points[0] + current_game.ng;
            else 
                current_game.points[1]  = current_game.points[1] + current_game.ng;
        
        current_game.ng = 0;
        current_game.last_dispute = 0;
        games[gameID] = current_game;

        if (current_game.nt == NT) {
            if(current_game.points[0] > current_game.points[1])  /* creator win */
                stop_the_game(gameID, current_game.creator);
            else                                                 /* player win */
                stop_the_game(gameID, current_game.player);           
        }
    }

    function stop_the_game (uint256 gameID, address winner) private {
        require(games[gameID].gameID != 0, "gameID");
        Game memory current_game = games[gameID];
        require(address(this).balance >= (current_game.bet_value * 2), "Saldo del contratto insufficiente");

        payable(winner).transfer(current_game.bet_value * 2);

        if (winner == current_game.creator) {
            current_game.winner = 0;
            emit stop_the_game_event(gameID, current_game.creator, current_game.player); 
        } else { 
            current_game.winner = 1;
            emit stop_the_game_event(gameID, current_game.player, current_game.creator); 
        }

        current_game.state = 5;
        games[gameID] = current_game;
    }

    // 1: all player joined, 2: wait_for_bet, 3: wait_for_secret 4:start_playing, 5: endgame 
    function afk_checker (uint256 gameID) public returns (uint) {
        require(games[gameID].gameID != 0, "gameID");
        Game memory current_game = games[gameID];
        require(msg.sender == current_game.creator || msg.sender == current_game.player,"you aren't part of this game");

        if (msg.sender == current_game.creator) {
            emit afk_check(current_game.player); 
            current_game.last_action[1] = true;
        } else {
            emit afk_check(current_game.creator); 
            current_game.last_action[0] = true;
        }

        games[gameID] = current_game;
    }

    function afk_viewer (uint256 gameID) public {
        require(games[gameID].gameID != 0, "gameID");
        Game memory current_game = games[gameID];
        require(msg.sender == current_game.creator || msg.sender == current_game.player,"you aren't part of this game");

        if (msg.sender == current_game.creator) {
            if(current_game.last_action[1] == true)
                stop_the_game(gameID, current_game.creator);
        } else {
            if(current_game.last_action[0] == true)
                stop_the_game(gameID, current_game.player);
        }

    }

}
