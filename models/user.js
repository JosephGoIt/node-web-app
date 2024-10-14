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
    // token: {
    //     type: String,
    //     default: null,
    // },
    verify: {
        type: Boolean,
        default: false,
    },
    verificationToken: {
        type: String,
        required: [false, 'Allow it to be null after verification'],
    },
    },
    { timestamps: true, versionKey: false }
);

const User = mongoose.model('User', userSchema);

module.exports = User;