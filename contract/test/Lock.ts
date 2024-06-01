import {
    //  time,
    loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
//import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

describe("Lock", function () {

    async function deploy() {
        const [owner, otherAccount, extraAccount] = await hre.ethers.getSigners();
        const Amount = 100_000_000;
        const addr_0 = '0x0000000000000000000000000000000000000000';
        const Lock = await hre.ethers.getContractFactory("Lock");
        const lock = await Lock.deploy({ value: Amount });
        return { lock, Amount, owner, otherAccount, addr_0, extraAccount};
    }

    describe("Deploy", function () {

        it("Should set the right owner", async function () {
            const { lock, owner } = await loadFixture(deploy);

            expect(await lock.owner()).to.equal(owner.address);
        });

        it("Should receive and store the funds to lock", async function () {
            const { lock, Amount } = await loadFixture(deploy);

            expect(await hre.ethers.provider.getBalance(lock.target)).to.equal(Amount);
        });

        it("Should set gameID to 1", async function () {
            const { lock } = await loadFixture(deploy);

            expect(await lock.allgameID()).to.equal(1);
        });
    });

    describe("get_game_id", function () {

        it("Should update allgameID each time", async function () {
            const {lock , otherAccount} = await loadFixture(deploy);
            await lock.connect(otherAccount).get_gameid();
            await lock.connect(otherAccount).get_gameid();
            await lock.connect(otherAccount).get_gameid();
            expect(await lock.connect(otherAccount).allgameID()).to.equal(4);
        });

        it("Should update allgameID if new_game is called", async function () {
            const {lock, addr_0} = await loadFixture(deploy);
            await lock.new_game(addr_0); 
            expect(await lock.allgameID()).to.equal(2);
        });
    });

    describe("new_game", function () {

        it("Should keep the same user to create more than one game", async function () {
            const {lock, otherAccount, addr_0} = await loadFixture(deploy);
            await lock.new_game(otherAccount.address);
            await expect(lock.new_game(addr_0)).to.be.revertedWith("You already created a game");
        });

        it("Should keep the same user to create more than one game, but random one ", async function () {
            const {lock, addr_0} = await loadFixture(deploy);
            await lock.new_game(addr_0);
            await expect(lock.new_game(addr_0)).to.be.revertedWith("You already created a random joined game");
        });

        it("Should inizialize a game with right values", async function () {
            const {lock, owner, otherAccount} = await loadFixture(deploy);
            await lock.new_game(otherAccount.address);
            const game = lock.games(1);
            expect((await game).player).to.equal(otherAccount.address);
            expect((await game).creator).to.equal(owner.address);
            expect((await game).state).to.equal(0);
            expect((await game).bet_value).to.equal(0);
            expect((await game).bet_check_player).to.equal(false);
            expect((await game).bet_check_creator).to.equal(false);
            //expect((await game).guesses_count).to.equal(0);
            expect((await game).code_maker).to.equal(0);
            expect((await game).nt).to.equal(0);
            expect((await game).ng).to.equal(0);
            //var secret = (await lock.get_secret(1));

            //for (let i=0; i < 3; i++ )
            //    expect(secret[i].toString()).to.be.equals("0");

            var guesses = (await lock.get_guesses(1));
            var feedbacks = (await lock.get_feedbacks(1));

            for (let i=0; i < 2; i++ ){
                for (let j=0; j < 3; j++) {
                    expect(guesses[i][j]).to.be.equals(" ");
                    expect(feedbacks[i][j]).to.be.equals(" ");
                }
            }
            expect(await lock.queue_games(owner.address)).to.equal(1);
            expect(await lock.random_queue_games(owner.address)).to.equal(0);
        });

        it("Should inizialize a random game with right values", async function () {
            const { lock, owner, addr_0 } = await loadFixture(deploy);
            await lock.new_game(addr_0);
            const game = lock.games(1);
            expect((await game).player).to.equal(addr_0);
            expect((await game).creator).to.equal(owner.address);
            expect((await game).state).to.equal(0);
            expect(await lock.random_queue_games(owner.address)).to.equal(1);
            expect(await lock.queue_games(owner.address)).to.equal(0);
            expect(await lock.it_random_queue_games(0)).to.equal(owner.address);
        });
    });

    describe("join_game", function () {

        it("Should join the right user and set game state", async function () {
            const { lock, otherAccount } = await loadFixture(deploy);
            await lock.new_game(otherAccount.address);
            await lock.connect(otherAccount).join_game(1);
            const game = lock.games(1);
            expect((await game).state).to.equal(1);
            expect((await game).player).to.equal(otherAccount.address);
        });

        it("Should remove the game from queue_games", async function () {
            const { lock, otherAccount, owner } = await loadFixture(deploy);
            await lock.new_game(otherAccount.address);
            await lock.connect(otherAccount).join_game(1);
            expect(await lock.queue_games(owner.address)).to.equal(0);
        });

        it("Should fail if the game id doesn't exists", async function () {
            const { lock, otherAccount } = await loadFixture(deploy);
            await lock.new_game(otherAccount.address);
            await expect(lock.connect(otherAccount).join_game(99)).to.be.revertedWith("The game doesn't exists");
        });

        it("Should join the right user and deliver the event to the creator", async function () {
            const { lock, owner, otherAccount } = await loadFixture(deploy);
            await lock.new_game(otherAccount.address);
            await expect(lock.connect(otherAccount).join_game(1)).to.emit(lock, "player_joined").withArgs(owner.address);
        });

        it("Should fail if a user that already created a game try to connect to another game", async function () {
            const { lock, otherAccount } = await loadFixture(deploy);
            await lock.new_game(otherAccount.address);
            await expect(lock.join_game(1)).to.revertedWith("You already created a game");
        });

        it("Should fail if a user that wasn't suppose to join try to join this game", async function () {
            const { lock, extraAccount, otherAccount } = await loadFixture(deploy);
            await lock.new_game(otherAccount.address);
            await expect(lock.connect(extraAccount).join_game(1)).to.revertedWith("You are not the one that need to join this game");
        });


    });

    describe("join_random_game", function () {

        it("Should join a random user and set the correct game state and deliver the events", async function () {
            const { lock, owner, otherAccount, addr_0 } = await loadFixture(deploy);
            await lock.new_game(addr_0);
            await expect(await lock.connect(otherAccount).join_random_game())
            .to.emit(lock, "random_player_joined").withArgs(owner.address)
            const game = lock.games(1);
            expect((await game).state).to.equal(1);
            expect((await game).player).to.equal(otherAccount.address);
        });

        it("Should fail if there are no game avaliable", async function () {
            const { lock } = await loadFixture(deploy);
            await expect(lock.join_random_game()).to.revertedWith("No games avaliable");
        });

        it("Should remove the game from random_queue_game and it_random_queue_games", async function () {
            const { lock, otherAccount, extraAccount, owner, addr_0 } = await loadFixture(deploy);
            await lock.new_game(addr_0);
            await expect(await lock.connect(otherAccount).join_random_game()).to.emit(lock, "random_player_joined").withArgs(owner.address);
            await lock.connect(extraAccount).new_game(addr_0);
            await expect(await lock.connect(otherAccount).join_random_game()).to.emit(lock, "random_player_joined").withArgs(extraAccount.address);
            expect(await lock.random_queue_games(owner.address)).to.equal(0);
            expect(lock.it_random_queue_games.length).to.equal(0);
        });
    });

    describe("make_offer", function () {

        it("Should make an offer correctly from creator", async function () {
            const { lock, otherAccount, addr_0 } = await loadFixture(deploy);
            await lock.new_game(addr_0);
            await lock.connect(otherAccount).join_random_game();
            let option = 2;
            let value = 100;
            await expect(await lock.make_offer(1,option,value)).to.emit(lock, "offer_value").withArgs(otherAccount.address,option,value);
        });

        it("Should make an offer correctly from second player", async function () {
            const { lock, owner, otherAccount, addr_0 } = await loadFixture(deploy);
            await lock.new_game(addr_0);
            await lock.connect(otherAccount).join_random_game();
            let option = 2;
            let value = 100;
            await expect(await lock.make_offer(1,option,value)).to.emit(lock, "offer_value").withArgs(otherAccount.address,option,value);
            option = 2;
            value = 1231;
            await expect(await lock.connect(otherAccount).make_offer(1,option,value)).to.emit(lock, "offer_value").withArgs(owner.address,option,value);
        });

        it("Should fail if gameID is not correct", async function () {
            const { lock, otherAccount, addr_0 } = await loadFixture(deploy);
            await lock.new_game(addr_0);
            await lock.connect(otherAccount).join_random_game();
            let option = 2;
            let value = 100;
            await expect(lock.make_offer(2, option, value)).to.be.revertedWith("gameID isn't correct");
        });

        it("Should fail if option is not correct", async function () {
            const { lock, otherAccount, addr_0 } = await loadFixture(deploy);
            await lock.new_game(addr_0);
            await lock.connect(otherAccount).join_random_game();
            let option = 3;
            let value = 100;
            await expect(lock.make_offer(1, option, value)).to.be.revertedWith("option isn't correct");
        });

        it("Should fail if sender is not creator or player", async function () {
            const { lock, extraAccount, otherAccount, addr_0 } = await loadFixture(deploy);
            await lock.new_game(addr_0);
            await lock.connect(otherAccount).join_random_game();
            let option = 2;
            let value = 100;
            await expect(lock.connect(extraAccount).make_offer(1, option, value)).to.be.revertedWith("you aren't a player of this game");
        });

        it("Should fail if option is 1 and value is 0", async function () {
            const { lock, otherAccount, addr_0 } = await loadFixture(deploy);
            await lock.new_game(addr_0);
            await lock.connect(otherAccount).join_random_game();
            let option = 1;
            let value = 0;
            await expect(lock.make_offer(1, option, value)).to.be.revertedWith("value isn't correct");
        });

        it("Should set the right game stat if the two player agree", async function () {
            const { lock, otherAccount, addr_0 } = await loadFixture(deploy);
            await lock.new_game(addr_0);
            await lock.connect(otherAccount).join_random_game();
            let option = 2;
            let value = 100;
            await expect(await lock.make_offer(1,option,value)).to.emit(lock, "offer_value").withArgs(otherAccount.address,option,value);
            await lock.connect(otherAccount).make_offer(1,1,value);
            const game = lock.games(1);
            expect((await game).state).to.equal(2);
            expect((await game).bet_value).to.equal(value);
        });

        it("Should function as normal even with a lot of offers between 2 player", async function () {
            const { lock, otherAccount, addr_0, owner} = await loadFixture(deploy);
            await lock.new_game(addr_0);
            await lock.connect(otherAccount).join_random_game();
            await expect(await lock.make_offer(1,2,199)).to.emit(lock, "offer_value").withArgs(otherAccount.address,2,199);
            await expect(await lock.connect(otherAccount).make_offer(1,2,23121)).to.emit(lock, "offer_value").withArgs(owner.address,2,23121);
            await expect(await lock.make_offer(1,2,1999)).to.emit(lock, "offer_value").withArgs(otherAccount.address,2,1999);
            await expect(await lock.connect(otherAccount).make_offer(1,2,2)).to.emit(lock, "offer_value").withArgs(owner.address,2,2);
            await expect(await lock.make_offer(1,2,123123)).to.emit(lock, "offer_value").withArgs(otherAccount.address,2,123123);
            await expect(await lock.connect(otherAccount).make_offer(1,2,2341232)).to.emit(lock, "offer_value").withArgs(owner.address,2,2341232);
            await expect(await lock.make_offer(1,1,2341232)).to.emit(lock, "offer_value").withArgs(otherAccount.address,1,2341232);
            const game = lock.games(1);
            expect((await game).state).to.equal(2);
            expect((await game).bet_value).to.equal(2341232);
        });

    });

    //describe("send_money", function () {
    //  it("should", async function () {
    //    const { lock, otherAccount } = await loadFixture(deploy);
    //    expect(await hre.ethers.provider.getBalance(lock.target)).to.equal(100_000_000);
    //    await lock.connect(otherAccount).send({value: 100000});
    //    expect(await hre.ethers.provider.getBalance(lock.target)).to.equal(100_100_000);
    //  });
    //});

    describe("send_wei", function () {
        it("should send wei correctly", async function () {
            const { lock, otherAccount, addr_0 } = await loadFixture(deploy);
            await lock.new_game(addr_0);
            await lock.connect(otherAccount).join_random_game();
            let option = 2;
            let value = 100;
            await expect(await lock.make_offer(1,option,value)).to.emit(lock, "offer_value").withArgs(otherAccount.address,option,value);
            await lock.connect(otherAccount).make_offer(1,1,value);
            const game = lock.games(1);
            expect((await game).state).to.equal(2);
            expect((await game).bet_value).to.equal(value);
            await lock.send_wei(1,{value: value.toString()});
            await lock.connect(otherAccount).send_wei(1,{value: value.toString()});
            expect(await lock.get_bet_check(1)).to.equal(true);
            expect(await lock.connect(otherAccount).get_bet_check(1)).to.equal(true);
            expect(await hre.ethers.provider.getBalance(lock.target)).to.equal(100_000_000 + (value * 2));
        });

        it("should revert for incorrect game ID", async function () {
            const { lock, otherAccount, addr_0 } = await loadFixture(deploy);
            await lock.new_game(addr_0);
            await lock.connect(otherAccount).join_random_game();
            let option = 2;
            let value = 100;
            await expect(await lock.make_offer(1,option,value)).to.emit(lock, "offer_value").withArgs(otherAccount.address,option,value);
            await lock.connect(otherAccount).make_offer(1,1,value);
            const game = lock.games(1);
            expect((await game).state).to.equal(2);
            expect((await game).bet_value).to.equal(value);
            await expect(lock.send_wei(3,{value: value})).to.be.revertedWith("gameID isn't correct");
        });

        it("should revert if sender is not a player", async function () {
            const { lock, otherAccount, extraAccount, addr_0 } = await loadFixture(deploy);
            await lock.new_game(addr_0);
            await lock.connect(otherAccount).join_random_game();
            let option = 2;
            let value = 100;
            await expect(await lock.make_offer(1,option,value)).to.emit(lock, "offer_value").withArgs(otherAccount.address,option,value);
            await lock.connect(otherAccount).make_offer(1,1,value);
            const game = lock.games(1);
            expect((await game).state).to.equal(2);
            expect((await game).bet_value).to.equal(value);
            await expect(lock.connect(extraAccount).send_wei(1,{value: value})).to.be.revertedWith("you aren't part of this game");
        });

        it("should revert for incorrect value", async function () {
            const { lock, otherAccount, addr_0 } = await loadFixture(deploy);
            await lock.new_game(addr_0);
            await lock.connect(otherAccount).join_random_game();
            let option = 2;
            let value = 100;
            await expect(await lock.make_offer(1,option,value)).to.emit(lock, "offer_value").withArgs(otherAccount.address,option,value);
            await lock.connect(otherAccount).make_offer(1,1,value);
            const game = lock.games(1);
            expect((await game).state).to.equal(2);
            expect((await game).bet_value).to.equal(value);
            await expect(lock.send_wei(1,{value: "10000"})).to.be.revertedWith("please send the correct value");
        });
    });

    describe("get_bet_check", function () {
        it("should return the correct bet check for creator", async function () {
            const { lock, otherAccount, addr_0 } = await loadFixture(deploy);
            await lock.new_game(addr_0);
            await lock.connect(otherAccount).join_random_game();
            let option = 2;
            let value = 100;
            await expect(await lock.make_offer(1,option,value)).to.emit(lock, "offer_value").withArgs(otherAccount.address,option,value);
            await lock.connect(otherAccount).make_offer(1,1,value);
            const game = lock.games(1);
            expect((await game).state).to.equal(2);
            expect((await game).bet_value).to.equal(value);
            await lock.send_wei(1,{value: value.toString()});
            await lock.connect(otherAccount).send_wei(1,{value: value.toString()});
            expect(await lock.get_bet_check(1)).to.equal(true);
            expect(await lock.connect(otherAccount).get_bet_check(1)).to.equal(true);
        });

        it("should revert for incorrect game ID", async function () {
            const { lock, otherAccount, addr_0 } = await loadFixture(deploy);
            await lock.new_game(addr_0);
            await lock.connect(otherAccount).join_random_game();
            let option = 2;
            let value = 100;
            await expect(await lock.make_offer(1,option,value)).to.emit(lock, "offer_value").withArgs(otherAccount.address,option,value);
            await lock.connect(otherAccount).make_offer(1,1,value);
            const game = lock.games(1);
            expect((await game).state).to.equal(2);
            expect((await game).bet_value).to.equal(value);
            await lock.send_wei(1,{value: value.toString()});
            await lock.connect(otherAccount).send_wei(1,{value: value.toString()});
            //TODO: fix
            //await expect(await lock.get_bet_check(2)).to.be.revertedWith("gameID");
        });

        it("should return false if one of the two didn't pay", async function () {
            const { lock, otherAccount, addr_0 } = await loadFixture(deploy);
            await lock.new_game(addr_0);
            await lock.connect(otherAccount).join_random_game();
            let option = 2;
            let value = 100;
            await expect(await lock.make_offer(1,option,value)).to.emit(lock, "offer_value").withArgs(otherAccount.address,option,value);
            await lock.connect(otherAccount).make_offer(1,1,value);
            const game = lock.games(1);
            expect((await game).state).to.equal(2);
            expect((await game).bet_value).to.equal(value);
            await lock.send_wei(1,{value: value.toString()});
            expect(await lock.get_bet_check(1)).to.equal(false);
        });
    });

    describe("start_game", function () {
        //it("should return the correct bet check for creator", async function () {
        //    const { lock, otherAccount, addr_0 } = await loadFixture(deploy);
        //    await lock.new_game(addr_0);
        //    await lock.connect(otherAccount).join_random_game();
        //    let option = 2;
        //    let value = 100;
        //    await expect(await lock.make_offer(1,option,value)).to.emit(lock, "offer_value").withArgs(otherAccount.address,option,value);
        //    await lock.connect(otherAccount).make_offer(1,1,value);
        //    const game = lock.games(1);
        //    expect((await game).state).to.equal(2);
        //    expect((await game).bet_value).to.equal(value);
        //    await lock.send_wei(1,{value: value.toString()});
        //    await lock.connect(otherAccount).send_wei(1,{value: value.toString()});
        //    expect(await lock.get_bet_check(1)).to.equal(true);
        //    expect(await lock.connect(otherAccount).get_bet_check(1)).to.equal(true);
        //});

        it("should revert for incorrect game ID", async function () {
        });

        it("should return false if one of the two didn't pay", async function () {
        });


    });

});
