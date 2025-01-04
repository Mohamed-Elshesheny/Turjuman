# **Turjuman - Translation Application**

**Turjuman** is a dynamic and user-friendly translation application that provides powerful tools for text translation, saving, and management. Designed to cater to both free-tier and premium users, Turjuman empowers users to handle their translations efficiently and with ease.

---

## **Features**

### **Core Features**

- **Dynamic Translation**: Translate single words or entire sentences between multiple languages using the powerful `translate-google` API.
- **Save Translations**: Save translations securely to your account for future reference.
- **Favorites Management**: Mark translations as favorites for quick and easy access.
- **Daily Translation Limit**:
  - Free-tier users can translate up to **10 times per day**.
  - Premium-tier users enjoy a generous limit of **100 translations per day**.
- **Translation History**: Retrieve all previously saved translations with detailed metadata, including the source and target languages.

### **Upcoming Features**

- **Bulk Translation Support**: Translate and save multiple sentences or paragraphs at once.
- **Export Options**: Allow users to download their translations in CSV or JSON format.
- **AI-Powered Contextual Translations**: Enhance translation accuracy with AI models for contextual understanding.
- **Speech-to-Text and Text-to-Speech Integration**: Enable users to dictate translations and hear them spoken aloud.

---

## **Tech Stack**

- **Backend**: Node.js with Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JSON Web Token (JWT)-based secure authentication
- **Translation API**: [`translate-google`](https://www.npmjs.com/package/translate-google) npm package

---

## **Setup Instructions**

1. **Clone the repository**:
   ```sh
   git clone https://github.com/yourusername/turjuman.git
   cd turjuman
   ```

2. **Install dependencies**:
   ```sh
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory and add the following variables:
   ```sh
   DB_URL=mongodb://localhost:27017/turjuman
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=1h
   PORT=8001
   NODE_ENV=development
   ```

4. **Start the application**:
   ```sh
   npm start
   ```

---

## **Usage Examples**

### **Signup**
```sh
POST /api/v1/users/signup
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "passwordConfirm": "password123"
}
```

### **Login**
```sh
POST /api/v1/users/login
{
  "email": "john@example.com",
  "password": "password123"
}
```

### **Translate and Save**
```sh
POST /api/v1/translate-and-save
Headers: { Authorization: "Bearer <token>" }
{
  "text": "Hello",
  "fromLang": "en",
  "toLang": "es"
}
```

### **Get User Translations**
```sh
GET /api/v1/translates
Headers: { Authorization: "Bearer <token>" }
```

---

## **API Endpoint Details**

### **User Routes**
- `POST /api/v1/users/signup`: User signup
- `POST /api/v1/users/login`: User login
- `GET /api/v1/users/me`: Get current user details
- `DELETE /api/v1/users/deleteMe`: Deactivate current user
- `PUT /api/v1/users/UpdateUserInfo/:id`: Update user information
- `PUT /api/v1/users/ChangePassword/:id`: Change user password

### **Translation Routes**
- `POST /api/v1/translate-and-save`: Translate text and save
- `GET /api/v1/translates`: Get user translations
- `GET /api/v1/favorites/translates`: Get favorite translations
- `GET /api/v1/favorites-order`: Get favorite translations in order
- `GET /api/v1/all-translates`: Get all translations
- `DELETE /api/v1/translates/:id`: Delete translation by ID
- `GET /api/v1/translations-History-stats`: Get translation history stats
- `GET /api/v1/translats/search`: Search and filter translations

---

Built with ❤️ by Turjuman Team.
