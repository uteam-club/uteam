# VISTA UTEAM Setup Guide

This guide provides step-by-step instructions for setting up the VISTA UTEAM project for both local development and production deployment.

## Prerequisites

Before starting, make sure you have the following installed:

- Node.js (v18.17.0 or later)
- npm (v9.6.7 or later)
- Git
- PostgreSQL (v14 or later)
- Docker (optional, for containerized development)

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/uteam-club/VISTA-UTEAM.git
cd VISTA-UTEAM
```

### 2. Environment Variables

Create a `.env` file in the root directory based on the `.env.example` template:

```bash
cp .env.example .env
```

Update the following key variables:

```
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/vista_uteam?schema=public"
DIRECT_URL="postgresql://username:password@localhost:5432/vista_uteam?schema=public"

# Supabase (if using)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Storage
NEXT_PUBLIC_AWS_S3_BUCKET_NAME=your_bucket_name
NEXT_PUBLIC_AWS_REGION=your_region
AWS_S3_ACCESS_KEY=your_access_key
AWS_S3_SECRET_KEY=your_secret_key

# Email (optional)
EMAIL_SERVER=smtp://username:password@smtp.example.com:587
EMAIL_FROM=noreply@example.com
```

Generate a secure `NEXTAUTH_SECRET` using:

```bash
openssl rand -base64 32
```

### 3. Install Dependencies

```bash
npm install
```

## Database Setup

### 1. Create a Local Database

```bash
# Login to PostgreSQL
psql -U postgres

# Create a new database
CREATE DATABASE vista_uteam;

# Exit
\q
```

### 2. Initialize the Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

### 3. Seed the Database (Optional)

If you need initial data:

```bash
npx prisma db seed
```

## Local Development

### 1. Start the Development Server

```bash
npm run dev
```

This will start the application at http://localhost:3000.

### 2. Accessing the Application

- Frontend: http://localhost:3000
- API Routes: http://localhost:3000/api/...
- Prisma Studio (database GUI): `npx prisma studio` (runs at http://localhost:5555)

### 3. Common Development Commands

```bash
# Lint the codebase
npm run lint

# Run tests
npm run test

# Build the application
npm run build

# Start the built application
npm run start

# Format the codebase
npm run format
```

## Troubleshooting Local Development

### Database Connection Issues

If you encounter database connection problems:

1. Verify your PostgreSQL service is running:
   ```bash
   # For macOS
   brew services list
   
   # For Linux
   sudo systemctl status postgresql
   
   # For Windows
   net start | findstr PostgreSQL
   ```

2. Check your `.env` file database credentials are correct

3. Try connecting directly with psql to verify credentials:
   ```bash
   psql -U username -d vista_uteam -h localhost
   ```

4. Reset the Prisma client:
   ```bash
   npx prisma generate --force
   ```

### Next.js Build Errors

If you encounter build errors:

1. Clear the Next.js cache:
   ```bash
   rm -rf .next
   ```

2. Check for TypeScript errors:
   ```bash
   npx tsc --noEmit
   ```

3. Try reinstalling dependencies:
   ```bash
   rm -rf node_modules
   rm package-lock.json
   npm install
   ```

## Deployment

### Deploying to Vercel

#### 1. Prepare for Deployment

```bash
# Make sure your git repository is clean
git add .
git commit -m "Prepare for deployment"
```

#### 2. Configure Vercel CLI (Optional)

If using the Vercel CLI:

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link to existing project
vercel link
```

#### 3. Deploy

**Option 1: Using GitHub Integration (Recommended)**

1. Push your code to GitHub
2. Connect your repository in the Vercel dashboard
3. Configure environment variables in the Vercel project settings
4. Deploy from the Vercel dashboard

**Option 2: Using Vercel CLI**

```bash
vercel --prod
```

#### 4. Environment Variables in Vercel

Set all the environment variables from your `.env` file in the Vercel project settings, paying special attention to:

- `DATABASE_URL` (use a production database)
- `DIRECT_URL` (required for Prisma when using connection pooling)
- `NEXTAUTH_URL` (set to your production URL)
- `NEXTAUTH_SECRET` (use a strong, unique secret)

### Database Setup for Production

#### Option 1: Managed PostgreSQL (Recommended)

1. Create a database using a service like Supabase, Neon, or Railway
2. Update the `DATABASE_URL` in your Vercel environment variables
3. Run migrations on the production database:
   ```bash
   npx prisma migrate deploy
   ```

#### Option 2: Self-hosted PostgreSQL

1. Set up a PostgreSQL server
2. Configure networking to allow connections from your Vercel deployment
3. Create a database and user with appropriate permissions
4. Update the `DATABASE_URL` in your Vercel environment variables

## Post-Deployment Verification

After deploying, verify the following:

1. Application loads correctly at your deployment URL
2. Authentication works properly
3. Database operations function as expected
4. Images and assets load correctly
5. Check for any console errors

## Common Deployment Issues

### Database Connection Problems

If your deployed application can't connect to the database:

1. Verify the `DATABASE_URL` format is correct
2. Ensure the database server allows connections from Vercel's IP range
3. Check if you need to enable connection pooling (for Vercel Serverless Functions)

### Missing Environment Variables

If functionality is broken due to missing environment variables:

1. Check the Vercel dashboard for any missing variables
2. Verify that all variables are correctly formatted
3. Remember that variables with the `NEXT_PUBLIC_` prefix are exposed to the browser

### Build Failures

If the build fails on Vercel:

1. Check the build logs for specific errors
2. Verify that the application builds locally with `npm run build`
3. Try clearing the Vercel project cache and rebuilding

## Maintenance

### Updating Dependencies

Regularly update dependencies to stay secure:

```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# For major version upgrades
npx npm-check-updates -u
npm install
```

### Database Migrations

When modifying the database schema:

1. Update the Prisma schema (`prisma/schema.prisma`)
2. Generate a migration:
   ```bash
   npx prisma migrate dev --name descriptive_name
   ```
3. Apply the migration to production:
   ```bash
   npx prisma migrate deploy
   ```

### Monitoring

Set up monitoring for your production deployment:

1. Configure Vercel Analytics
2. Set up error tracking with Sentry or similar services
3. Implement health check endpoints
4. Monitor server logs regularly

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [NextAuth Documentation](https://next-auth.js.org/getting-started/introduction)

For more detailed information about specific aspects of the project, refer to:

- [Database Integration Guide](./DB_INTEGRATION.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)
- [Workflow Guide](./WORKFLOW.md) 