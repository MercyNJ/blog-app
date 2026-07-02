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

## Registered Users

- Register an account
- Log in and log out securely
- Add comments to blog posts
- Edit their own comments
- Delete their own comments

## Administrators

- Create blog posts
- Edit blog posts
- Delete blog posts
- Moderate user comments

---

# Technology Stack

## Frontend

- React
- Vite
- React Router
- React Quill
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

uploads/
    Uploaded blog images

temp/
    Temporary upload directory
```

---

# Running the Project Locally

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
- Helmet security middleware
- Path traversal protection for uploaded files

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