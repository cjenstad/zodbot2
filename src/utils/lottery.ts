import mongoose from 'mongoose';

/**
 * Runs a lottery for a user.
 * @param db - The mongoose instance used to access the database.
 * @param username - The username of the user.
 * @param roll - The number the user is betting on.
 * @returns A string indicating the result of the lottery.
 */
export async function lotteryRoll(db: typeof mongoose, username: string, roll: number) {
  const Lottery = db.model('Lottery');
  const lottery = await Lottery.findOne();
  const User = db.model('User');
  const user = await User.findOne({ username }).exec();
    if (!user) {
        return 'User not found';
    }
    if (user.points < 100) {
        return `${username}, you need ${100 - user.points} points to buy a lottery ticket`;
    }
    if(roll < 1 || roll > 1000) {
        return 'Invalid number';
    }


    user.points -= 100;
    const winningNumber = Math.floor(Math.random() * 1000) + 1;
    // const winningNumber = 888; // For testing purposes
    if (roll === winningNumber){
        user.points += 1000000 + (lottery.lotteryBonus || 0);
        await user.save();
        lottery.lotteryBonus = 0;
        await lottery.save();
        return `Congratulations! ${username} won the lottery! The winning number was ${winningNumber}. ${username} now has ${user.points} points`;
    }else {
        if(lottery){
            lottery.lotteryBonus = (lottery.lotteryBonus || 0 ) + 99;
            await lottery.save();
        }
        await user.save();
        return `Better luck next time! The winning number was ${winningNumber}. The jackpot is now ${1000000 + (lottery.lotteryBonus || 0)} points. ${username} now has ${user.points} points`;
    }
}
  