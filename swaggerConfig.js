const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Turjuman API Documentation',
      version: '1.0.0',
      description: 'Official API documentation for the Turjuman translation service.',
    },
    servers: [
      {
        url: 'https://turjuman.online/api/v1',
        description: 'Production Server',
      },
    ],
  },
  apis: ['./Routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};