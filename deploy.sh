#!/bin/bash

# Production Deployment Script for Credit App API
# This script ensures secure deployment with proper checks

set -e  # Exit on any error

echo "🚀 Starting production deployment..."

# Configuration
APP_NAME="credit-app-api"
NODE_ENV="production"
PORT=${PORT:-2205}
LOG_DIR="./logs"
BACKUP_DIR="./backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root (not recommended for production)
if [[ $EUID -eq 0 ]]; then
   print_warning "Running as root is not recommended for production"
fi

# Check Node.js version
print_status "Checking Node.js version..."
NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# Check npm version
print_status "Checking npm version..."
NPM_VERSION=$(npm --version)
print_status "npm version: $NPM_VERSION"

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p $LOG_DIR
mkdir -p $BACKUP_DIR
mkdir -p ./uploads

# Set proper permissions
print_status "Setting proper permissions..."
chmod 755 $LOG_DIR
chmod 755 $BACKUP_DIR
chmod 755 ./uploads

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found! Please create one based on env.template"
    exit 1
fi

# Validate environment variables
print_status "Validating environment variables..."
source .env

required_vars=("jwt_key" "MONGODB_URI" "NOTE_ENCRYPTION_KEY" "VAULT_ENCRYPTION_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        print_error "Required environment variable $var is not set"
        exit 1
    fi
done

# Check if encryption keys are secure
if [ "$NOTE_ENCRYPTION_KEY" = "your-secure-encryption-key-32-chars-long-for-notes" ]; then
    print_error "Please change the NOTE_ENCRYPTION_KEY in your .env file"
    exit 1
fi

if [ "$VAULT_ENCRYPTION_KEY" = "your-secure-encryption-key-32-chars-long-for-vault" ]; then
    print_error "Please change the VAULT_ENCRYPTION_KEY in your .env file"
    exit 1
fi

if [ "$jwt_key" = "your-super-secret-jwt-key-change-this-in-production" ]; then
    print_error "Please change the jwt_key in your .env file"
    exit 1
fi

print_status "Environment variables validated successfully"

# Install dependencies
print_status "Installing dependencies..."
npm ci --only=production

# Run security audit
print_status "Running security audit..."
npm audit --audit-level=high || {
    print_warning "Security vulnerabilities found. Please review and fix them."
}

# Check for outdated packages
print_status "Checking for outdated packages..."
npm outdated || print_status "All packages are up to date"

# Create backup of current deployment
if [ -d "dist" ]; then
    print_status "Creating backup of current deployment..."
    timestamp=$(date +%Y%m%d_%H%M%S)
    tar -czf "$BACKUP_DIR/backup_$timestamp.tar.gz" dist/
fi

# Build application (if needed)
print_status "Building application..."
npm run build 2>/dev/null || print_status "No build script found, skipping build"

# Check if MongoDB is running
print_status "Checking MongoDB connection..."
if ! node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/credit_app')
  .then(() => {
    console.log('MongoDB connection successful');
    process.exit(0);
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
" 2>/dev/null; then
    print_error "MongoDB connection failed. Please ensure MongoDB is running."
    exit 1
fi

# Create systemd service file (if running on Linux)
if command -v systemctl &> /dev/null; then
    print_status "Creating systemd service file..."
    cat > /etc/systemd/system/$APP_NAME.service << EOF
[Unit]
Description=Credit App API
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
Environment=NODE_ENV=production
Environment=PORT=$PORT
ExecStart=$(which node) index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$APP_NAME

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$(pwd)/logs $(pwd)/uploads $(pwd)/backups

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    sudo systemctl daemon-reload
    sudo systemctl enable $APP_NAME
    print_status "Systemd service created and enabled"
fi

# Create PM2 ecosystem file (alternative to systemd)
print_status "Creating PM2 ecosystem file..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$APP_NAME',
    script: 'index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: $PORT
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads', 'backups'],
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Create log rotation configuration
print_status "Setting up log rotation..."
cat > /etc/logrotate.d/$APP_NAME << EOF
$(pwd)/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        systemctl reload $APP_NAME > /dev/null 2>&1 || true
    endscript
}
EOF

# Set up firewall rules (if ufw is available)
if command -v ufw &> /dev/null; then
    print_status "Setting up firewall rules..."
    sudo ufw allow $PORT/tcp
    sudo ufw allow 22/tcp  # SSH
    print_status "Firewall rules configured"
fi

# Create health check script
print_status "Creating health check script..."
cat > health-check.sh << 'EOF'
#!/bin/bash
HEALTH_URL="http://localhost:2205/api/health"
MAX_RETRIES=3
RETRY_DELAY=5

for i in $(seq 1 $MAX_RETRIES); do
    if curl -f -s $HEALTH_URL > /dev/null; then
        echo "✅ Health check passed"
        exit 0
    else
        echo "❌ Health check failed (attempt $i/$MAX_RETRIES)"
        if [ $i -lt $MAX_RETRIES ]; then
            sleep $RETRY_DELAY
        fi
    fi
done

echo "❌ Health check failed after $MAX_RETRIES attempts"
exit 1
EOF

chmod +x health-check.sh

# Create monitoring script
print_status "Creating monitoring script..."
cat > monitor.sh << 'EOF'
#!/bin/bash
LOG_FILE="./logs/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check if process is running
if pgrep -f "node.*index.js" > /dev/null; then
    echo "[$DATE] ✅ Process is running" >> $LOG_FILE
else
    echo "[$DATE] ❌ Process is not running" >> $LOG_FILE
    # Restart the process
    npm start &
fi

# Check memory usage
MEMORY_USAGE=$(ps aux | grep "node.*index.js" | grep -v grep | awk '{print $4}')
if [ ! -z "$MEMORY_USAGE" ]; then
    echo "[$DATE] Memory usage: ${MEMORY_USAGE}%" >> $LOG_FILE
fi

# Check disk space
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "[$DATE] ⚠️  Disk usage is high: ${DISK_USAGE}%" >> $LOG_FILE
fi
EOF

chmod +x monitor.sh

# Set up cron job for monitoring
print_status "Setting up monitoring cron job..."
(crontab -l 2>/dev/null; echo "*/5 * * * * $(pwd)/monitor.sh") | crontab -

# Create startup script
print_status "Creating startup script..."
cat > start.sh << 'EOF'
#!/bin/bash
echo "Starting Credit App API..."

# Check if already running
if pgrep -f "node.*index.js" > /dev/null; then
    echo "Process is already running"
    exit 1
fi

# Start the application
NODE_ENV=production node index.js
EOF

chmod +x start.sh

# Create stop script
print_status "Creating stop script..."
cat > stop.sh << 'EOF'
#!/bin/bash
echo "Stopping Credit App API..."

# Find and kill the process
pkill -f "node.*index.js" || echo "No process found to stop"
EOF

chmod +x stop.sh

# Create restart script
print_status "Creating restart script..."
cat > restart.sh << 'EOF'
#!/bin/bash
echo "Restarting Credit App API..."

# Stop the process
./stop.sh

# Wait a moment
sleep 2

# Start the process
./start.sh
EOF

chmod +x restart.sh

# Final checks
print_status "Running final checks..."

# Check if all required files exist
required_files=("index.js" "package.json" ".env" "ecosystem.config.js")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file $file not found"
        exit 1
    fi
done

# Test the application
print_status "Testing application startup..."
timeout 10s node index.js &
APP_PID=$!
sleep 3

if kill -0 $APP_PID 2>/dev/null; then
    print_status "Application started successfully"
    kill $APP_PID
else
    print_error "Application failed to start"
    exit 1
fi

print_status "🎉 Deployment completed successfully!"
print_status "To start the application:"
print_status "  - Using PM2: pm2 start ecosystem.config.js"
print_status "  - Using systemd: sudo systemctl start $APP_NAME"
print_status "  - Direct: ./start.sh"
print_status ""
print_status "To monitor the application:"
print_status "  - Health check: ./health-check.sh"
print_status "  - Logs: tail -f ./logs/combined.log"
print_status ""
print_status "Remember to:"
print_status "  - Configure your reverse proxy (nginx/apache)"
print_status "  - Set up SSL certificates"
print_status "  - Configure backup strategies"
print_status "  - Set up monitoring and alerting" 