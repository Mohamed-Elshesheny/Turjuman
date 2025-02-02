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
      throw error; // Re-throw the error
    }
  }

  async sendPasswordReset() {
    const subject = "Your Password Reset Token (valid for 10 minutes)";
    const customMessage = `Hi ${this.firstName},

Forgot your password? Submit a PATCH request with your new password and passwordConfirm to:
${this.url}

If you didn’t forget your password, please ignore this email.`;
    await this.send(subject, customMessage);
  }
};
