// /api/env-check.js
module.exports = (req, res) => {
  const hasJwt = !!process.env.JWT_SECRET;
  res.status(200).json({ hasJwt });
};
