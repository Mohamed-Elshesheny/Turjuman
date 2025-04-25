

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Turjuman API Documentation',
      version: '1.0.0',
      description: 'API documentation for the Turjuman translation service.',
    },
    servers: [
      {
        url: 'https://turjuman.online', // Adjust if different in dev
      },
    ],
  },
  apis: ['./Routes/*.js'], // Adjust to the path where you write your route comments
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};