const nodemailer = require("nodemailer");
require("dotenv").config();

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
    this.from = `Turjuman <mohamedelshesheny62@gmail.com>`;
  }

  createTransport() {
    return nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      auth: {
        user: "apikey",
        pass: process.env.SENDGRID_PASSWORD, // Your SendGrid API Key
      },
    });
  }

  async send(subject, customMessage) {
    try {
      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        text:
          customMessage ||
          `Hi ${this.firstName},\n\nPlease visit the following URL: ${this.url}`,
        html: customMessage
          ? `<p>${customMessage.replace(/\n/g, "<br>")}</p>`
          : `<p>Hi ${this.firstName},</p><p>Please visit the following link:</p><a href="${this.url}">${this.url}</a>`,
      };

      await this.createTransport().sendMail(mailOptions);
      console.log("Email sent successfully!");
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }

  async sendPasswordReset() {
    const subject = "🔐 Password Reset Request - Turjuman";
    const customMessage = `Hi ${this.firstName},  
  We received a request to reset your password. No worries, you can set a new one using the link below:  
  🔗 **Reset Your Password:**  
  [Click here to reset your password](${this.url})  
  ⚠️ **This link is valid for only 10 minutes.** If you did not request a password reset, you can safely ignore this email. Your account security remains intact.  
  If you need any help, feel free to reach out to our support team.  
  
  Best regards,  
  The Turjuman Team 🚀`;

    await this.send(subject, customMessage);
  }

  async sendWelcome() {
    try {
      const mailOptions = {
        from: this.from,
        to: this.to,
        templateId: "d-3f1136812d5d4f5aac4322f05a8a89d8",
        dynamic_template_data: {
          first_name: this.firstName,
          url: this.url,
          unsubscribe:
            "https://turjuman.vercel.app/unsubscribe?email=" + this.to,
          unsubscribe_preferences: "https://turjuman.vercel.app/preferences",
        },
      };

      await this.createTransport().sendMail(mailOptions);
      console.log("Welcome email sent successfully!");
    } catch (error) {
      console.error("Error sending welcome email:", error);
      throw error;
    }
  }
};
