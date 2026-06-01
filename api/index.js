const server = require('../dist/server.cjs');

module.exports = async function (req, res) {
  // Pass execution to the compiled express singleton
  if (server.default) {
    await server.default(req, res);
  } else {
    res.status(500).send("Server bundle not loaded correctly.");
  }
};
