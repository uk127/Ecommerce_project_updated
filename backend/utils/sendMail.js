const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendMail = async (options) => {
  try {
    const data = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: options.email,
      subject: options.subject,
      text: options.message,
    });

    console.log('Email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = sendMail;
