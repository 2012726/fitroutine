/**
 * Middleware to protect routes from unauthorized users
 */
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }

  // Check if it's an API request or page request
  const isApiRequest = req.originalUrl.startsWith('/api') || 
                       req.originalUrl.startsWith('/auth/me') ||
                       (req.headers.accept && req.headers.accept.includes('application/json'));

  if (isApiRequest) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access. Please log in.'
    });
  } else {
    return res.redirect('/login.html');
  }
};

module.exports = {
  isAuthenticated
};
