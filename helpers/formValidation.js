const Joi = require('joi');

// signup validation
const signupSchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
});

// login validation
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
});

// subscription validation
const subscriptionSchema = Joi.object({
    subscription: Joi.string().valid('starter', 'pro', 'business').required(),
});

// reset-password validation
const resetPasswordSchema = Joi.object({
    newPassword: Joi.string().min(6).required(),
    retypeNewPassword: Joi.string().min(6).required(),
});

// change-password validation
const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().min(6).required(),
    newPassword: Joi.string().min(6).required(),
    retypeNewPassword: Joi.string().min(6).required(),
});

// contact form validation, for adding or updating a contact
const contactSchema = Joi.object({
    name: Joi.string().required(), // name must be a string and is required
    email: Joi.string().email().required(), // email must be valid and is required
    phone: Joi.string().required(), // phone must be a string and is required
    favorite: Joi.boolean(), // favorite must be a boolean, optional
});

// Joi schema to validate the favorite field for updating the favorite status
const favoriteSchema = Joi.object({
    favorite: Joi.boolean().required(), // favorite must be a boolean and is required
});

module.exports = {
    signupSchema,
    loginSchema,
    subscriptionSchema,
    resetPasswordSchema,
    changePasswordSchema,
    contactSchema,
    favoriteSchema,
};