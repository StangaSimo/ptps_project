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
      await expect(lock.make_offer(1, option, value)).to.be.revertedWith("value isn't corret");
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
  });

  describe("send_money", function () {

    it("SHOULD", async function () {
      const { lock, otherAccount } = await loadFixture(deploy);
      expect(await hre.ethers.provider.getBalance(lock.target)).to.equal(100_000_000);
      await lock.connect(otherAccount).send({value: 100000});
      expect(await hre.ethers.provider.getBalance(lock.target)).to.equal(100_000_000);
    });

  });










});
