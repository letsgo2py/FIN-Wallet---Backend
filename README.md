# FIN Wallet Backend

Backend service for the FIN Wallet internship assignment. This API powers a role-based finance dashboard with authentication, user management, transaction management, filtering, pagination, and financial summaries.

Frontend app: `https://finwallet001.netlify.app/`

## Overview

The backend is built with Node.js, Express, Prisma, and PostgreSQL.

Implemented capabilities:

- JWT-based authentication with register and login endpoints
- Role-based access control for `SUPER_ADMIN`, `ADMIN`, `ANALYST`, and `VIEWER`
- User management for admins
- Transaction CRUD for authorized roles
- Transaction filtering by date, category, and type
- Pagination on transaction listing
- Summary endpoint with:
  - total income
  - total expenses
  - net balance
  - category-wise totals
  - recent activity
  - monthly trends
  - weekly trends

## Tech Stack

- Node.js
- Express
- Prisma ORM
- PostgreSQL
- JWT
- bcryptjs

## Project Structure

```text
backend/
|-- prisma/
|   |-- schema.prisma
|   `-- seed.js
|-- src/
|   |-- app.js
|   |-- config/
|   |   `-- db.js
|   |-- controllers/
|   |   |-- authController.js
|   |   |-- transactionController.js
|   |   `-- userController.js
|   |-- middleware/
|   |   |-- authMiddleware.js
|   |   `-- roleMiddleware.js
|   `-- routes/
|       |-- authRoutes.js
|       |-- transactionRoutes.js
|       `-- userRoutes.js
|-- server.js
`-- package.json
```

## Role Access

| Role | Dashboard / Records | Summary | Manage Users | Create User | Edit/Delete Transactions |
| --- | --- | --- | --- | --- | --- |
| `SUPER_ADMIN` | Yes | Yes | Yes | Yes | Yes |
| `ADMIN` | Yes | Yes | Yes | Yes, but cannot create `ADMIN` or `SUPER_ADMIN` | Yes |
| `ANALYST` | Yes | Yes | No | No | No |
| `VIEWER` | Yes | No | No | No | No |

Additional role rules implemented in the backend:

- `SUPER_ADMIN` cannot be updated through normal role management flows
- `SUPER_ADMIN` is excluded from the user listing returned to admins
- `ADMIN` cannot change status of `ADMIN` or `SUPER_ADMIN`
- users cannot deactivate their own account

## Input Validation and Guardrails Currently Implemented

- registration requires `name`, `email`, and `password`
- email is normalized to lowercase during registration and user creation
- duplicate email is blocked
- passwords are hashed with `bcryptjs`
- transaction creation and update require `amount`, `type`, `category`, and `date`
- transaction amount must be greater than `0`
- transaction type must be either `INCOME` or `EXPENSE`
- transaction date must be a valid date
- `isActive` must be a boolean when updating user status

Note: the frontend also applies a few client-side checks such as minimum password length, preventing future-date selection in date pickers, and positive-amount checks. Server-side validation is still the source of truth.

## Authentication

The API uses Bearer tokens.

Include the JWT in protected requests:

```http
Authorization: Bearer <token>
```

The login token currently contains:

- `id`
- `role`
- `name`
- `email`

## Environment Variables

Create a `.env` file in the `backend` folder with:

```env
PORT=8080
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DIRECT_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
JWT_SECRET=your_jwt_secret

SUPER_ADMIN_NAME=Super Admin
SUPER_ADMIN_EMAIL=superadmin@example.com
SUPER_ADMIN_PASSWORD=supersecurepassword
```

## Database Schema

### User

- `id`
- `name`
- `email` (unique)
- `password`
- `role`
- `isActive`
- `createdAt`

### Transaction

- `id`
- `amount`
- `type` (`INCOME` or `EXPENSE`)
- `category`
- `date`
- `notes`
- `userId`
- `createdAt`

## API Base URL

Local base URL:

```text
http://localhost:8080
```

## REST API

### Health Check

#### `GET /`

Returns a simple backend status message.

Response:

```json
"Backend is running"
```

### Auth Routes

#### `POST /api/auth/register`

Register a new user.

Request body:

```json
{
  "name": "Abhay Raj",
  "email": "abhra@example.com",
  "password": "password123"
}
```

Success response:

```json
{
  "message": "User registered"
}
```

#### `POST /api/auth/login`

Login an existing user and receive a JWT.

Request body:

```json
{
  "email": "abhra@example.com",
  "password": "password123"
}
```

Success response:

```json
{
  "token": "<jwt>"
}
```

### User Routes

All user routes require authentication and `ADMIN` or `SUPER_ADMIN`.

#### `GET /api/users`

Fetch all manageable users.

Behavior:

- excludes the current logged-in user
- excludes all `SUPER_ADMIN` users

Example response:

```json
[
  {
    "id": 2,
    "name": "Alex",
    "email": "alex@example.com",
    "role": "ANALYST",
    "isActive": true
  }
]
```

#### `POST /api/users/create`

Create a new user.

Request body:

```json
{
  "name": "Priya Sharma",
  "email": "priya@example.com",
  "password": "password123",
  "role": "VIEWER",
  "isActive": true
}
```

Success response:

```json
{
  "message": "User created successfully",
  "user": {
    "id": 3,
    "name": "Priya Sharma",
    "email": "priya@example.com",
    "role": "VIEWER",
    "isActive": true,
    "createdAt": "2026-04-06T10:00:00.000Z"
  }
}
```

Notes:

- allowed roles for creation are `VIEWER`, `ANALYST`, and `ADMIN`
- if the current user is `ADMIN`, they cannot create `ADMIN` or `SUPER_ADMIN`

#### `PUT /api/users/role`

Update a user's role.

Request body:

```json
{
  "userId": 3,
  "role": "ANALYST"
}
```

Restrictions:

- cannot assign `SUPER_ADMIN`
- cannot modify a target user who is already `SUPER_ADMIN`

#### `PUT /api/users/status`

Activate or deactivate a user.

Request body:

```json
{
  "userId": 3,
  "isActive": false
}
```

Restrictions:

- `ADMIN` cannot change status of `ADMIN` or `SUPER_ADMIN`
- users cannot deactivate themselves

### Transaction Routes

All transaction routes require authentication.

#### `GET /api/transactions`

Fetch paginated transactions for the logged-in user.

Allowed roles:

- `VIEWER`
- `ANALYST`
- `ADMIN`
- `SUPER_ADMIN`

Supported query parameters:

- `page`
- `category`
- `type`
- `date`

Example:

```http
GET /api/transactions?page=1&category=Food&type=EXPENSE&date=2026-04-06
```

Success response:

```json
{
  "transactions": [],
  "totalRecords": 0,
  "currentPage": 1,
  "totalPages": 1
}
```

Notes:

- transactions are filtered by the logged-in user's `id`
- default page size is `10`
- results are ordered by `createdAt` descending

#### `POST /api/transactions/create`

Create a transaction.

Allowed roles:

- `ADMIN`
- `SUPER_ADMIN`

Request body:

```json
{
  "amount": 2500,
  "type": "INCOME",
  "category": "Salary",
  "date": "2026-04-06T00:00:00.000Z",
  "notes": "Monthly salary"
}
```

Success response:

```json
{
  "message": "Transaction created successfully",
  "transaction": {
    "id": 10,
    "amount": 2500,
    "type": "INCOME",
    "category": "Salary",
    "date": "2026-04-06T00:00:00.000Z",
    "notes": "Monthly salary",
    "userId": 1,
    "createdAt": "2026-04-06T10:00:00.000Z"
  }
}
```

#### `PUT /api/transactions/:id`

Update a transaction.

Allowed roles:

- `ADMIN`
- `SUPER_ADMIN`

Request body:

```json
{
  "amount": 180,
  "type": "EXPENSE",
  "category": "Food",
  "date": "2026-04-06T00:00:00.000Z",
  "notes": "Lunch"
}
```

Important behavior:

- the transaction must exist
- the logged-in user must own the transaction

#### `DELETE /api/transactions/:id`

Delete a transaction.

Allowed roles:

- `ADMIN`
- `SUPER_ADMIN`

Success response:

```json
{
  "message": "Transaction deleted successfully",
  "id": 10
}
```

#### `GET /api/transactions/summary`

Fetch summary data for the logged-in user.

Allowed roles:

- `ANALYST`
- `ADMIN`
- `SUPER_ADMIN`

Success response shape:

```json
{
  "overview": {
    "totalIncome": 5000,
    "totalExpenses": 1200,
    "netBalance": 3800
  },
  "categoryWiseTotals": [
    {
      "category": "Food",
      "income": 0,
      "expense": 500,
      "total": 500
    }
  ],
  "recentActivity": [],
  "monthlyTrends": [],
  "weeklyTrends": []
}
```

Current summary logic:

- overview totals are calculated from all transactions of the logged-in user
- recent activity returns the latest `5` transactions
- monthly trends cover roughly the last `6` months
- weekly trends cover roughly the last `8` weeks

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Generate Prisma client

```bash
npx prisma generate
```

### 3. Run database migrations

```bash
npx prisma migrate dev
```

### 4. Seed the initial super admin

```bash
node prisma/seed.js
```

### 5. Start the development server

```bash
npm run dev
```

Production start:

```bash
npm start
```

## Available Scripts

- `npm run dev` - start backend with nodemon
- `npm start` - start backend with Node.js
- `npm run deploy` - deploy to Google Cloud Run

## Assumptions Used in This Project

- at least one `SUPER_ADMIN` is created from the backend environment and seed flow
- `SUPER_ADMIN` is not meant to be created from the public client registration flow
- normal registration creates a standard user with the default Prisma role
- transaction records are user-specific
- summary data is generated per logged-in user

## Current Limitations / Improvement Areas

- no rate limiting is implemented yet
- validation can be centralized further with dedicated middleware or schema validation
- tests are not included yet

## Deployment

Current deployment targets referenced in the project:

- Backend: Google Cloud Run
- Frontend: Netlify

