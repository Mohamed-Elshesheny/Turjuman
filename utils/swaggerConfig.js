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
        name: 'Turjuman Support',
        url: 'https://turjuman.online/contact',
        email: 'support@turjuman.online',
      },
    },
    servers: [
      {
        url: 'https://api.turjuman.online',
        description: 'Production Server',
      },
    ],
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./Routes/*.js'],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};