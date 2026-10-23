# In Light of Eternity

A blogging platform built with **React**, **Express**, **MySQL**, and **Sequelize**.

**Live Website**

https://inlightofeternity.co.ke

---

# Overview

**In Light of Eternity** is a full-stack blogging platform that I designed and developed using React, Express, MySQL, and Sequelize. It provides secure content management with rich-text publishing, image uploads, comments, search, categories, authentication, and role-based authorization, while serving as an ongoing project through which I continuously apply and refine modern software engineering practices focused on maintainability, scalability, security, and production-ready deployment.

---

# Features

## Public Users

- Browse all blog posts
- Read individual posts
- Browse posts by category
- Search blog posts
- View comments
- Follow the blog via RSS

## Registered Users

- Register an account
- Log in and log out securely
- Change their password (other devices are logged out)
- Add comments to blog posts
- Edit their own comments
- Delete their own comments

## Administrators

- Create blog posts
- Edit blog posts
- Delete blog posts
- Moderate user comments
- Admin area: manage posts and comments (with search and filters) and a read-only activity log of admin changes

## Search Engines and Sharing

- XML sitemap and robots.txt
- RSS feed
- Page titles and descriptions
- Social-sharing preview tags (Open Graph)
- Structured data for blog posts (Schema.org)

---

# Technology Stack

## Frontend

- React
- Vite
- React Router
- React Quill
- React Icons
- date-fns

## Backend

- Node.js
- Express.js

## Database

- MySQL
- Sequelize ORM

## Authentication

- JWT
- HTTP-only Cookies

## Security

- Helmet
- Express Rate Limit
- bcrypt
- sanitize-html

## Image Processing

- Sharp

---

# Project Structure

```
api/
    Express backend

client/
    React frontend

database/
    Database initialization scripts

migrations/
    Sequelize database migrations

scripts/
    Local-only smoke test

uploads/
    Uploaded blog images

temp/
    Temporary upload directory
```

---

# Running the Project Locally

Requires Node.js 20 or newer (needed by Sharp) and a MySQL database.

Clone the repository:

```bash
git clone <repository-url>
cd blog-app
```

Install backend dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
cd client
npm install
```

Create the required `.env` files for the backend (project root) and the frontend (`client/`).

Set up the database tables (from the project root):

```bash
npm run migrate
```

Start the backend:

```bash
npm run dev
```

Start the frontend:

```bash
cd client
npm run dev
```

Or start both simultaneously:

```bash
npm run fullstack
```

With the backend running, check the main features end to end (local development only — it refuses to run against any other host, and needs test-account settings in your local `.env`):

```bash
npm run smoke-test
```

---

# Security

The application incorporates several security best practices, including:

- HTTP-only cookie authentication
- Role-based authorization
- Password hashing with bcrypt
- Strong password policy enforcement
- HTML sanitization
- File upload validation
- Secure image processing with Sharp
- API rate limiting
- Helmet security middleware with an explicit Content Security Policy
- Path traversal protection for uploaded files
- Login sessions checked against the database, so password changes, role changes and deleted accounts take effect immediately
- Failed-login logging and a read-only admin audit log

---

# Current Status

The project is under active development and continuous improvement.

Originally developed as an early software engineering learning project, the application is now being progressively redesigned and refactored using production-oriented engineering practices.

Recent architectural improvements include:

- Migration from Jimp to Sharp for image processing.
- Secure cookie-based authentication.
- Role-based authorization.
- Improved API consistency.
- Pagination support.
- Search enhancements.
- Database schema migrations.
- Improved error handling.
- Strengthened frontend authentication flow.
- Production-focused security hardening.
- Simplified image architecture using a single optimized cover image.
- Safer image lifecycle management for uploads, updates, and deletions.

Development follows an incremental refactoring approach with a strong emphasis on security, maintainability, scalability, performance, and clean software architecture.

---

# License

This project is under active development, and I continue to improve it through ongoing enhancements, refactoring, and new features.