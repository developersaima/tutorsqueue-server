
````md
# MediQueue Server

Backend server for the MediQueue Tutor Booking System.

## 🚀 Live API
https://mediqueue-server.vercel.app

## 📌 Features
- JWT Protected Private Routes
- Tutor CRUD Operations
- Booking System with Slot Management
- MongoDB Database Integration
- Search & Date Filter Support
- Booking Cancel System
- Secure Authentication Middleware

## 🛠️ Technologies Used
- Node.js
- Express.js
- MongoDB
- JWT (JOSE)
- CORS
- Dotenv

## 📂 API Routes

### Tutors
- GET `/api/tutors`
- GET `/api/tutors/:id`
- POST `/api/tutors`
- PUT `/api/tutors/:id`
- DELETE `/api/tutors/:id`

### Bookings
- POST `/api/bookings`
- GET `/api/my-bookings`
- PATCH `/api/bookings/:id/cancel`

### User Tutors
- GET `/api/my-tutors`

## ⚙️ Environment Variables

Create a `.env` file and add:

```env
MONGO_URI=your_mongodb_uri
PORT=5000
PUBLIC_URL=your_client_url
````

## ▶️ Run Locally

```bash
npm install
npm run dev
```

## 🔗 Repository

Client Repo: [https://github.com/developersaima/mediqueue-client](https://github.com/developersaima/mediqueue-client)

Server Repo: [https://github.com/developersaima/mediqueue-server](https://github.com/developersaima/mediqueue-server)

## Saima Akter
```
```
