# 💳 Credit App API

[![GitHub last commit](https://img.shields.io/github/last-commit/pankajpareek026/credit-app-api)](https://github.com/pankajpareek026/credit-app-api/commits/main)
[![GitHub language count](https://img.shields.io/github/languages/count/pankajpareek026/credit-app-api)](https://github.com/pankajpareek026/credit-app-api)
[![GitHub top language](https://img.shields.io/github/languages/top/pankajpareek026/credit-app-api)](https://github.com/pankajpareek026/credit-app-api)

A robust and secure RESTful API backend for a comprehensive credit and financial management application. This system is built to handle complex financial data, user authentication, budgeting, and administrative functions with a focus on data integrity and security.

## 🚀 Overview

This API serves as the backbone for a credit application, providing functionalities for user management, transaction processing, budget tracking, income monitoring, and administrative oversight. It is designed to be scalable, maintainable, and secure, leveraging modern Node.js and Express.js practices.

**Key Capabilities:**
*   **User Authentication & Authorization:** JWT-based secure access with role-based permissions (User, Admin).
*   **Financial Management:** Core logic for credit transactions, income tracking, and custom budget sections.
*   **Data Security:** Implements encryption for sensitive data and environment-based secret management.
*   **Admin Dashboard:** Dedicated administrative features for system monitoring and user management.
*   **Cloud Integration:** Ready for media asset management via Cloudinary.

## ✨ Key Features

*   **Secure Vault:** Sensitive user data and financial information are encrypted, ensuring high-level security.
*   **Custom Budget Sections:** Users can create and manage personalized budget categories with income tracking and balance calculations.
*   **Admin System:** A complete administrative panel backend with monitoring and management capabilities.
*   **Real-time Data:** Features real-time pricing overviews for assets (INR/USD) within the portfolio module.
*   **Modular Architecture:** Clean separation of concerns with dedicated folders for `controllers`, `models`, `routes`, `middleware`, and `utils`.
*   **API Documentation:** Includes comprehensive documentation for API endpoints and system architecture.

## 🛠️ Tech Stack

*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** (Implied) MongoDB with Mongoose ODM (based on `Models` & `db` structure)
*   **Authentication:** JSON Web Tokens (JWT)
*   **Cloud Services:** Cloudinary (for file uploads)
*   **Language:** JavaScript (98.7%), Shell (1.3%)
*   **Other Tools:** `dotenv` for environment variables, `bcrypt` for password hashing.

## 📁 Project Structure

```text
credit-app-api/
├── Models/             # Database schemas and models
│   └── ... (User, Transaction, Budget models)
├── controllers/        # Request handlers and business logic
├── db/                 # Database connection and configuration
├── middleware/         # Custom middleware (auth, validation, etc.)
├── middlewares/        # (Legacy or additional middleware)
├── migrations/         # Database migration scripts
├── routes/             # API route definitions
├── scripts/            # Utility and automation scripts
├── utils/              # Helper functions and utilities
├── index.js            # Application entry point
├── package.json        # Project dependencies and scripts
├── env.template        # Template for environment variables
├── deploy.sh           # Deployment script
├── ADMIN_SYSTEM_DOCUMENTATION.md
├── ENHANCED_API_DOCUMENTATION.md
├── NOTES_API_DOCUMENTATION.md
└── SECURITY.md
