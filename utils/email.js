const nodemailer = require("nodemailer");
require("dotenv").config();

module.exports = class Email {
  constructor(user, url) {

    if (!user.email || !user.name) {
      throw new Error("Invalid user data: email or name is missing.");
    }

    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
    this.from = `Turjuman <mohamedelshesheny62@gmail.com>`; // Static sender email
  }

  createTransport() {
    return nodemailer.createTransport({
      host: "smtp.sendgrid.net", // SMTP host for SendGrid
      port: 587, // SMTP port for SendGrid
      auth: {
        user: "apikey", // SendGrid username
        pass: process.env.SENDGRID_PASSWORD, // Your SendGrid API Key
      },
    });
  }

  async send(subject, customMessage) {
    try {
      const mailOptions = {
        from: this.from, 
        to: this.to, 
        subject: subject, 
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
    }
  }

  async sendWelcome() {
    const subject = "Welcome to Turjuman ❤️!";
    const customMessage = `Hi ${this.firstName},

Welcome to Turjuman! We're excited to have you on board. Please visit the following link to get started:
<a href="${this.url}">${this.url}</a>

If you have any questions, feel free to reach out to us.`;
    await this.send(subject, customMessage);
  }

  async sendPasswordReset() {
    const subject = "Your Password Reset Token (valid for 10 minutes)";
    const customMessage = `Hi ${this.firstName},

Forgot your password? Submit a PATCH request with your new password and passwordConfirm to:
<a href="${this.url}">${this.url}</a>

If you didn’t forget your password, please ignore this email.`;
    await this.send(subject, customMessage);
  }
};
