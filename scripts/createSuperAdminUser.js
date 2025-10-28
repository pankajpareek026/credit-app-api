const mongoose = require('mongoose');
const User = require('../Models/user.modal');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createSuperAdminUser() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
        console.log('Connected to MongoDB');

        // Check if super admin user already exists
        const existingSuperAdmin = await User.findOne({
            email: 'superadmin@creditapp.com'
        });

        if (existingSuperAdmin) {
            console.log('Super admin user already exists:', existingSuperAdmin.email);
            console.log('Updating to super admin role...');

            // Update existing user to super admin
            const updatedUser = await User.findByIdAndUpdate(
                existingSuperAdmin._id,
                {
                    isAdmin: true,
                    adminRole: 'super_admin',
                    featureFlags: {
                        canViewAnalytics: true,
                        canManageUsers: true,
                        canManageSystem: true,
                        canViewReports: true,
                        canManageClients: true,
                        canManageTransactions: true,
                        canManageBills: true,
                        canManageExpenses: true,
                        canManageTasks: true,
                        canManageNotes: true,
                        canManageVault: true,
                        canViewSystemHealth: true,
                        canExportData: true,
                        canBulkOperations: true
                    },
                    'adminMetadata.permissionsGrantedAt': new Date(),
                    'adminMetadata.createdBy': existingSuperAdmin._id
                },
                { new: true }
            );

            console.log('Super admin user updated successfully:', updatedUser.email);
            console.log('Admin role:', updatedUser.adminRole);
            console.log('Feature flags:', updatedUser.featureFlags);
        } else {
            // Create new super admin user
            const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12);

            const superAdminUser = new User({
                name: 'Super Admin',
                email: 'superadmin@creditapp.com',
                pass: hashedPassword,
                isAdmin: true,
                adminRole: 'super_admin',
                featureFlags: {
                    canViewAnalytics: true,
                    canManageUsers: true,
                    canManageSystem: true,
                    canViewReports: true,
                    canManageClients: true,
                    canManageTransactions: true,
                    canManageBills: true,
                    canManageExpenses: true,
                    canManageTasks: true,
                    canManageNotes: true,
                    canManageVault: true,
                    canViewSystemHealth: true,
                    canExportData: true,
                    canBulkOperations: true
                },
                adminMetadata: {
                    permissionsGrantedAt: new Date(),
                    createdBy: null // Self-created
                }
            });

            await superAdminUser.save();
            console.log('Super admin user created successfully:', superAdminUser.email);
            console.log('Admin role:', superAdminUser.adminRole);
            console.log('Feature flags:', superAdminUser.featureFlags);
        }

        // Disconnect from MongoDB
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');

    } catch (error) {
        console.error('Error creating super admin user:', error);
        process.exit(1);
    }
}

// Run the function
createSuperAdminUser();
