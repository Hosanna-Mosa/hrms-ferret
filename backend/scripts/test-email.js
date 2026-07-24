require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sendMail } = require('../services/emailService');

const run = async () => {
  console.log('Sending test email to hosannamosa4190@gmail.com...');
  console.log('SMTP Config:', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    from: process.env.SMTP_FROM
  });

  try {
    const info = await sendMail({
      to: 'hosannamosa4190@gmail.com',
      subject: 'Ferret PeopleOS - SMTP Email Test Success!',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px; max-width: 600px; margin: auto;">
          <h2 style="color: #e11d48; margin-top: 0;">SMTP Test Email</h2>
          <p>Hello,</p>
          <p>This is a test email sent from the Ferret PeopleOS HRMS platform backend to verify your SMTP configuration.</p>
          <p>If you received this message, the email notification system is working perfectly!</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>
          <small style="color: #888;">Ferret PeopleOS HRMS Portal</small>
        </div>
      `
    });

    if (info) {
      console.log('Email sent successfully!');
      console.log('Message ID:', info.messageId);
    } else {
      console.log('Failed to send email.');
    }
  } catch (error) {
    console.error('Error during test email execution:', error);
  }
};

run();
