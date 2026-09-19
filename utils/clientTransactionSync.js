const Transaction = require('../Models/transaction.modal');
const Client = require('../Models/client.modal');

/**
 * Keeps a client's ledger (Transaction doc + Client.totalBalance) in sync with
 * a budget Expense/Income entry that is optionally linked to a client account.
 *
 * Mirrors the sign convention used by transaction.controller.js: OUT is stored
 * as a negative amount, IN as a positive amount, and Client.totalBalance is
 * kept as a running $inc of that signed amount.
 *
 * @param {String|null} linkedTransactionId - the Transaction currently linked to the entry, if any
 * @param {String|null} clientId - desired client to link to; falsy means "unlink"
 * @param {String} parentId - owning user id
 * @param {Number} amount - unsigned entry amount
 * @param {Date} date
 * @param {String} description - text shown as the transaction's `dis`
 * @param {'IN'|'OUT'} type
 * @returns {Promise<String|null>} the linkedTransactionId to persist on the entry (null if unlinked)
 */
const syncClientTransaction = async ({
    linkedTransactionId,
    clientId,
    parentId,
    amount,
    date,
    description,
    type
}) => {
    const existing = linkedTransactionId
        ? await Transaction.findById(linkedTransactionId)
        : null;

    if (!clientId) {
        if (existing) {
            await Client.findByIdAndUpdate(existing.clientId, {
                $inc: { totalBalance: -existing.amount }
            });
            await Transaction.findByIdAndDelete(existing._id);
        }
        return null;
    }

    const signedAmount = type === 'OUT' ? -Math.abs(amount) : Math.abs(amount);

    if (!existing) {
        const created = await Transaction.create({
            clientId,
            parentId,
            amount: signedAmount,
            date,
            dis: description,
            type
        });
        await Client.findByIdAndUpdate(clientId, {
            $inc: { totalBalance: signedAmount },
            lastTransactionDate: new Date()
        });
        return created._id;
    }

    const clientChanged = String(existing.clientId) !== String(clientId);

    if (clientChanged) {
        await Client.findByIdAndUpdate(existing.clientId, {
            $inc: { totalBalance: -existing.amount }
        });
        await Client.findByIdAndUpdate(clientId, {
            $inc: { totalBalance: signedAmount },
            lastTransactionDate: new Date()
        });
    } else {
        const diff = signedAmount - existing.amount;
        if (diff !== 0) {
            await Client.findByIdAndUpdate(clientId, {
                $inc: { totalBalance: diff },
                lastTransactionDate: new Date()
            });
        }
    }

    await Transaction.findByIdAndUpdate(existing._id, {
        clientId,
        amount: signedAmount,
        date,
        dis: description,
        type
    });

    return existing._id;
};

/**
 * Removes a linked transaction (used when the owning Expense/Income entry itself is deleted).
 */
const deleteLinkedTransaction = async (linkedTransactionId) => {
    if (!linkedTransactionId) return;
    const existing = await Transaction.findById(linkedTransactionId);
    if (!existing) return;
    await Client.findByIdAndUpdate(existing.clientId, {
        $inc: { totalBalance: -existing.amount }
    });
    await Transaction.findByIdAndDelete(existing._id);
};

module.exports = { syncClientTransaction, deleteLinkedTransaction };
