const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;

// Configure Google OAuth
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
  // Profile data will be available in req.user
  return done(null, profile);
}));

// Configure Facebook OAuth
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/api/auth/facebook/callback',
  profileFields: ['id', 'displayName', 'emails', 'photos']
}, (accessToken, refreshToken, profile, done) => {
  // Profile data will be available in req.user
  return done(null, profile);
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;