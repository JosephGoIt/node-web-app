const mongoose = require('mongoose');
const {Schema} = mongoose;

const userSchema = new Schema(
    {
    name: {
        type: String,
        required: [true, 'Name is required'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
    },
    subscription: {
        type: String,
        enum: ['starter', 'pro', 'business'],
        default: 'starter',
    },
    avatarURL: String,
    verify: {
        type: Boolean,
        default: false,
    },
    verificationToken: {
        type: String,
        required: [false, 'Allow it to be null after verification'],
    },
    forgotPasswordToken: {
        type: String,
        required: [false, 'Allow it to be null after verification'],
    },
    forgotPasswordTokenExpiration: {
        type: Date,
        required: true,
    },
    },
    { timestamps: true, versionKey: false }
);

const User = mongoose.model('User', userSchema);

module.exports = User;