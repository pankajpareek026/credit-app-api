const mongoose = require('mongoose');
const Expense = require('../Models/expense.modal');
const BudgetSection = require('../Models/budgetSection.modal');

/**
 * Diagnostic Script: Check expense and budget section data
 */

async function diagnoseExpenseData() {
    try {
        console.log('🔍 Starting diagnostic check...\n');

        // Count total expenses
        const totalExpenses = await Expense.countDocuments({});
        console.log(`📊 Total expenses in database: ${totalExpenses}`);

        // Count expenses with budgetSectionId
        const expensesWithSection = await Expense.countDocuments({
            budgetSectionId: { $exists: true, $ne: null }
        });
        console.log(`✅ Expenses WITH budgetSectionId: ${expensesWithSection}`);

        // Count expenses without budgetSectionId
        const expensesWithoutSection = await Expense.countDocuments({
            $or: [
                { budgetSectionId: { $exists: false } },
                { budgetSectionId: null }
            ]
        });
        console.log(`❌ Expenses WITHOUT budgetSectionId: ${expensesWithoutSection}\n`);

        // Get sample expenses
        if (totalExpenses > 0) {
            console.log('📝 Sample expenses:');
            const sampleExpenses = await Expense.find({}).limit(5).lean();
            sampleExpenses.forEach((expense, index) => {
                console.log(`\n${index + 1}. ${expense.title}`);
                console.log(`   Amount: ₹${expense.amount}`);
                console.log(`   Date: ${expense.date.toISOString().split('T')[0]}`);
                console.log(`   budgetSectionId: ${expense.budgetSectionId || 'NULL'}`);
                console.log(`   parentId: ${expense.parentId}`);
            });
        }

        // Count total budget sections
        console.log('\n' + '='.repeat(60));
        const totalSections = await BudgetSection.countDocuments({});
        console.log(`📁 Total budget sections in database: ${totalSections}`);

        if (totalSections > 0) {
            console.log('\n📝 Sample budget sections:');
            const sampleSections = await BudgetSection.find({}).limit(5).lean();
            sampleSections.forEach((section, index) => {
                console.log(`\n${index + 1}. ${section.title}`);
                console.log(`   ID: ${section._id}`);
                console.log(`   Start: ${section.startDate.toISOString().split('T')[0]}`);
                console.log(`   End: ${section.endDate.toISOString().split('T')[0]}`);
                console.log(`   parentId: ${section.parentId}`);
            });
        }

        // Check for mismatches
        console.log('\n' + '='.repeat(60));
        if (totalExpenses > 0 && expensesWithSection > 0) {
            console.log('\n🔍 Checking for invalid budgetSectionId references...');
            const expenses = await Expense.find({
                budgetSectionId: { $exists: true, $ne: null }
            }).lean();

            let invalidReferences = 0;
            for (const expense of expenses) {
                const sectionExists = await BudgetSection.findById(expense.budgetSectionId);
                if (!sectionExists) {
                    invalidReferences++;
                    console.log(`⚠️  Expense "${expense.title}" references non-existent section: ${expense.budgetSectionId}`);
                }
            }

            if (invalidReferences === 0) {
                console.log('✅ All budgetSectionId references are valid');
            } else {
                console.log(`\n❌ Found ${invalidReferences} invalid references`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Diagnostic check completed');

    } catch (error) {
        console.error('❌ Diagnostic check failed:', error);
        throw error;
    }
}

// Run diagnostic if executed directly
if (require.main === module) {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/credit-app';

    mongoose.connect(dbUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
        .then(() => {
            console.log('✅ Connected to MongoDB\n');
            return diagnoseExpenseData();
        })
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Diagnostic script failed:', error);
            process.exit(1);
        });
}

module.exports = { diagnoseExpenseData };
