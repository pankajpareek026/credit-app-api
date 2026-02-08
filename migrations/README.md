# Database Migration Guide

## Running the budgetSectionId Migration

### Prerequisites
1. Ensure MongoDB is running
2. Ensure you have the correct `MONGODB_URI` in your `.env` file

### Steps to Run Migration

#### Option 1: Using Node directly
```bash
cd c:\dev\CRDT\credit-API
node migrations/migrate-budget-section-ids.js
```

#### Option 2: Add to package.json scripts
Add this to your `package.json` scripts section:
```json
"scripts": {
  "migrate:budget-sections": "node migrations/migrate-budget-section-ids.js"
}
```

Then run:
```bash
npm run migrate:budget-sections
```

### What the Migration Does

1. **Finds all expenses** without a `budgetSectionId`
2. **Groups them by user** for efficient processing
3. **Matches each expense** to a budget section based on:
   - Expense date falls within section's date range
   - If no match, assigns to the user's first active section
4. **Updates the database** with the matched `budgetSectionId`

### Expected Output

```
🚀 Starting budgetSectionId migration...
📊 Found X expenses without budgetSectionId
👥 Processing expenses for Y users
👤 Processing Z expenses for user <userId>
📁 Found N budget sections for user
✅ Updated expense "Grocery" → Section "Monthly Budget"
...
📊 Migration Summary:
   ✅ Updated: X
   ⚠️  Skipped: Y
   ❌ Errors: Z
✨ Migration completed successfully!
```

### After Migration

1. **Hot restart your Flutter app** (press `R`)
2. **Navigate to budget sections**
3. **Expenses should now appear** in their respective sections

### Troubleshooting

#### If migration shows "0 expenses need migration":
- Expenses already have `budgetSectionId` set
- Check if expenses exist: `db.expenses.countDocuments({})`

#### If expenses are skipped:
- User has no budget sections
- Create a budget section first, then re-run migration

#### If you see errors:
- Check MongoDB connection
- Verify database permissions
- Check migration logs for specific error messages

### Rollback (if needed)

To remove budgetSectionId from all expenses:
```javascript
// Run in MongoDB shell or create a rollback script
db.expenses.updateMany(
  {},
  { $unset: { budgetSectionId: "" } }
)
```

## Alternative: Manual Update via MongoDB Shell

If you prefer to update manually:

```javascript
// Connect to MongoDB
use credit-app

// Find expenses without budgetSectionId
db.expenses.find({ budgetSectionId: { $exists: false } }).count()

// Update all expenses for a specific user to a specific section
db.expenses.updateMany(
  { 
    parentId: ObjectId("USER_ID_HERE"),
    budgetSectionId: { $exists: false }
  },
  { 
    $set: { budgetSectionId: ObjectId("SECTION_ID_HERE") }
  }
)

// Verify update
db.expenses.find({ budgetSectionId: ObjectId("SECTION_ID_HERE") }).count()
```
