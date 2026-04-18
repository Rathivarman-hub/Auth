const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOtpEmail(to, otp) {
  await transporter.sendMail({
    from: `"${process.env.APP_NAME|| "Rathivarman"}" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your verification code',
    html: `
      <p>Your one-time verification code is:</p>
      <h2 style="letter-spacing:6px;">${otp}</h2>
      <p>This code expires in <strong>10 minutes</strong>. Do not share it.</p>
    `,
  });
}

module.exports = sendOtpEmail;