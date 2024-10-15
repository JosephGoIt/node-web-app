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
        // 1st level validation, signup validation to ensure required fields are populated
        const {error} = signupSchema.validate(req.body);
        if (error) {
            return res.status(400).json({message: "Invalid or missing data"});
        }

        // 2nd level validation, check if email is already registered
        const {name, email, password} = req.body;
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
            name,
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
        await sendEmail(mailOptions);
          
        // Registration success response with new user details
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
        await sendEmail(mailOptions);
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
            console.log('Updating existing session with new tokens');
            session.accessToken = accessToken;
            session.refreshToken = refreshToken;
            session.expiration = Date.now() + 900000; // Set new expiration for 15 minutes
            await session.save();
        } else {
            // No existing session, create a new session
            console.log('Creating a new session');
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

