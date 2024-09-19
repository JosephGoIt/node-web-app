const express = require('express');
const router = express.Router();
const auth = require('../../middlewares/auth.js');
const upload = require('../../middlewares/upload');
const {
    signup,
    verifyEmail,
    resendVerificationEmail,
    login,
    logout,
    currentUser,
    upgradeSub,
    uploadAva,
    resetPassword,
} = require('../../controllers/userControllers.js');

/* POST: // http://localhost:3000/api/users/signup */
router.post("/signup", signup);
router.get("/verify/:verificationToken", verifyEmail);
router.post("/verify", resendVerificationEmail);
router.post("/login", login);
router.get("/logout", auth, logout);
router.get("/current", auth, currentUser);
router.patch("/subscription", auth, upgradeSub);
router.patch("/avatar", auth, upload.single("avatar"), uploadAva);
router.post("/reset-password", resetPassword)

// Export both the login function and the router
module.exports = {
    router,
  };