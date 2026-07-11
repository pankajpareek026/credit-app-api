# 💳 Credit App API

[![GitHub last commit](https://img.shields.io/github/last-commit/pankajpareek026/credit-app-api)](https://github.com/pankajpareek026/credit-app-api/commits/main)
[![GitHub language count](https://img.shields.io/github/languages/count/pankajpareek026/credit-app-api)](https://github.com/pankajpareek026/credit-app-api)
[![GitHub top language](https://img.shields.io/github/languages/top/pankajpareek026/credit-app-api)](https://github.com/pankajpareek026/credit-app-api)
[![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/pankajpareek026/credit-app-api)](https://github.com/pankajpareek026/credit-app-api)

**A robust, production‑grade RESTful API backend for credit and financial management.**  
Built with Node.js, Express.js, and MongoDB – designed to handle complex financial data, user authentication, budgeting, and administrative functions with a strong focus on data integrity and security.

---

## 📌 Overview

This API serves as the secure backbone for a comprehensive credit application, providing:

- **User Management** – Registration, login, profile updates, and role-based access
- **Transaction Processing** – Credit transactions with full audit trails
- **Budget Tracking** – Custom budget sections with income tracking and balance calculations
- **Admin Oversight** – Dedicated administrative features for system monitoring and user management
- **Secure Vault** – Encrypted storage for sensitive user data and credentials[reference:0]

The system is architected to be scalable, maintainable, and secure, following industry best practices for API development.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **🔐 Secure Vault** | Sensitive user data and financial information are encrypted using AES-256-CBC, ensuring high‑level security[reference:1] |
| **📊 Custom Budget Sections** | Users can create and manage personalized budget categories with income tracking and real‑time balance calculations[reference:2] |
| **👑 Admin System** | Complete administrative panel backend with monitoring, user management, and system oversight capabilities[reference:3] |
| **📈 Real‑time Data** | Live pricing overviews for assets (INR/USD) within the portfolio module[reference:4] |
| **🧩 Modular Architecture** | Clean separation of concerns with dedicated folders for `controllers`, `models`, `routes`, `middleware`, and `utils`[reference:5] |
| **📚 API Documentation** | Comprehensive documentation for all API endpoints and system architecture[reference:6] |
| **☁️ Cloud Integration** | Ready for media asset management via Cloudinary[reference:7] |
| **🛡️ Security‑First** | JWT authentication, rate limiting, input sanitization, and security headers[reference:8] |

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (jsonwebtoken) + bcryptjs for password hashing[reference:9]
- **Validation:** Joi for schema validation[reference:10]
- **File Uploads:** Multer + Cloudinary[reference:11]

### Security Middleware
- **Helmet** – Security headers[reference:12]
- **CORS** – Cross-origin resource sharing[reference:13]
- **Express Rate Limit** – Request throttling[reference:14]
- **Express Mongo Sanitize** – NoSQL injection prevention[reference:15]
- **xss-clean** – XSS attack prevention[reference:16]
- **hpp** – HTTP parameter pollution protection[reference:17]

### DevOps & Tooling
- **Package Manager:** npm
- **Process Manager:** Nodemon (development)
- **Logging:** Winston for structured logging[reference:18]
- **Environment:** dotenv for configuration management[reference:19]

---

## 📁 Project Structure

```text
credit-app-api/
├── Models/                     # Database schemas and models
│   └── (User, Transaction, Budget, Vault models)
├── controllers/                # Request handlers and business logic
├── db/                         # Database connection and configuration
├── middleware/                 # Custom middleware (auth, validation, rate limiting)
├── middlewares/                # Additional middleware utilities
├── migrations/                 # Database migration scripts
├── routes/                     # API route definitions
├── scripts/                    # Utility and automation scripts
│   ├── createSuperAdmin.js     # Super admin creation script
│   └── createSuperAdminUser.js # Admin user creation script
├── utils/                      # Helper functions and utilities
├── index.js                    # Application entry point
├── package.json                # Project dependencies and scripts
├── env.template                # Template for environment variables
├── deploy.sh                   # Deployment script
├── ADMIN_SYSTEM_DOCUMENTATION.md
├── ENHANCED_API_DOCUMENTATION.md
├── NOTES_API_DOCUMENTATION.md
├── CLOUDINARY_SETUP.md
├── SECURITY.md
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** – v16.x or higher (v18+ recommended)
- **MongoDB** – local instance or MongoDB Atlas (cloud)
- **npm** – package manager
- **Cloudinary** account (optional – for file uploads)

### Environment Variables

Create a `.env` file in the project root by copying `env.template`. Below are the key variables you need to configure:

| Variable | Description | Example |
|----------|-------------|---------|
| `port` | Port the server listens on | `2205` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/credit_app` |
| `jwt_key` | Secret key for signing JWT tokens | `your-super-secret-jwt-key` |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `CROSS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |
| `NOTE_ENCRYPTION_KEY` | 32‑char key for notes encryption | `your-secure-encryption-key-32-chars-long` |
| `VAULT_ENCRYPTION_KEY` | 32‑char key for vault encryption | `your-secure-encryption-key-32-chars-long` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `your-cloud-name` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `your-api-key` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `your-api-secret` |
| `SUPER_ADMIN_EMAIL` | Default super admin email | `admin@creditapp.com` |
| `SUPER_ADMIN_PASSWORD` | Default super admin password | `SuperAdmin123!` |

> ⚠️ **Never commit the `.env` file.** It is already ignored via `.gitignore`.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/pankajpareek026/credit-app-api.git
   cd credit-app-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   - Copy `env.template` to `.env`
   - Fill in all required values (see table above)

4. **Start MongoDB**
   - Ensure your MongoDB instance is running locally or have your Atlas connection string ready

5. **Create Super Admin (optional)**
   ```bash
   npm run create-super-admin
   # or
   npm run create-super-admin-user
   ```

6. **Start the server**
   ```bash
   npm start
   # or for development with auto‑restart:
   npm run dev
   ```

7. **Verify**
   - The server will log `Server running on port <PORT>`
   - Test the health endpoint or a protected route with a JWT token

---

## 🔒 Security Best Practices

This API implements multiple layers of security to protect sensitive financial data:

### Authentication & Authorization
- **JWT Tokens** – HMAC SHA256 algorithm with configurable expiration (default: 7 days)[reference:20]
- **Refresh Tokens** – 30‑day expiration with automatic token rotation[reference:21]
- **Secure Storage** – Tokens stored in HTTP‑only cookies[reference:22]
- **Password Hashing** – bcrypt with 12 salt rounds[reference:23]
- **Rate Limiting** – 5 attempts per 15 minutes for auth endpoints[reference:24]

### Data Encryption
- **Notes Encryption** – AES-256-CBC with environment‑managed keys[reference:25]
- **Vault Encryption** – AES-256-CBC for all sensitive credential data[reference:26]
- **Random IV** – Unique Initialization Vector for each encryption operation[reference:27]

### Input Validation & Sanitization
- **Request Validation** – Strict MIME type checking and 10MB size limits[reference:28]
- **NoSQL Injection Prevention** – MongoDB sanitization middleware[reference:29]
- **XSS Protection** – CSP headers and xss‑clean middleware[reference:30]

### Rate Limiting
- **General API** – 100 requests per 15 minutes[reference:31]
- **Authentication** – 5 requests per 15 minutes[reference:32]
- **Sensitive Data** – 50 requests per 15 minutes (notes/vault)[reference:33]

### Security Headers
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` – 1‑year max‑age[reference:34]

### Credentials Check

Before deploying or sharing your code, **always verify** that no credentials are hardcoded:

- **Search for patterns:** `api_key`, `secret`, `password`, `token`, `mongodb+srv`, `privateKey`
- **Check these directories:** `utils/`, `db/`, `controllers/`, `scripts/`
- **If you find any** – replace with environment variables and revoke the exposed secret immediately

---

## 📖 API Documentation

Comprehensive API endpoint documentation is available within the repository:

- **[ENHANCED_API_DOCUMENTATION.md](./ENHANCED_API_DOCUMENTATION.md)** – Detailed breakdown of all API routes, request/response schemas, and examples
- **[NOTES_API_DOCUMENTATION.md](./NOTES_API_DOCUMENTATION.md)** – Specific documentation for the notes/transactions module
- **[ADMIN_SYSTEM_DOCUMENTATION.md](./ADMIN_SYSTEM_DOCUMENTATION.md)** – Guide to administrative features and endpoints
- **[CLOUDINARY_SETUP.md](./CLOUDINARY_SETUP.md)** – Cloudinary integration setup guide
- **[SECURITY.md](./SECURITY.md)** – Complete security documentation

---

## 📦 Deployment

This project can be deployed to any Node.js hosting platform.

### Deploy on Render / Heroku / AWS

1. Push your code to a GitHub repository
2. Set the required environment variables in your hosting platform
3. Use the following commands:
   ```bash
   npm install
   npm start
   ```
4. For production, consider using a process manager like PM2:
   ```bash
   pm2 start index.js --name credit-app-api
   ```

### Deploy with the Provided Script

The repository includes a `deploy.sh` script for automated deployment – review and customise it for your environment.

---

## 🤝 Contributing

Contributions are welcome! If you'd like to improve this project:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code adheres to the existing style and includes relevant documentation updates.

---

## 📄 License

This project is currently **unlicensed**. All rights reserved.  
For usage rights or collaboration inquiries, please contact the author.

---

## 📬 Contact

**Pankaj Pareek**  
- GitHub: [pankajpareek026](https://github.com/pankajpareek026)  
- Project Link: [https://github.com/pankajpareek026/credit-app-api](https://github.com/pankajpareek026/credit-app-api)

---

## 🙏 Acknowledgements

- [Express.js](https://expressjs.com/) – Fast, unopinionated web framework for Node.js
- [MongoDB](https://www.mongodb.com/) – Database for modern applications
- [Mongoose](https://mongoosejs.com/) – Elegant MongoDB object modeling
- [JWT](https://jwt.io/) – JSON Web Tokens for secure authentication
- [Helmet](https://helmetjs.github.io/) – Secure Express apps by setting HTTP headers
- [Cloudinary](https://cloudinary.com/) – Cloud-based image and video management
- [Winston](https://github.com/winstonjs/winston) – A logger for just about everything
