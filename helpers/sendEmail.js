require('dotenv').config();
const nodemailer = require('nodemailer');

const { EMAIL_USER, EMAIL_PASS, EMAIL_SERVICE } = process.env;

const nodemailerConfig = {
  service: EMAIL_SERVICE,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
};

const transport = nodemailer.createTransport(nodemailerConfig);

const sendEmail = async (data) => {
  const email = { ...data, from: EMAIL_USER };
  await transport.sendMail(email);
};

module.exports = {sendEmail};