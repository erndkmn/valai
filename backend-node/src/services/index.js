/**
 * Services index - exports all services.
 */
const authService = require('./authService');
const accountService = require('./accountService');
const rateLimitService = require('./rateLimitService');
const quotaService = require('./quotaService');
const matchService = require('./matchService');
const stabilityService = require('./stabilityService');

module.exports = {
  ...authService,
  ...accountService,
  ...rateLimitService,
  ...quotaService,
  ...matchService,
  ...stabilityService,
};
