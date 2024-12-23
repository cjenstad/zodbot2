import { Stocks, addStocks } from "./database";
import mongoose from 'mongoose';

/**
 * Initializes the stocks in the database.
 * @param db - The mongoose instance used to access the database.
 * @returns A promise that resolves when the stocks have been initialized.
 */
export async function initStocks(db: typeof mongoose) {
    const stocks = [
        { symbol: 'WICH', currentPrice: 150, lastPrice: 148 },
        { symbol: 'SNAX', currentPrice: 2500, lastPrice: 2498 },
        { symbol: 'COPES', currentPrice: 300, lastPrice: 298 },
        { symbol: 'WKAI', currentPrice: 3500, lastPrice: 3498 },
        { symbol: 'KLONG', currentPrice: 350, lastPrice: 348 },
        { symbol: 'POKE', currentPrice: 4000, lastPrice: 3998 },
        { symbol: 'ROR', currentPrice: 450, lastPrice: 448 },
        { symbol: 'EWGF', currentPrice: 5000, lastPrice: 4998 },
        { symbol: 'DIGI', currentPrice: 550, lastPrice: 548 },
        { symbol: 'BOB', currentPrice: 50, lastPrice: 48 },
        { symbol: 'ALLG', currentPrice: 100, lastPrice: 98 },
        { symbol: 'LJF', currentPrice: 200, lastPrice: 198 },
        { symbol: 'DORG', currentPrice: 300, lastPrice: 298 }
        // Add more stocks here
    ];

    // Add stocks to the database if they don't exist already
    for (const stock of stocks) {
        const existingStock = await Stocks.findOne({ symbol: stock.symbol });
        // console.log(`findOne result for ${stock.symbol}:`, existingStock);
        if (existingStock) {
            console.log(`Stock already exists: ${stock.symbol}`);
        } else {
            console.log(`Adding stock: ${stock.symbol}`);
            await addStocks(db, stock.symbol, stock.currentPrice, stock.lastPrice);
        }
    }
}

/**
 * Updates the stocks in the database by generating random price changes.
 * @param db - The mongoose instance used to access the database.
 * @returns A promise that resolves when the stocks have been updated.
 */
export async function updateStocks(db: typeof mongoose) {
    const Stocks = db.model('Stocks');
    const stocks = await Stocks.find();
    if (stocks) {
        stocks.forEach(async (stock) => {
            const random = Math.floor(Math.random() * 2) === 0 ? -1 : 1;
            stock.lastPrice = stock.currentPrice;
            if (stock.currentPrice) {
                stock.currentPrice += random * Math.floor(Math.random() * 5);
                if (stock.currentPrice < 2) stock.currentPrice = 2;
            }
            await stock.save();
        });
    }
    return;
}

/**
 * Updates the ticker message to display the current stock prices.
 * @param db - The mongoose instance used to access the database.
 * @returns A string containing the updated ticker message.
 */
export async function updateTicker(db: typeof mongoose) {
    const Stocks = db.model('Stocks');
    const stocks = await Stocks.find();
    if (stocks) {
        let message = 'AZ Index: ';
        stocks.forEach((stock, index) => {
            const percentChange = stock.currentPrice && stock.lastPrice ? ((stock.currentPrice - stock.lastPrice) / stock.lastPrice) * 100 : 0;
            const changeSymbol = percentChange >= 0 ? '+' : '-';
            message += `${stock.symbol} - (${stock.currentPrice || 0} | ${changeSymbol}${Math.abs(percentChange).toFixed(2)}%)`;
            if (index !== stocks.length - 1) {
                message += ', ';
            }
        });
        return message;
    }
}

/**
 * Buys stocks for a user.
 * @param db - The mongoose instance used to access the database.
 * @param username - The username of the user.
 * @param symbol - The symbol of the stock to be bought.
 * @param quantity - The quantity of the stock to be bought.
 * @returns A string indicating the result of the purchase.
 */
export async function buyStock(db: typeof mongoose, username: string, symbol: string, quantity: number) {
    const User = db.model('User');
    const Stocks = db.model('Stocks');
    const user = await User.findOne({ username }).exec();
    const stock = await Stocks.findOne({ symbol });
    if (!user) {
        return 'User not found';
    }
    if (!stock) {
        return 'Invalid stock';
    }
    if (quantity < 1 || !stock.currentPrice || quantity * stock.currentPrice > user.points) {
        return 'Invalid quantity';
    }

    const ownedStock = user.ownedStocks.find((s: { symbol: string; }) => s.symbol === symbol);
    if (ownedStock) {
        if (ownedStock.quantity && ownedStock.purchasePrice && stock.currentPrice) {
            // Calculate weighted average of old and new purchase prices
            const totalOldValue = ownedStock.purchasePrice * ownedStock.quantity;
            const totalNewValue = stock.currentPrice * quantity;
            const totalQuantity = ownedStock.quantity + quantity;
            
            ownedStock.purchasePrice = Math.round((totalOldValue + totalNewValue) / totalQuantity);
            ownedStock.quantity += quantity;
        }
    } else {
        user.ownedStocks.push({ symbol, quantity, purchasePrice: stock.currentPrice });
    }
    user.points -= quantity * stock.currentPrice;
    await user.save();
    return `${user.username} bought ${quantity}x ${symbol} at ${stock.currentPrice} for ${quantity * stock.currentPrice} points`;
}

/**
 * Sells stocks for a user.
 * @param db - The mongoose instance used to access the database.
 * @param username - The username of the user.
 * @param symbol - The symbol of the stock to be sold.
 * @param quantity - The quantity of the stock to be sold.
 * @returns A string indicating the result of the sale.
 */
export async function sellStock(db: typeof mongoose, username: string, symbol: string, quantity: number) {
    const User = db.model('User');
    const Stocks = db.model('Stocks');
    const user = await User.findOne({ username }).exec();
    const stock = await Stocks.findOne({ symbol });
    if (!user) {
        return 'User not found';
    }
    if (!stock) {
        return 'Invalid stock';
    }
    if (quantity < 1) {
        return 'Invalid quantity';
    }
    const ownedStock = user.ownedStocks.find((s: { symbol: string; }) => s.symbol === symbol);
    if(!ownedStock){
        return `${username}, you don't own any ${symbol} to sell`; // prevent selling stocks user doesn't own
    }
    if (ownedStock) {
        if (ownedStock.quantity) {
            if (ownedStock.quantity < quantity) {
                return `You don't have enough ${symbol} to sell ${quantity}`;
            } else {
                ownedStock.quantity -= quantity;
            }
        }
        if (ownedStock.quantity === 0) {
            const stockIndex = user.ownedStocks.indexOf(ownedStock);
            user.ownedStocks.splice(stockIndex, 1);
        }
    }

    let profit = 0;
    if (stock.currentPrice && ownedStock && ownedStock.purchasePrice) {
        profit = quantity * (stock.currentPrice - ownedStock.purchasePrice);
    }
    if (stock.currentPrice) {
        user.points += quantity * stock.currentPrice;
    }
    await user.save();
    return `${user.username} sold ${quantity}x ${symbol} at ${stock.currentPrice} (Profit: ${profit})`;
}

/**
 * Checks the stocks in the user's portfolio.
 * @param db - The mongoose instance used to access the database.
 * @param username - The username of the user.
 * @returns A string containing the user's portfolio.
 */
export async function checkMyStocks(db: typeof mongoose, username: string) {
    const User = db.model('User');
    const Stocks = db.model('Stocks');
    const user = await User.findOne({ username }).exec();
    if (user) {
        let message = `${user.username}'s portfolio: `;
        if (user.ownedStocks.length === 0) {
            message += "Empty";
        } else {
            for (const stock of user.ownedStocks) {
                const stockInfo = await Stocks.findOne({ symbol: stock.symbol });
                if (stockInfo) {
                    const percentChange = stockInfo.currentPrice && stock.purchasePrice ? ((stockInfo.currentPrice - stock.purchasePrice) / stock.purchasePrice) * 100 : 0;
                    const changeSymbol = percentChange >= 0 ? '+' : '-';
                    message += `${stock.quantity}x ${stock.symbol} (C: ${stockInfo.currentPrice || 0} | bAt: ${stock.purchasePrice} | ${changeSymbol}${Math.abs(percentChange).toFixed(2)}%)`;
                }
                message += ', ';
            }
            message = message.slice(0, -2); // remove trailing comma and space
        }
        return message;
    }
}

