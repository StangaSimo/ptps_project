import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
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
      await lock.connect(otherAccount).get_gameid()
      await lock.connect(otherAccount).get_gameid()
      await lock.connect(otherAccount).get_gameid()
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
      const {lock, otherAccount} = await loadFixture(deploy);
      await lock.new_game(otherAccount.address);
      await lock.connect(otherAccount).join_game(1);
      const game = lock.games(1);
      expect((await game).state).to.equal(1);
      expect((await game).player).to.equal(otherAccount.address);
    });

   it("Should join the right user and deliver the event to the creator", async function () {
      const {lock, owner, otherAccount} = await loadFixture(deploy);
      await lock.new_game(otherAccount.address);
      await expect(lock.connect(otherAccount).join_game(1)).to.emit(lock, "player_joined").withArgs(owner.address);
    });

    it("Should fail if a user that already created a game try to connect to a game", async function () {
      const {lock, owner, otherAccount} = await loadFixture(deploy);
      await lock.new_game(otherAccount.address);
      await expect(lock.connect(otherAccount).join_game(1)).to.emit(lock, "player_joined").withArgs(owner.address);
    });
  });

   //describe("join_game", function () {
   //     it("Should allow a player to join a game created by another player", async function () {
   //         const { lock, owner, otherAccount } = await loadFixture(deploy);
   //         await lock.new_game(otherAccount.address);
   //         const gameid = await lock.get_gameid_byaddress(owner.address);
   //         await lock.connect(otherAccount).join_game(gameid);

   //         const game = await lock.games(gameid);
   //         expect(game.state).to.equal(1);
   //         expect(game.creator).to.equal(owner.address);
   //         expect(game.player).to.equal(otherAccount.address);
   //     });

   //     it("Should emit a player_joined event when a player joins a game", async function () {
   //         const { lock, owner, otherAccount } = await loadFixture(deploy);
   //         await lock.new_game(otherAccount.address);
   //         const gameid = await lock.get_gameid_byaddress(owner.address);
   //         await expect(lock.connect(otherAccount).join_game(gameid))
   //             .to.emit(lock, "player_joined")
   //             .withArgs(anyValue);
   //     });

   //     it("Should revert if the player tries to join their own game", async function () {
   //         const { lock, owner } = await loadFixture(deploy);
   //         await lock.new_game(owner.address);
   //         const gameid = await lock.get_gameid_byaddress(owner.address);
   //         await expect(lock.join_game(gameid)).to.be.revertedWith("You are the creator owner");
   //     });

   //     it("Should revert if the player is not the specified player", async function () {
   //         const { lock, owner, otherAccount, extraAccount } = await loadFixture(deploy);
   //         await lock.new_game(otherAccount.address);
   //         const gameid = await lock.get_gameid_byaddress(owner.address);
   //         await expect(lock.connect(extraAccount).join_game(gameid)).to.be.revertedWith("You are not the one that need to join this game");
   //     });

   //     it("Should revert if the game has already started", async function () {
   //         const { lock, owner, otherAccount } = await loadFixture(deploy);
   //         await lock.new_game(otherAccount.address);
   //         const gameid = await lock.get_gameid_byaddress(owner.address);
   //         await lock.connect(otherAccount).join_game(gameid);
   //         await expect(lock.connect(otherAccount).join_game(gameid)).to.be.revertedWith("The game is already started");
   //     });
   // });

   // describe("join_random_game", function () {
   //     it("Should allow a player to join a random game", async function () {
   //         const { lock, owner, addr_0, otherAccount } = await loadFixture(deploy);
   //         await lock.new_game(addr_0);
   //         await lock.connect(otherAccount).join_random_game();

   //         const gameid = await lock.random_queue_games(owner.address);
   //         const game = await lock.games(gameid);

   //         expect(game.state).to.equal(1);
   //         expect(game.creator).to.equal(owner.address);
   //         expect(game.player).to.equal(otherAccount.address);
   //     });

   //     it("Should emit a random_player_joined event when a player joins a random game", async function () {
   //         const { lock, otherAccount, addr_0 } = await loadFixture(deploy);
   //         await lock.new_game(addr_0);
   //         await expect(lock.connect(otherAccount).join_random_game())
   //             .to.emit(lock, "random_player_joined")
   //             .withArgs(anyValue);
   //     });

   //     it("Should revert if there are no games available to join", async function () {
   //         const { lock, otherAccount } = await loadFixture(deploy);
   //         await expect(lock.connect(otherAccount).join_random_game()).to.be.revertedWith("No games available");
   //     });

   //     it("Should revert if the player has already created a game", async function () {
   //         const { lock, addr_0, otherAccount } = await loadFixture(deploy);
   //         await lock.new_game(addr_0);
   //         await lock.new_game(otherAccount.address);
   //         await expect(lock.join_random_game()).to.be.revertedWith("You already created a game");
   //     });

   //     it("Should revert if the player has already created a random game", async function () {
   //         const { lock, otherAccount, addr_0 } = await loadFixture(deploy);
   //         await lock.new_game(addr_0);
   //         await lock.connect(otherAccount).new_game(addr_0);
   //         await expect(lock.connect(otherAccount).join_random_game()).to.be.revertedWith("You already created a game");
   //     });
   // });

});

//describe("Withdrawals", function () {
//  describe("Validations", function () {
//    it("Should revert with the right error if called too soon", async function () {
//      const { lock } = await loadFixture(deployOneYearLockFixture);

//      await expect(lock.withdraw()).to.be.revertedWith(
//        "You can't withdraw yet"
//      );
//    });

//    it("Should revert with the right error if called from another account", async function () {
//      const { lock, unlockTime, otherAccount } = await loadFixture(
//        deployOneYearLockFixture
//      );

//      // We can increase the time in Hardhat Network
//      await time.increaseTo(unlockTime);

//      // We use lock.connect() to send a transaction from another account
//      await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
//        "You aren't the owner"
//      );
//    });

//    it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
//      const { lock, unlockTime } = await loadFixture(
//        deployOneYearLockFixture
//      );

//      // Transactions are sent using the first signer by default
//      await time.increaseTo(unlockTime);

//      await expect(lock.withdraw()).not.to.be.reverted;
//    });
//  });

//  describe("Events", function () {
//    it("Should emit an event on withdrawals", async function () {
//      const { lock, unlockTime, lockedAmount } = await loadFixture(
//        deployOneYearLockFixture
//      );

//      await time.increaseTo(unlockTime);

//      await expect(lock.withdraw())
//        .to.emit(lock, "Withdrawal")
//        .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
//    });
//  });

//  describe("Transfers", function () {
//    it("Should transfer the funds to the owner", async function () {
//      const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
//        deployOneYearLockFixture
//      );

//      await time.increaseTo(unlockTime);

//      await expect(lock.withdraw()).to.changeEtherBalances(
//        [owner, lock],
//        [lockedAmount, -lockedAmount]
//      );
//    });
//  });

//});
