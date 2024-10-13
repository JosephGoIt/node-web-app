const User = require('../models/user');
const Joi = require('joi');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const gravatar = require('gravatar');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const fs = require('fs/promises');
const path = require('path');
const Jimp = require('jimp');

// signup, login, password-reset front-end validation
const signupSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
});

// subscription front-end validation
const subscriptionSchema = Joi.object({
    subscription: Joi.string().valid('starter', 'pro', 'business').required(),
  });

// password reset front-end validation
const resetPasswordSchema = Joi.object({
    email: Joi.string().email().required(),
    newPassword: Joi.string().min(6).required(),
  });

// mailer provider
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// signup function
const signup = async (req, res, next) => {
    try {
        // 1st level validation, signup validation to ensure required fields are populated
        const {error} = signupSchema.validate(req.body);
        if (error) {
            return res.status(400).json({message: "Invalid or missing data"});
        }
        // 2nd level validation, check if email is already registered
        const {email, password} = req.body;
        const existingUser = await User.findOne({email});
        if (existingUser) {
            return res.status(409).json({message: "Email in use"});
        }
        // Hash the password, create url for the avatar, generate a verification token
        const hashedPassword = await bcrypt.hash(password, 10);

        const avatarURL = gravatar.url(email, { s: '250', d: 'retro' }, true);

        const verificationToken = uuidv4();  // Generate a unique verification token

        // Log the verification token to check if it's being generated, just for debugging
        // console.log('Generated Verification Token:', verificationToken);

        // Create the with the info provided/generated
        const user = await User.create({
            email, 
            password: hashedPassword, 
            avatarURL, 
            verificationToken
        });

        // Create verification link
        const verificationUrl = `${req.protocol}://${req.get('host')}/api/users/verify/${verificationToken}`;

        // Send verification email
        const mailOptions = {
          from: process.env.EMAIL_USER,     // Sender address (email provider/owner)
          to: email,                        // List of receivers (email of user who signup)
          subject: 'Verify your email',     // Subject line
          text: `Click the link to verify your email: ${verificationUrl}`, // Plain text body
        };

        // Actual email sending
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error('Error sending email:', error);
            return res.status(500).json({ message: 'Error sending email' });
          }
          console.log('Email sent:', info.response);
          res.status(201).json({
            user: {
              email: user.email,
              subscription: user.subscription,
              avatarURL: user.avatarURL
            }
          });
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
      
      // Log the token to ensure it's being captured correctly
      // console.log("Received verification token:", verificationToken);

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
            subject: 'Verify your email',   // Subject line
            text: `Click the link to verify your email: ${verificationUrl}`  // Email body
        };
        // Acutal sending of the email using Nodemailer
        await transporter.sendMail(mailOptions);
        // Just a log email has been sent
        // console.log('Verification email sent to:', email);
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
        const { error } = signupSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        // 2nd level validation, find the user by email, ensure user exists
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Email or password is wrong" });
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
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        user.token = token;
        await user.save();
        // Respond with the token and user data
        res.status(200).json({
            token,
            user: {
                email: user.email,
                subscription: user.subscription,
            }
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
        const user = req.user;
        user.token = null;
        await user.save();
        res.status(204).end();
    } catch (err) {
        next(err);
    }
};

// current user function
const currentUser = async (req, res, next) => {
    try {
        const { email, subscription } = req.user;
        res.status(200).json({ email, subscription });
    } catch (err) {
        next(err);
    }
};

const upgradeSub = async (req, res, next) => {
    try {
        const { error } = subscriptionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
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
    const { email, password } = req.body;
    // Validate the request body
    const { error } = signupSchema.validate({ email, password });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    try {
      // Hash the new password
      const hashedPassword = await bcrypt.hash(password, 10);
      // Find the user by email and update the password
      const user = await User.findOneAndUpdate({ email }, { password: hashedPassword });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
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

