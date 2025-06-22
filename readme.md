# 📅 Scheduling App - Mini Calendly Clone

A full-stack scheduling application that allows users to create events and book time slots, similar to Calendly. Built with React frontend and Node.js backend, featuring advanced concurrency control and email notifications.

## ✨ Features

### Core Functionality
- 🎯 **Event Creation**: Create scheduling events with multiple time slots
- 📅 **Time Slot Booking**: Users can book available time slots
- 🌍 **Timezone Support**: Automatic timezone detection and conversion
- 📱 **Responsive Design**: Mobile-first responsive interface
- ⚡ **Real-time Updates**: Dynamic availability updates

### Advanced Features
- 📧 **Email Notifications**: Automatic booking confirmation emails
- 🔒 **Race Condition Protection**: Optimistic concurrency control with serializable transactions
- 🚀 **High Performance**: Efficient handling of concurrent bookings
- 🛡️ **Data Validation**: Comprehensive input validation and error handling
- 📊 **Booking Management**: View and manage bookings

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React.js, Vite, Tailwind CSS
- **Backend**: Node.js, Express.js, Prisma ORM
- **Database**: Supabase (PostgreSQL)
- **Email Service**: Gmail SMTP
- **Deployment**: 
  - Frontend: Vercel
  - Backend: Render

### Key Technical Features

#### 🔄 Optimistic Concurrency Control
The application implements race condition handling using:
- **Serializable Transaction Isolation**: Prevents concurrent booking conflicts
- **Version-based Optimistic Locking**: Ensures data consistency
- **Retry Logic with Exponential Backoff**: Handles temporary conflicts gracefully
- **Concurrent Request Tracking**: Monitors and manages high-load scenarios

#### 🌐 Timezone Handling
- All times stored in UTC format
- Automatic browser timezone detection
- Real-time conversion for display
- DST transition support

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 
- Supabase account
- Gmail account for SMTP

### Backend Setup

1. **Clone and navigate to backend directory**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file with the following variables:
   ```env
   PORT=<PORT>
   DATABASE_URL=your_supabase_database_url
   USER=your_gmail_email@gmail.com
   PASS=your_gmail_app_password
   ```
4. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the backend server**
   ```bash
   npm run dev
   ```
   


### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file with:
   ```env
   VITE_BACKEND_URL=<URL POINTING TO BACKEND>
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```


## 🔧 API Endpoints

### Events
- `GET /api/events` - Get all events
- `POST /api/events` - Create new event  
- `GET /api/events/:id` - Get event by ID

### Bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/user/:email` - Get user bookings

### Slots
- `GET /api/slots/:eventId` - Get slots for event

## 🛡️ Race Condition Handling

The application handles concurrent booking attempts through:

### Optimistic Concurrency Control
```javascript
// Version-based locking prevents conflicts
const slot = await tx.slot.update({
  where: { 
    id: slotId,
    version: currentVersion // Fails if version changed
  },
  data: { 
    currentBookings: { increment: 1 },
    version: { increment: 1 }
  }
});
```

### Retry Logic
- Maximum 3 retry attempts
- Exponential backoff with jitter

### Transaction Isolation
```javascript
await this.prisma.$transaction(async (tx) => {
  // Booking logic here
}, {
  isolationLevel: 'Serializable',
  timeout: 5000
});
```
