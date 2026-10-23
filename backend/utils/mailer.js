const nodemailer = require('nodemailer');
require('dotenv').config();

// Prepare password by stripping quotes if present
const rawPass = process.env.GMAIL_PASSWORD || process.env.MAIL_PASSWORD || '';
const cleanPass = rawPass.replace(/^["']|["']$/g, '').trim();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_SERVER || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT, 10) || 587,
  secure: false, // port 587 uses STARTTLS
  auth: {
    user: process.env.GMAIL_USERNAME || process.env.MAIL_USERNAME || 'adhin6122@gmail.com',
    pass: cleanPass
  }
});

// Verify connection configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.warn('⚠️ Mail transporter configuration warning:', error.message);
  } else {
    console.log('✅ Mail transporter is ready to send emails');
  }
});

/**
 * Generate a 6-digit numerical OTP string
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP for Account Creation (Signup)
 */
const sendSignupOTP = async (email, otp, username = '') => {
  const sender = process.env.MAIL_DEFAULT_SENDER || process.env.GMAIL_USERNAME || 'adhin6122@gmail.com';
  
  const mailOptions = {
    from: `"Letterboxd" <${sender}>`,
    to: email,
    subject: `${otp} is your Letterboxd verification code`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #14181c; color: #9ab; padding: 40px 20px; max-width: 540px; margin: 0 auto; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; margin-bottom: 12px;">
            <span style="display: inline-block; width: 14px; height: 14px; background-color: #ff8000; border-radius: 50%; margin-right: 4px;"></span>
            <span style="display: inline-block; width: 14px; height: 14px; background-color: #00e054; border-radius: 50%; margin-right: 4px;"></span>
            <span style="display: inline-block; width: 14px; height: 14px; background-color: #40bcf4; border-radius: 50%;"></span>
          </div>
          <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">letterboxd</h1>
        </div>

        <div style="background-color: #1f2730; border: 1px solid #2e3a47; border-radius: 6px; padding: 32px 28px; text-align: center;">
          <h2 style="color: #ffffff; font-size: 20px; margin-top: 0; margin-bottom: 12px;">Verify your email address</h2>
          <p style="color: #9ab; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
            ${username ? `Hi <strong>${username}</strong>, ` : ''}Thank you for joining Letterboxd! Please enter the 6-digit verification code below to complete your account registration:
          </p>

          <div style="background-color: #14181c; border: 1px solid #00e054; border-radius: 6px; padding: 18px 24px; display: inline-block; margin-bottom: 24px;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #00e054;">
              ${otp}
            </span>
          </div>

          <p style="color: #678; font-size: 12px; margin: 0;">
            This verification code is valid for <strong>10 minutes</strong>. If you did not request this, you can safely ignore this email.
          </p>
        </div>

        <div style="text-align: center; margin-top: 24px; color: #556677; font-size: 12px;">
          © ${new Date().getFullYear()} Letterboxd Limited. All rights reserved.
        </div>
      </div>
    `,
    text: `Your Letterboxd verification code is: ${otp}. This code is valid for 10 minutes.`
  };

  return await transporter.sendMail(mailOptions);
};

/**
 * Send OTP for Password Reset
 */
const sendPasswordResetOTP = async (email, otp, username = '') => {
  const sender = process.env.MAIL_DEFAULT_SENDER || process.env.GMAIL_USERNAME || 'adhin6122@gmail.com';
  
  const mailOptions = {
    from: `"Letterboxd" <${sender}>`,
    to: email,
    subject: `${otp} is your Letterboxd password reset code`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #14181c; color: #9ab; padding: 40px 20px; max-width: 540px; margin: 0 auto; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; margin-bottom: 12px;">
            <span style="display: inline-block; width: 14px; height: 14px; background-color: #ff8000; border-radius: 50%; margin-right: 4px;"></span>
            <span style="display: inline-block; width: 14px; height: 14px; background-color: #00e054; border-radius: 50%; margin-right: 4px;"></span>
            <span style="display: inline-block; width: 14px; height: 14px; background-color: #40bcf4; border-radius: 50%;"></span>
          </div>
          <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">letterboxd</h1>
        </div>

        <div style="background-color: #1f2730; border: 1px solid #2e3a47; border-radius: 6px; padding: 32px 28px; text-align: center;">
          <h2 style="color: #ffffff; font-size: 20px; margin-top: 0; margin-bottom: 12px;">Reset your password</h2>
          <p style="color: #9ab; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
            ${username ? `Hi <strong>${username}</strong>, ` : ''}We received a request to reset your Letterboxd account password. Use the verification code below to set a new password:
          </p>

          <div style="background-color: #14181c; border: 1px solid #ff8000; border-radius: 6px; padding: 18px 24px; display: inline-block; margin-bottom: 24px;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #ff8000;">
              ${otp}
            </span>
          </div>

          <p style="color: #678; font-size: 12px; margin: 0;">
            This reset code is valid for <strong>10 minutes</strong>. If you didn't ask to reset your password, please ignore this email or secure your account.
          </p>
        </div>

        <div style="text-align: center; margin-top: 24px; color: #556677; font-size: 12px;">
          © ${new Date().getFullYear()} Letterboxd Limited. All rights reserved.
        </div>
      </div>
    `,
    text: `Your Letterboxd password reset code is: ${otp}. This code is valid for 10 minutes.`
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = {
  transporter,
  generateOTP,
  sendSignupOTP,
  sendPasswordResetOTP
};
