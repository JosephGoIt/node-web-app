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

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

/**
 * @swagger
 * /api/users/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: The user's email.
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 description: The user's password.
 *                 example: password123
 *     responses:
 *       201:
 *         description: User created successfully.
 *       400:
 *         description: Invalid or missing data.
 *       409:
 *         description: Email in use.
 *       500:
 *         description: Error sending email or internal server error .
 */
router.post("/signup", signup);

/**
 * @swagger
 * /api/users/verify/{verificationToken}:
 *   get:
 *     summary: Verify a user's email address using a verification token.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: verificationToken
 *         schema:
 *           type: string
 *         required: true
 *         description: The email verification token sent to the user's email
 *     responses:
 *       200:
 *         description: Verification successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Verification successful"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.get("/verify/:verificationToken", verifyEmail);

/**
 * @swagger
 * /api/users/verify:
 *   post:
 *     summary: Resend email verification link to the user's email.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The email address to resend the verification link to
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Verification email resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Verification email resent successfully"
 *       400:
 *         description: Invalid or missing required field
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid or missing or already verified"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.post("/verify", resendVerificationEmail);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login a user and receive authentication tokens.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The user's email address
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: The user's password
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Successfully logged in and returned tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: JWT access token
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token
 *                 user:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: The name of the user
 *                       example: "John Doe"
 *                     email:
 *                       type: string
 *                       description: The email of the user
 *                       example: "user@example.com"
 *       400:
 *         description: Invalid or missing data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid or missing email or password"
 *       401:
 *         description: Invalid email or password or unverified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid email or password or unverified"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.post("/login", login);

/**
 * @swagger
 * /api/users/logout:
 *   get:
 *     summary: Logout the currently authenticated user and invalidate the token.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logout successful"
 */
router.get("/logout", auth, logout);

/**
 * @swagger
 * /api/users/current:
 *   get:
 *     summary: Get the currently authenticated user's information.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved current user data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   description: The name of the user
 *                   example: "John Doe"
 *                 email:
 *                   type: string
 *                   description: The email of the user
 *                   example: "user@example.com"
 *                 subscription:
 *                   type: string
 *                   description: The current subscription status of the user
 *                   example: "premium"
 */
router.get("/current", auth, currentUser);

/**
 * @swagger
 * /api/users/subscription:
 *   patch:
 *     summary: Upgrade the subscription plan of the authenticated user.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subscription:
 *                 type: string
 *                 description: The new subscription plan for the user
 *                 enum: [starter, pro, premium]
 *                 example: "premium"
 *     responses:
 *       200:
 *         description: Successfully updated the subscription
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Subscription upgraded successfully"
 *                 subscription:
 *                   type: string
 *                   description: The updated subscription plan
 *                   example: "premium"
 *       400:
 *         description: Invalid subscription plan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid subscription plan"
 */
router.patch("/subscription", auth, upgradeSub);

/**
 * @swagger
 * /api/users/avatar:
 *   patch:
 *     summary: Upload and update the avatar of the authenticated user.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: The avatar image file to upload
 *     responses:
 *       200:
 *         description: Avatar uploaded and updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Avatar updated successfully"
 *                 avatarURL:
 *                   type: string
 *                   description: The URL of the updated avatar
 *                   example: "https://your-server.com/avatars/avatar.jpg"
 *       400:
 *         description: Invalid file type or other input error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid file type"
 *       401:
 *         description: Unauthorized or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.patch("/avatar", auth, upload.single("avatar"), uploadAva);

/**
 * @swagger
 * /api/users/reset-password:
 *   post:
 *     summary: Reset the user's password using a verification token.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: The password reset token sent to the user's email
 *                 example: "abc123resetToken"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: The new password to set for the user
 *                 example: "newStrongPassword123"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password has been reset successfully"
 *       400:
 *         description: Invalid or expired reset token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid or expired token"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.post("/reset-password", resetPassword)

// Export both the login function and the router
module.exports = {
    router,
  };