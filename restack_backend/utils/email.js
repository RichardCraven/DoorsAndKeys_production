const nodemailer = require('nodemailer');

const sendNotificationEmail = async (subject, text) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'hierocode@gmail.com';
    const emailUser = process.env.EMAIL_USER || 'hierocode@gmail.com';
    const emailPass = process.env.EMAIL_PASS; // This must be set to the App Password!

    if (!emailPass) {
      console.warn('EMAIL_PASS is not set in environment variables. Email notification skipped.');
      return;
    }

    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    let info = await transporter.sendMail({
      from: `"Restack Notifications" <${emailUser}>`,
      to: adminEmail,
      subject: subject,
      text: text,
    });

    console.log('Notification email sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending notification email:', error);
  }
};

module.exports = {
  sendNotificationEmail
};
