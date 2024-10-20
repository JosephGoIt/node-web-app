require('dotenv').config();
const bcrypt = require('bcryptjs');
const gravatar = require('gravatar');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const fs = require('fs/promises');
const path = require('path');
const Jimp = require('jimp');
const User = require('../models/user');
const Session = require('../models/session');
const {sendEmail} = require('../helpers/sendEmail');
const {
        signupSchema,
        loginSchema,
        subscriptionSchema,
        resetPasswordSchema,
        changePasswordSchema,
        contactSchema,
} = require('../helpers/formValidation');

// signup function
const signup = async (req, res, next) => {
    try {
        // 1st step, 1st level validation, ensures required fields are populated
        const {error} = signupSchema.validate(req.body);
        if (error) {
            return res.status(400).json({message: "Invalid or missing data"});
        }

        // 2nd step, 2nd level validation, ensures email is unique - not existing in database
        const {name, email, password} = req.body;
        const existingUser = await User.findOne({email});
        if (existingUser) {
            return res.status(409).json({message: "Email in use"});
        }

        // 3rd step, hash the password, generate a verification token, create url for the avatar
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = uuidv4();  // Generate a unique verification token
        const avatarURL = gravatar.url(email, { s: '250', d: 'retro' }, true); // Support avatar, optional feature

        // 4th step, create user with the info provided/generated
        const user = await User.create({
            name,
            email, 
            password: hashedPassword,  
            verificationToken,
            avatarURL
        });

        // 5th step, create verification link
        const verificationUrl = `${req.protocol}://${req.get('host')}/api/users/verify/${verificationToken}`;

        // 6th step, create verification email content
        const mailOptions = {
          from: process.env.EMAIL_USER,     // Sender address (email provider/owner)
          to: email,                        // List of receivers (email of user who signup)
          subject: 'Verify your email',     // Subject line
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding:  20px; border: 1px solid #eaeaea; border-radius: 10px;">
                <h2 style="color: #333;">Hi, ${name}!</h2>
                <p style="font-size: 16px; color: #555;">Thanks for signing up for <strong>Phone Book App</strong>! Before we can continue, we need to validate your email address.</p>
                <p style="font-size: 16px; color: #555;">Please click the button below to verify your email address:</p>
                <a href="${verificationUrl}" 
                style="display: inline-block; padding: 10px 25px; margin-top: 20px; font-size: 16px; color: #fff; background-color: #fc842d; text-decoration: none; border-radius: 5px;">
                Verify Email
                </a>
                <p style="margin-top: 30px; font-size: 14px; color: #999;">If you did not sign up, please ignore this email.</p>
                <p style="font-size: 14px; color: #999;">Thanks, <br>GOIT Team 3</p>
            </div>
            `,
        };

        // 7th step, send email verification. sendEmail function utilizes nodemailer
        await sendEmail(mailOptions);
          
        // 8th step, signup/registration success response with new user details
        res.status(201).json({
        user: {
            name: user.name,
            email: user.email,
            subscription: user.subscription,
            avatarURL: user.avatarURL
            }
        });
    } catch (err) {
        console.error('Error in signup route:', err);
        res.status(500).json({message: 'Internal Server Error'});
    }
};

// verifyEmail function
const verifyEmail = async (req, res, next) => {
    try {
      const { verificationToken } = req.params;

      // Find the user by verification token
      const user = await User.findOne({ verificationToken });
      if (!user) {
        // console.error("User not found with this verification token:", verificationToken);
        return res.status(404).json({ message: 'User not found' });
      }
      // Update user verification status
      user.verificationToken = null; // Set the token to null after successful verification
      user.verify = true;            // Set the verification status to true
      await user.save();             // Save changes in
      res.status(200).json({ message: 'Verification successful' });
    } catch (error) {
        //   console.error("Error during verification process:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// Resend verification email function
const resendVerificationEmail = async (req, res, next) => {
    const { email } = req.body;
    // Validate email input
    if (!email) {
      return res.status(400).json({ message: 'Missing required field email' });
    }
    try {
        // Find the user by email
        const user = await User.findOne({ email });
        // Email is not found
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Email is found but alrerady verified
        if (user.verify) {
            return res.status(400).json({ message: 'Verification has already been passed' });
        } 
        // Generate the verification link
        const verificationUrl = `${req.protocol}://${req.get('host')}/api/users/verify/${user.verificationToken}`;
        // Send the email
        const mailOptions = {
            from: process.env.EMAIL_USER,  // Sender email address
            to: email,                     // Receiver email address
            subject: 'Verify your email (re-send)',   // Subject line
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding:  20px; border: 1px solid #eaeaea; border-radius: 10px;">
                <h2 style="color: #333;">Hi, ${user.name}!</h2>
                <p style="font-size: 16px; color: #555;">Thanks for signing up for <strong>Phone Book App</strong>! Before we can continue, we need to validate your email address.</p>
                <p style="font-size: 16px; color: #555;">Please click the button below to verify your email address:</p>
                <a href="${verificationUrl}" 
                style="display: inline-block; padding: 10px 25px; margin-top: 20px; font-size: 16px; color: #fff; background-color: #fc842d; text-decoration: none; border-radius: 5px;">
                Verify Email
                </a>
                <p style="margin-top: 30px; font-size: 14px; color: #999;">If you did not sign up, please ignore this email.</p>
                <p style="font-size: 14px; color: #999;">Thanks, <br>GOIT Team 3</p>
            </div>
            `,  // Email body
        };
        // Acutal sending of the email using Nodemailer
        await sendEmail(mailOptions);
        // Respond with success
        res.status(200).json({ message: 'Verification email sent' });
    } catch (error) {
        console.error('Error sending verification email:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// The login function
const login = async (req, res, next) => {
    try {
        // 1st level validation, ensure required fields are populated, email and password
        const { error } = loginSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: "Please populate required fields" });
        }

        // 2nd level validation, find the user by email, ensure user exists
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Email not found" });
        }

        // 3rd level validation, check if the user has verified their email
        if (!user.verify) {
            return res.status(401).json({ message: 'Please verify your email' });
        }

        // 4th level validation, compare the provided password with the stored hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Email or password is wrong" });
        }

        // 5th level validation, generate a JWT token for the authenticated user
        const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '5m' });
        console.log(`generated accessToken on 5th level: ${accessToken}`);
        const refreshToken = jwt.sign({id: user._id}, process.env.JWT_REFRESH_SECRET, {expiresIn: '10m'});
        console.log(`generated refreshToken on 5th level: ${refreshToken}`);

        // 6th level check if a session already exists for the user
        let session = await Session.findOne({ userId: user._id });

        if (session) {
            // Session exists, update it with new tokens and expiration
            // console.log('Updating existing session with new tokens');
            session.accessToken = accessToken;
            session.refreshToken = refreshToken;
            session.expiration = Date.now() + 900000; // Set new expiration for 15 minutes
            await session.save();
        } else {
            // No existing session, create a new session
            // console.log('Creating a new session');
            const newSession = new Session({
                accessToken,
                refreshToken,
                expiration: Date.now() + 900000, // Set expiration for 15 minutes
                userId: user._id,
            });
            await newSession.save();
        }

        // Send tokens back in the response
        res.status(200).json({
            message: "Login successful",
            accessToken,
            refreshToken,
            user: { name: user.name, verified: user.verify },
        });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ message: 'Internal Server Error' });
        next(err);
    }
};

// logout function
const logout = async (req, res, next) => {
    try {
        const userId = req.user._id; // Assuming the user ID is stored in req.user after authentication

        // Check if there is a session for the user
        const session = await Session.findOne({ userId });

        if (!session) {
            // If no session exists, return a 404 response
            return res.status(404).json({ message: "No active session found for this user" });
        }

        // If session exists, delete the session
        await Session.deleteOne({ userId });

        // Send a success response after deleting the session
        res.status(200).json({ message: "Logout successful, session deleted" });
    } catch (err) {
        console.error('Error during logout:', err);
        res.status(500).json({ message: 'Internal Server Error' });
        next(err);
    }
};

// current user function
const currentUser = async (req, res, next) => {
    try {
        const { name, email, subscription, avatarURL } = req.user;
        res.status(200).json({ name, email, subscription, avatarURL });
    } catch (err) {
        next(err);
    }
};

const upgradeSub = async (req, res, next) => {
    try {
        const { error } = subscriptionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: 'invalid value' });
        }
        const { subscription } = req.body;
        req.user.subscription = subscription;
        await req.user.save();
        res.status(200).json({
            email: req.user.email,
            subscription: req.user.subscription,
        });
    } catch (err) {
        next(err);
    }
  };

// avatar handler  
const avatarsDir = path.join(__dirname, '../public/avatars');
const uploadAva = async (req, res, next) => {
    try {
        const { path: tempPath, originalname } = req.file;
        const ext = path.extname(originalname);
        const filename = `${req.user._id}${ext}`;
        const resultPath = path.join(avatarsDir, filename);
        // Process the image
        const image = await Jimp.read(tempPath).catch(err => {
            console.error('Error processing image with Jimp:', err);
            throw err;
        });
        await image.resize(250, 250).writeAsync(resultPath).catch(err => {
            console.error('Error writing file to avatarsDir:', err);
            throw err;
        });
        // Remove the temp file
        await fs.unlink(tempPath).catch(err => {
            console.error('Error deleting temp file:', err);
            throw err;
        });
        // Update user's avatar URL
        const avatarURL = `/avatars/${filename}`;
        req.user.avatarURL = avatarURL;
        await req.user.save();
        res.status(200).json({ avatarURL });
        console.log('Avatars directory:', avatarsDir);

    } catch (err) {
        next(err);
    }
};

// reset password function
const resetPassword = async (req, res) => {
    // Validate the incoming request using the resetPasswordSchema
    const { error } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
  
    const { newPassword, retypeNewPassword } = req.body;
  
    // Check if newPassword matches retypeNewPassword
    if (newPassword !== retypeNewPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
  
    try {
      // Fetch the authenticated user from the request (added in auth middleware)
      const user = req.user;
  
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      // Update the user's password in the database
      user.password = hashedPassword;
      await user.save();
  
      // Respond with a success message
      res.status(200).json({ message: "Password updated successfully" });
    } catch (err) {
      console.error("Error updating password:", err);
      res.status(500).json({ message: "Server error, please try again later" });
    }
  };

module.exports = {
    signup,
    verifyEmail,
    resendVerificationEmail,
    login,
    logout,
    currentUser,
    upgradeSub,
    uploadAva,
    resetPassword,
};

