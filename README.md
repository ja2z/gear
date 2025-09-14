# Scout Troop Gear Management System

A digital inventory management and checkout system for Scouts BSA troops, designed to replace paper-based gear tracking with a mobile-first web application.

## 🎯 Project Overview

This system provides:
- **Mobile-first design** optimized for scout phones
- **Real-time inventory tracking** via Google Sheets integration
- **Shopping cart-style checkout flow** familiar to users
- **Audit trail** for all gear movements
- **Touch-friendly interface** with 44px+ touch targets

## 🏗️ Architecture

- **Frontend**: Vite + React with Tailwind CSS
- **Backend**: Express.js with Node.js
- **Data Storage**: Google Sheets (source of truth)
- **Mobile Experience**: Progressive web app capabilities

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google Cloud Project with Sheets API enabled
- Google Service Account credentials

### Installation

1. **Clone and setup the project:**
   ```bash
   cd /Users/jonathanavrach/code/gear
   ```

2. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   ```

3. **Install backend dependencies:**
   ```bash
   cd ../backend
   npm install
   ```

4. **Configure Google Sheets:**
   - Copy `backend/env.example` to `backend/.env`
   - Fill in your Google Sheets credentials
   - Create a Google Sheet with the required structure (see below)

5. **Start the development servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev

   # Terminal 2 - Frontend  
   cd frontend
   npm run dev
   ```

6. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## 📊 Google Sheets Setup

### Required Sheet Structure

Create a Google Sheet with two tabs:

#### Master Inventory Tab
Columns: `Item Class`, `Item Desc`, `Item Num`, `Item ID`, `Description`, `Is Tagged`, `Condition`, `Status`, `Purchase Date`, `Cost`, `Checked Out To`, `Checked Out By`, `Check Out Date`, `Outing Name`, `Notes`

#### Transaction Log Tab  
Columns: `Transaction ID`, `Timestamp`, `Action`, `Item ID`, `Outing Name`, `Condition`, `Processed By`, `Notes`

### Service Account Setup

1. Create a Google Cloud Project
2. Enable Google Sheets API
3. Create a Service Account
4. Download the JSON key file
5. Share your Google Sheet with the service account email
6. Copy credentials to your `.env` file

## 📱 User Flow

1. **Landing Page** - Choose "Check Out Gear" or "Check In Gear"
2. **Category Selection** - Browse ~20 gear categories with search
3. **Item Selection** - Select individual items (TENT-001, SPOON-001, etc.)
4. **Shopping Cart** - Review and manage selected items
5. **Checkout Form** - Enter scout name, outing, date, and notes
6. **Confirmation** - Complete transaction and show success

## 🛠️ Development

### Frontend Structure
```
frontend/src/
├── components/     # Reusable UI components
├── pages/         # Route components
├── context/       # React context (Cart)
├── hooks/         # Custom hooks
└── App.jsx        # Main app component
```

### Backend Structure
```
backend/
├── routes/        # API route handlers
├── services/      # Business logic (Sheets API)
├── middleware/    # Express middleware
└── server.js      # Main server file
```

### Key Features

- **Mobile-first responsive design**
- **Touch-optimized UI** (44px+ touch targets)
- **Real-time inventory updates**
- **Shopping cart with persistent state**
- **Search functionality**
- **Error handling and validation**
- **Audit trail for all transactions**

## 🔧 API Endpoints

- `GET /api/health` - Health check
- `GET /api/inventory` - Get all inventory
- `GET /api/inventory/categories` - Get categories with counts
- `GET /api/inventory/items/:category` - Get items by category
- `POST /api/checkout` - Process checkout transaction
- `POST /api/checkin` - Process checkin transaction

## 📋 Data Model

### Item Structure
- **Item Class**: Category (TENT, SLEEP, COOK, etc.)
- **Item ID**: Unique identifier (TENT-001, SPOON-001)
- **Status**: Available/Not available
- **Condition**: Usable/Not usable/Missing
- **Checkout Info**: Scout name, outing, date, notes

### Transaction Log
- **Append-only audit trail**
- **All checkout/checkin activities**
- **Timestamp and user accountability**

## 🎨 Design System

### Colors
- **Scout Green**: #4B8B3B (primary actions)
- **Scout Blue**: #1E3A8A (navigation, links)
- **Scout Gold**: #F59E0B (secondary actions)

### Mobile UX
- **Large touch targets** (44px minimum)
- **Clear navigation** with breadcrumbs
- **Search always visible** on category page
- **Shopping cart counter** in header
- **Responsive design** for all screen sizes

## 🚀 Deployment

The system is designed to run on your troop's existing server:

1. **Build the frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy backend to your server:**
   ```bash
   cd backend
   npm start
   ```

3. **Serve frontend build files** from your web server

## 📈 Future Enhancements

- QR code scanning for quick item selection
- Offline capability with service workers
- Push notifications for overdue items
- Advanced reporting and analytics
- User authentication with Google OAuth
- SQLite caching for improved performance

## 🤝 Contributing

This is a troop-specific project. For questions or improvements, contact the quartermaster mentor.

## 📄 License

Internal use only - Scout Troop Gear Management System
