#!/bin/bash

#######################################
# AutoSurvey Setup Script
#
# This script sets up the entire application:
# - PHP/Composer dependencies
# - Node.js/npm dependencies
# - Environment configuration
# - Database creation and migrations
# - Database seeding
# - Frontend build (Vite/TypeScript)
# - Laravel optimization
#######################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  AutoSurvey Setup Script${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

#######################################
# Step 1: Check requirements
#######################################
echo -e "${YELLOW}[1/7] Checking requirements...${NC}"

# Check PHP
if ! command -v php &> /dev/null; then
    echo -e "${RED}Error: PHP is not installed${NC}"
    exit 1
fi
PHP_VERSION=$(php -r "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;")
echo -e "  PHP version: ${GREEN}${PHP_VERSION}${NC}"

# Check required PHP version (8.1+)
PHP_MAJOR=$(php -r "echo PHP_MAJOR_VERSION;")
PHP_MINOR=$(php -r "echo PHP_MINOR_VERSION;")
if [ "$PHP_MAJOR" -lt 8 ] || ([ "$PHP_MAJOR" -eq 8 ] && [ "$PHP_MINOR" -lt 1 ]); then
    echo -e "${RED}Error: PHP 8.1 or higher is required${NC}"
    exit 1
fi

# Check Composer
if ! command -v composer &> /dev/null; then
    echo -e "${RED}Error: Composer is not installed${NC}"
    echo "  Install from: https://getcomposer.org/"
    exit 1
fi
echo -e "  Composer: ${GREEN}OK${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "  Node.js version: ${GREEN}${NODE_VERSION}${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi
echo -e "  npm: ${GREEN}OK${NC}"

# Check MySQL client
if ! command -v mysql &> /dev/null; then
    echo -e "  ${YELLOW}Warning: MySQL client not found (database creation may fail)${NC}"
else
    echo -e "  MySQL client: ${GREEN}OK${NC}"
fi

echo ""

#######################################
# Step 2: Setup PHP/Composer
#######################################
echo -e "${YELLOW}[2/7] Installing PHP dependencies...${NC}"

composer install --no-interaction --prefer-dist --optimize-autoloader

echo -e "  PHP dependencies: ${GREEN}Complete${NC}"
echo ""

#######################################
# Step 3: Environment configuration
#######################################
echo -e "${YELLOW}[3/7] Configuring environment...${NC}"

# Create .env if not exists
if [ ! -f .env ]; then
    echo "  Creating .env file from .env.example..."
    cp .env.example .env
    echo -e "  ${YELLOW}Note: Please review .env and configure database/API settings${NC}"
else
    echo "  .env file already exists"
fi

# Generate app key if not set
if ! grep -q "^APP_KEY=base64:" .env; then
    echo "  Generating application key..."
    php artisan key:generate --force
else
    echo "  Application key already set"
fi

# Create storage directories
mkdir -p storage/framework/{cache,sessions,views}
mkdir -p storage/logs
mkdir -p bootstrap/cache

# Set permissions
chmod -R 775 storage bootstrap/cache 2>/dev/null || true

echo -e "  Environment: ${GREEN}Complete${NC}"
echo ""

#######################################
# Step 4: Setup Node.js/npm
#######################################
echo -e "${YELLOW}[4/7] Installing Node.js dependencies...${NC}"

npm install

echo -e "  Node.js dependencies: ${GREEN}Complete${NC}"
echo ""

#######################################
# Step 5: Database setup
#######################################
echo -e "${YELLOW}[5/7] Setting up database...${NC}"

# Read database configuration from .env
DB_CONNECTION=$(grep "^DB_CONNECTION=" .env | cut -d '=' -f2)
DB_HOST=$(grep "^DB_HOST=" .env | cut -d '=' -f2)
DB_PORT=$(grep "^DB_PORT=" .env | cut -d '=' -f2)
DB_DATABASE=$(grep "^DB_DATABASE=" .env | cut -d '=' -f2)
DB_USERNAME=$(grep "^DB_USERNAME=" .env | cut -d '=' -f2)
DB_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d '=' -f2)

# Default values
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-3306}
DB_DATABASE=${DB_DATABASE:-autosurvey}

echo "  Database: ${DB_DATABASE}"
echo "  Host: ${DB_HOST}:${DB_PORT}"

# Check if MySQL and create database if needed
if [ "$DB_CONNECTION" = "mysql" ] && command -v mysql &> /dev/null; then
    echo "  Checking if database exists..."

    # Build MySQL command
    MYSQL_CMD="mysql -h $DB_HOST -P $DB_PORT -u $DB_USERNAME"
    if [ -n "$DB_PASSWORD" ]; then
        MYSQL_CMD="$MYSQL_CMD -p$DB_PASSWORD"
    fi

    # Check if database exists
    DB_EXISTS=$($MYSQL_CMD -e "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='$DB_DATABASE'" 2>/dev/null | grep -c "$DB_DATABASE" || echo "0")

    if [ "$DB_EXISTS" = "0" ]; then
        echo "  Creating database '${DB_DATABASE}'..."
        $MYSQL_CMD -e "CREATE DATABASE \`${DB_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "  Database created: ${GREEN}OK${NC}"
        else
            echo -e "  ${RED}Failed to create database. Please create it manually.${NC}"
        fi
    else
        echo -e "  Database already exists: ${GREEN}OK${NC}"
    fi
fi

# Check migration status
echo "  Checking migration status..."
MIGRATION_STATUS=$(php artisan migrate:status 2>&1 || echo "error")

if echo "$MIGRATION_STATUS" | grep -q "Migration table not found\|error\|could not find driver"; then
    # Fresh installation - run all migrations
    echo "  Running migrations..."
    php artisan migrate --force

    echo "  Running database seeders..."
    php artisan db:seed --force

    echo -e "  Database migration: ${GREEN}Complete${NC}"
elif echo "$MIGRATION_STATUS" | grep -q "Pending"; then
    # Pending migrations exist
    echo "  Running pending migrations..."
    php artisan migrate --force
    echo -e "  Database migration: ${GREEN}Complete${NC}"
else
    echo -e "  All migrations already applied: ${GREEN}OK${NC}"
fi

echo ""

#######################################
# Step 6: Build Frontend (Vite/TypeScript)
#######################################
echo -e "${YELLOW}[6/7] Building frontend assets (Vite/TypeScript)...${NC}"

# Clean previous build
if [ -d "public/build" ]; then
    echo "  Cleaning previous build..."
    rm -rf public/build
fi

# Run Vite build
npm run build

if [ -d "public/build" ] && [ -f "public/build/manifest.json" ]; then
    echo -e "  Frontend build: ${GREEN}Complete${NC}"
else
    echo -e "  ${RED}Frontend build may have failed. Check for errors above.${NC}"
fi

echo ""

#######################################
# Step 7: Laravel optimization
#######################################
echo -e "${YELLOW}[7/7] Optimizing Laravel...${NC}"

# Clear all caches first
php artisan config:clear 2>/dev/null || true
php artisan route:clear 2>/dev/null || true
php artisan view:clear 2>/dev/null || true
php artisan cache:clear 2>/dev/null || true

# Check if production mode
APP_ENV=$(grep "^APP_ENV=" .env | cut -d '=' -f2)

if [ "$APP_ENV" = "production" ]; then
    echo "  Production mode detected. Caching configuration..."
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    echo -e "  Optimization: ${GREEN}Complete${NC}"
else
    echo "  Development mode - skipping cache"
    echo -e "  Optimization: ${GREEN}Skipped (dev mode)${NC}"
fi

echo ""

#######################################
# Done
#######################################
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "Summary:"
echo "  - PHP dependencies installed"
echo "  - Node.js dependencies installed"
echo "  - Environment configured"
echo "  - Database migrated"
echo "  - Frontend built"
echo ""
echo "Next steps:"
echo ""
echo "1. Review .env configuration:"
echo "   - Database: DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD"
echo "   - AI API keys: CLAUDE_API_KEY or OPENAI_API_KEY"
echo ""
echo "2. Create an admin user:"
echo "   ${BLUE}php artisan user:create${NC}"
echo ""
echo "3. For Apache, add to your virtual host config:"
echo ""
echo "   Alias /autosurvey ${SCRIPT_DIR}/public"
echo "   <Directory ${SCRIPT_DIR}/public>"
echo "       AllowOverride All"
echo "       Require all granted"
echo "   </Directory>"
echo ""
echo "4. Access the application at:"
echo "   ${BLUE}https://your-domain.org/autosurvey/${NC}"
echo ""
echo "For development server:"
echo "   ${BLUE}php artisan serve${NC}"
echo ""
