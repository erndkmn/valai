/**
 * API routes index - exports all routers.
 */
const accountRouter = require('./account');
const statsRouter = require('./stats');
const chatRouter = require('./chat');

module.exports = {
  accountRouter,
  statsRouter,
  chatRouter,
};
