const mongoose = require('mongoose');
const Admin = require('../Models/admin.modal');
require('dotenv').config();

/**
 * Script to create initial super admin user
 * Run this script once to set up the first admin user
 */

async function createSuperAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('Connected to MongoDB');

        // Check if super admin already exists
        const existingSuperAdmin = await Admin.findOne({ role: 'super_admin' });
        
        if (existingSuperAdmin) {
            console.log('Super admin already exists:', existingSuperAdmin.username);
            console.log('Email:', existingSuperAdmin.email);
            return;
        }

        // Create super admin with default permissions
        const superAdminData = {
            username: process.env.SUPER_ADMIN_USERNAME || 'superadmin',
            email: process.env.SUPER_ADMIN_EMAIL || 'admin@creditapp.com',
            password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!',
            firstName: process.env.SUPER_ADMIN_FIRST_NAME || 'Super',
            lastName: process.env.SUPER_ADMIN_LAST_NAME || 'Admin',
            role: 'super_admin',
            isActive: true,
            isVerified: true,
            permissions: {
                userManagement: {
                    canView: true,
                    canCreate: true,
                    canUpdate: true,
                    canDelete: true,
                    canSuspend: true
                },
                systemManagement: {
                    canViewAnalytics: true,
                    canViewLogs: true,
                    canManageSettings: true,
                    canViewReports: true
                },
                contentManagement: {
                    canManageClients: true,
                    canManageTransactions: true,
                    canManageBills: true,
                    canManageExpenses: true,
                    canManageTasks: true
                }
            }
        };

        const superAdmin = new Admin(superAdminData);
        await superAdmin.save();

        console.log('✅ Super admin created successfully!');
        console.log('Username:', superAdmin.username);
        console.log('Email:', superAdmin.email);
        console.log('Role:', superAdmin.role);
        console.log('');
        console.log('🔐 Default Login Credentials:');
        console.log('Username:', superAdminData.username);
        console.log('Password:', superAdminData.password);
        console.log('');
        console.log('⚠️  IMPORTANT: Change the default password after first login!');
        console.log('');
        console.log('📝 You can now login to the admin panel using these credentials.');

    } catch (error) {
        console.error('❌ Error creating super admin:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the script
createSuperAdmin();
