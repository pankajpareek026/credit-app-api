const mongoose = require('mongoose');
const Expense = require('../Models/expense.modal');
const Income = require('../Models/income.modal');
const BudgetSection = require('../Models/budgetSection.modal');

/**
 * Comprehensive Diagnostic and Fix Script
 * This will check the actual state of the database and fix the issue
 */

async function comprehensiveDiagnostic() {
    try {
        console.log('🔍 COMPREHENSIVE DIAGNOSTIC CHECK\n');
        console.log('='.repeat(70));

        // Step 1: Check all expenses
        console.log('\n📊 STEP 1: Checking Expenses');
        console.log('-'.repeat(70));

        const allExpenses = await Expense.find({}).lean();
        console.log(`Total expenses in DB: ${allExpenses.length}`);

        const expensesWithBudgetSection = allExpenses.filter(e => e.budgetSectionId);
        const expensesWithoutBudgetSection = allExpenses.filter(e => !e.budgetSectionId);

        console.log(`✅ With budgetSectionId: ${expensesWithBudgetSection.length}`);
        console.log(`❌ Without budgetSectionId: ${expensesWithoutBudgetSection.length}`);

        if (expensesWithoutBudgetSection.length > 0) {
            console.log('\n⚠️  Expenses WITHOUT budgetSectionId:');
            expensesWithoutBudgetSection.slice(0, 5).forEach((exp, i) => {
                console.log(`   ${i + 1}. "${exp.title}" - ₹${exp.amount} (${exp.date.toISOString().split('T')[0]})`);
            });
        }

        // Step 2: Check all budget sections
        console.log('\n📁 STEP 2: Checking Budget Sections');
        console.log('-'.repeat(70));

        const allSections = await BudgetSection.find({}).lean();
        console.log(`Total budget sections in DB: ${allSections.length}`);

        if (allSections.length > 0) {
            console.log('\nBudget Sections:');
            allSections.forEach((section, i) => {
                console.log(`   ${i + 1}. "${section.title}" (ID: ${section._id})`);
                console.log(`      Dates: ${section.startDate.toISOString().split('T')[0]} to ${section.endDate.toISOString().split('T')[0]}`);
                console.log(`      Parent: ${section.parentId}`);
            });
        }

        // Step 3: Test aggregation query
        console.log('\n🧪 STEP 3: Testing Aggregation Queries');
        console.log('-'.repeat(70));

        for (const section of allSections) {
            console.log(`\nSection: "${section.title}" (${section._id})`);

            // Test expense aggregation
            const expenseResult = await Expense.aggregate([
                {
                    $match: {
                        parentId: section.parentId,
                        budgetSectionId: section._id,
                        isActive: true
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            const totalExpenses = expenseResult.length > 0 ? expenseResult[0].total : 0;
            const expenseCount = expenseResult.length > 0 ? expenseResult[0].count : 0;

            // Test income aggregation
            const incomeResult = await Income.aggregate([
                {
                    $match: {
                        parentId: section.parentId,
                        budgetSectionId: section._id,
                        isActive: true
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            const totalIncome = incomeResult.length > 0 ? incomeResult[0].total : 0;
            const incomeCount = incomeResult.length > 0 ? incomeResult[0].count : 0;

            console.log(`   Income: ₹${totalIncome} (${incomeCount} entries)`);
            console.log(`   Expenses: ₹${totalExpenses} (${expenseCount} entries)`);
            console.log(`   Balance: ₹${totalIncome - totalExpenses}`);

            if (expenseCount === 0 && expensesWithoutBudgetSection.length > 0) {
                console.log(`   ⚠️  WARNING: 0 expenses found but ${expensesWithoutBudgetSection.length} expenses exist without budgetSectionId!`);
            }
        }

        // Step 4: Propose fix
        console.log('\n💡 STEP 4: Proposed Fix');
        console.log('='.repeat(70));

        if (expensesWithoutBudgetSection.length > 0 && allSections.length > 0) {
            console.log('\n✨ SOLUTION: Assign budgetSectionId to expenses without it');
            console.log('\nOptions:');
            console.log('1. Assign all expenses to the first budget section');
            console.log('2. Assign expenses based on date range matching');
            console.log('3. Manually assign in MongoDB');

            console.log('\n🔧 Auto-fixing now (Option 2: Date-based matching)...\n');

            let fixed = 0;
            let skipped = 0;

            for (const expense of expensesWithoutBudgetSection) {
                // Find matching section by date
                let matchedSection = null;

                for (const section of allSections) {
                    if (expense.parentId.toString() !== section.parentId.toString()) {
                        continue;
                    }

                    const expenseDate = new Date(expense.date);
                    const sectionStart = new Date(section.startDate);
                    const sectionEnd = new Date(section.endDate);

                    if (expenseDate >= sectionStart && expenseDate <= sectionEnd) {
                        matchedSection = section;
                        break;
                    }
                }

                // If no match by date, use first section for same user
                if (!matchedSection) {
                    matchedSection = allSections.find(s => s.parentId.toString() === expense.parentId.toString());
                }

                if (matchedSection) {
                    await Expense.findByIdAndUpdate(
                        expense._id,
                        { budgetSectionId: matchedSection._id }
                    );
                    console.log(`✅ Fixed: "${expense.title}" → "${matchedSection.title}"`);
                    fixed++;
                } else {
                    console.log(`⚠️  Skipped: "${expense.title}" (no matching section found)`);
                    skipped++;
                }
            }

            console.log('\n' + '='.repeat(70));
            console.log(`📊 Fix Summary:`);
            console.log(`   ✅ Fixed: ${fixed}`);
            console.log(`   ⚠️  Skipped: ${skipped}`);
            console.log('='.repeat(70));

            if (fixed > 0) {
                console.log('\n✨ SUCCESS! Expenses have been assigned to budget sections.');
                console.log('💡 Hot restart your Flutter app to see the changes.');
            }
        } else if (expensesWithoutBudgetSection.length === 0) {
            console.log('\n✅ All expenses already have budgetSectionId assigned!');
            console.log('💡 The issue might be elsewhere. Check:');
            console.log('   1. Frontend is using correct budgetSectionId');
            console.log('   2. Backend logs show correct aggregation results');
            console.log('   3. API response is being parsed correctly');
        } else {
            console.log('\n⚠️  No budget sections found!');
            console.log('💡 Create a budget section first, then run this script again.');
        }

    } catch (error) {
        console.error('❌ Diagnostic failed:', error);
        throw error;
    }
}

// Run if executed directly
if (require.main === module) {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/credit-app';

    mongoose.connect(dbUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
        .then(() => {
            console.log('✅ Connected to MongoDB\n');
            return comprehensiveDiagnostic();
        })
        .then(() => {
            console.log('\n✅ Diagnostic completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Diagnostic failed:', error);
            process.exit(1);
        });
}

module.exports = { comprehensiveDiagnostic };
