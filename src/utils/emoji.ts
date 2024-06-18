import mongoose from 'mongoose';

/**
 * Represents an emoji that can be bought and sold.
 */
export class Emoji {
    character: string;
    alias: string;
    price: number;

    constructor(character: string, alias: string, price: number) {
        this.character = character;
        this.alias = alias;
        this.price = price;
    }
}

/**
 * Buys an emoji for a user.
 * @param db - The mongoose instance.
 * @param username - The username of the user.
 * @param emoji - The emoji to be bought.
 * @returns A string indicating the result of the purchase.
 */
export async function buyEmoji(db: typeof mongoose, username: string, emoji: Emoji) {
    const User = db.model('User');

    const user = await User.findOne({ username: username }).exec();
    if (!user) {
        return 'User not found';
    }
    if (user.emojiCollection.includes(emoji.character)) {
        return `You already own ${emoji.character}`;
    }
    if (user.points < emoji.price) {
        return `You need ${emoji.price - user.points} more points to buy ${emoji.character}`;
    }
    user.points -= emoji.price;
    user.emojiCollection.push(emoji.character);
    await user.save();
    return `${user.username} bought an emoji: ${emoji.character}`;
}

/**
 * Sells an emoji for a user.
 * @param db - The mongoose instance.
 * @param username - The username of the user.
 * @param emoji - The emoji to be sold.
 * @returns A string indicating the result of the sale.
 */
export async function sellEmoji(db: typeof mongoose, username: string, emoji: Emoji) {
    const User = db.model('User');

    const user = await User.findOne({ username: username }).exec();
    if (!user) {
        return 'User not found';
    }
    const emojiIndex = user.emojiCollection.indexOf(emoji.character);
    if (emojiIndex === -1) {
        return `You don't own ${emoji.character}`;
    }
    user.points += emoji.price;
    user.emojiCollection.splice(emojiIndex, 1);
    await user.save();
    return `${user.username} parted ways with ${emoji.character}`;
}

