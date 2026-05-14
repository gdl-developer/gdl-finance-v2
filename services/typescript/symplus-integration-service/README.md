# CBA Symplus Integration Service

A NestJS-based API service that integrates with the Symplus financial platform, providing endpoints for customer management, fund operations, and account management.

## Features

- **Customer Management**: Create, retrieve, and update individual and corporate customers
- **Fund Operations**: Get funds, fund accounts, and retrieve fund account information
- **Account Management**: Joint account creation and management
- **API Integration**: Seamless integration with Symplus GDL API
- **Request Logging**: Automatic logging of all API requests and responses
- **Validation**: Comprehensive DTO validation for all endpoints

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: MySQL with TypeORM
- **Authentication**: Custom header-based authentication
- **Documentation**: Swagger/OpenAPI

## Installation

```bash
$ npm install
```

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DB_HOST=your_database_host
DB_PORT=25060
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_NAME=your_database_name

# Symplus API Configuration
SYMPLUS_BASEURL=https://o401.neuappx.com/symplus/GDLAPI/core/v3
SYMPLUS_CLIENT_ID=your_client_id
SYMPLUS_CLIENT_KEY=your_client_key
SYMPLUS_PRIVATE_KEY=your_private_key
SYMPLUS_PUBLIC_KEY=your_public_key

# Application Configuration
NODE_ENV=development
LOG_EKY=your_log_encryption_key
```

## Running the Application

```bash
# Development mode with hot reload
$ npm run start:dev

# Production mode
$ npm run start:prod

# Debug mode
$ npm run start:debug
```

The application will start on port 3011 by default (configurable via `PORT` environment variable).

## API Documentation

### Base URL
```
http://localhost:3011
```

### Authentication
All Symplus API endpoints use header-based authentication:
- `Authorization-Key`: Dynamically generated hash
- `Client-Key`: From environment configuration

### Available Endpoints

#### Audit Logger
- `GET /audit/logs` - Retrieve audit logs with optional query parameters

#### Customer Management
- `GET /customer/one/:customerid` - Get customer by ID
- `GET /customer/account/:accountno` - Get customer by account number
- `GET /customer/email/:email` - Get customer by email
- `GET /customer/name/:name` - Get customer by name
- `GET /customer/phone/:phone` - Get customer by phone
- `GET /customer/account/plan/:productid` - Get customers by account plan
- `GET /customer/all` - Get all customers
- `GET /customer/bank/:bvn` - Get customer by BVN
- `GET /customer/position/:customerid` - Get customer position
- `GET /customer/position2/:customerid` - Get customer position (alternative)

- `POST /customer/new/individual/account` - Create individual customer
- `POST /customer/new/corporate/account` - Create corporate customer
- `POST /customer/new/joint/account` - Create joint account
- `POST /customer/update/email` - Update customer email
- `POST /customer/update/address` - Update customer address
- `POST /customer/update/id` - Update customer ID
- `POST /customer/update/employment` - Update customer employment
- `POST /customer/remove/employment` - Remove customer employment

#### Corporates
- `GET /corporates` - Get all corporates
- `GET /corporates/:id` - Get corporate by ID

#### Symplus API Requests
- `GET /symplus/api/requests` - Get all API requests
- `GET /symplus/api/requests/:id` - Get API request by ID
- `GET /symplus/api/requests/get-funds` - Get available funds
- `GET /symplus/api/requests/get-countries` - Get countries list
- `GET /symplus/api/requests/get-fund-accounts/:customerId` - Get fund accounts for customer
- `POST /symplus/api/requests/fund-account` - Fund an account

## Testing

### Unit Tests
```bash
$ npm run test
```

### E2E Tests
```bash
$ npm run test:e2e
```

### Test Coverage
```bash
$ npm run test:cov
```

## API Testing with Postman

Import the Postman collection from `docs/CBA-Symplus-Integration-Service.postman_collection.json` to test the APIs.

### Collection Variables
- `base_url`: Set to your server URL (default: `http://localhost:3011`)

## Database

The application uses TypeORM with MySQL. Run migrations to set up the database:

```bash
$ npm run migration
```

## Swagger Documentation

Access the Swagger UI at:
```
http://localhost:3011/api
```

## Project Structure

```
src/
├── app.module.ts                 # Main application module
├── main.ts                       # Application entry point
├── common/                       # Shared utilities and services
│   ├── abstracts/               # Abstract base classes
│   ├── audit-logger/            # Audit logging functionality
│   ├── external-api-calls/      # External API call services
│   ├── exceptions/              # Custom exceptions
│   └── utils/                   # Utility functions
├── customer-management/         # Customer management module
│   ├── corporates/              # Corporate customer management
│   ├── dto/                     # Data transfer objects
│   ├── entities/                # Database entities
│   └── *.controller.ts          # Controllers
├── general/                     # General purpose module
├── symplus-api-requests/        # Symplus API integration
│   ├── dto/                     # API request DTOs
│   └── *.controller.ts          # API controllers
└── migrations/                  # Database migrations
```

## Development Guidelines

- Use TypeScript for type safety
- Follow NestJS best practices
- Implement proper error handling
- Use DTOs for request/response validation
- Log all external API calls
- Write comprehensive tests

## License

This project is proprietary software.
