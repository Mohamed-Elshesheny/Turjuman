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

Built with ❤️ by Turjuman Team.
