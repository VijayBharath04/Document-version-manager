/**
 * DOCUMENT VERSION MANAGER - Netlify Serverless Function Wrapper
 * Wraps Express backend server to run as a serverless function on Netlify
 */

const serverless = require('serverless-http');
const app = require('../../server/server');

module.exports.handler = serverless(app);
