const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendWelcomeEmail(to, name) {
  await transporter.sendMail({
    from: `"${process.env.APP_NAME || 'AuthApp'}" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Welcome to ${process.env.APP_NAME || 'our platform'}!`,
    html: `
      <h2>Welcome, ${name}!</h2>
      <p>Thank you for signing up for an account with us.</p>
      <p>Your account has been successfully created and you're now part of our community.</p>
      <br/>
      <p>Best regards,</p>
      <p>The ${process.env.APP_NAME || 'Team'}</p>
    `,
  });
}

module.exports = sendWelcomeEmail;
