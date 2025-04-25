const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Turjuman API Documentation',
      version: '1.0.0',
      description: 'Official API documentation for the Turjuman translation service.',
      contact: {
        name: 'Support',
        email: 'support@turjuman.online',
        url: 'https://turjuman.online',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://turjuman.online/'
          : 'http://localhost:8001/api/v1',
        description: process.env.NODE_ENV === 'production' ? 'Production Server' : 'Development Server',
      },
    ],
  },
  apis: ['./Routes/*.js', './Controllers/*.js'], // يمكنك توسعة الملفات
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};