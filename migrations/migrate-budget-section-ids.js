const mongoose = require('mongoose');
const Expense = require('../Models/expense.modal');
const BudgetSection = require('../Models/budgetSection.modal');

/**
 * Migration Script: Add budgetSectionId to existing expenses
 * 
 * This script updates all expenses that don't have a budgetSectionId set.
 * It assigns them to the appropriate budget section based on the expense date.
 */

async function migrateBudgetSectionIds() {
    try {
        console.log('🚀 Starting budgetSectionId migration...');

        // Find all expenses without budgetSectionId
        const expensesWithoutSection = await Expense.find({
            $or: [
                { budgetSectionId: { $exists: false } },
                { budgetSectionId: null }
            ]
        }).sort({ parentId: 1, date: 1 });

        console.log(`📊 Found ${expensesWithoutSection.length} expenses without budgetSectionId`);

        if (expensesWithoutSection.length === 0) {
            console.log('✅ No expenses need migration');
            return;
        }

        let updated = 0;
        let skipped = 0;
        let errors = 0;

        // Group expenses by parentId for efficient processing
        const expensesByUser = {};
        expensesWithoutSection.forEach(expense => {
            const userId = expense.parentId.toString();
            if (!expensesByUser[userId]) {
                expensesByUser[userId] = [];
            }
            expensesByUser[userId].push(expense);
        });

        console.log(`👥 Processing expenses for ${Object.keys(expensesByUser).length} users`);

        // Process each user's expenses
        for (const [userId, expenses] of Object.entries(expensesByUser)) {
            console.log(`\n👤 Processing ${expenses.length} expenses for user ${userId}`);

            // Get all budget sections for this user, sorted by date
            const budgetSections = await BudgetSection.find({
                parentId: userId,
                isActive: true
            }).sort({ startDate: 1 });

            if (budgetSections.length === 0) {
                console.log(`⚠️  No budget sections found for user ${userId}, skipping ${expenses.length} expenses`);
                skipped += expenses.length;
                continue;
            }

            console.log(`📁 Found ${budgetSections.length} budget sections for user`);

            // Process each expense
            for (const expense of expenses) {
                try {
                    // Find the appropriate budget section for this expense
                    // Match based on date range
                    let matchedSection = null;

                    for (const section of budgetSections) {
                        const expenseDate = new Date(expense.date);
                        const sectionStart = new Date(section.startDate);
                        const sectionEnd = new Date(section.endDate);

                        if (expenseDate >= sectionStart && expenseDate <= sectionEnd) {
                            matchedSection = section;
                            break;
                        }
                    }

                    // If no section matches by date, use the first active section
                    if (!matchedSection) {
                        matchedSection = budgetSections[0];
                        console.log(`⚠️  Expense "${expense.title}" (${expense.date.toISOString().split('T')[0]}) doesn't match any section date range, assigning to first section "${matchedSection.title}"`);
                    }

                    // Update the expense
                    await Expense.findByIdAndUpdate(
                        expense._id,
                        { budgetSectionId: matchedSection._id },
                        { new: true }
                    );

                    updated++;
                    console.log(`✅ Updated expense "${expense.title}" → Section "${matchedSection.title}"`);

                } catch (error) {
                    errors++;
                    console.error(`❌ Error updating expense ${expense._id}:`, error.message);
                }
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Migration Summary:');
        console.log(`   ✅ Updated: ${updated}`);
        console.log(`   ⚠️  Skipped: ${skipped}`);
        console.log(`   ❌ Errors: ${errors}`);
        console.log('='.repeat(60));

        if (updated > 0) {
            console.log('\n✨ Migration completed successfully!');
            console.log('💡 Tip: Restart your Flutter app to see the updated expenses');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run migration if executed directly
if (require.main === module) {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/credit-app';

    mongoose.connect(dbUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
        .then(() => {
            console.log('✅ Connected to MongoDB');
            return migrateBudgetSectionIds();
        })
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateBudgetSectionIds };
