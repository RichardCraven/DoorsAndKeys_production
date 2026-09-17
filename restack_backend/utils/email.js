const nodemailer = require('nodemailer');
let cachedTransporter = null;
let lastEmailErrorTime = 0;

const sendNotificationEmail = async (subject, text) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'hierocode@gmail.com';
    const emailUser = process.env.EMAIL_USER || 'hierocode@gmail.com';
    const emailPass = process.env.EMAIL_PASS; // This must be set to the App Password!

    if (!emailPass) {
      console.warn('EMAIL_PASS is not set in environment variables. Email notification skipped.');
      return;
    }

    // Rate-limit email attempts if SMTP is currently failing / rate-limited by Gmail (cooldown 60s)
    if (Date.now() - lastEmailErrorTime < 60000) {
      return;
    }

    const uniqueId = Math.floor(100 + Math.random() * 900);
    const uniqueSubject = `${subject} [${uniqueId}]`;

    if (!cachedTransporter) {
      cachedTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass
        }
      });
    }

    const mailOptions = {
      from: `"DreamTower Notifications" <${emailUser}>`,
      to: adminEmail,
      subject: uniqueSubject,
      text: text,
    };

    let info = await cachedTransporter.sendMail(mailOptions);
    console.log('Notification email sent: %s', info.messageId);
  } catch (error) {
    lastEmailErrorTime = Date.now();
    if (error && (error.code === 'EAUTH' || error.responseCode === 454)) {
      console.warn('[Email Warning] SMTP Auth rate-limited by provider (454). Pausing email notifications for 60s.');
    } else {
      console.error('Error sending notification email:', error.message || error);
    }
  }
};

module.exports = {
  sendNotificationEmail
};
