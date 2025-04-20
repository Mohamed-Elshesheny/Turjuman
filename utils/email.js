const sgMail = require("@sendgrid/mail");
require("dotenv").config();

sgMail.setApiKey(process.env.SENDGRID_PASSWORD); // or SENDGRID_API_KEY if renamed

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
    this.from = `Turjuman <no-reply@turjuman.online>`;
  }

  setSender(type) {
    const senders = {
      default: `Turjuman <no-reply@turjuman.online>`,
      support: `Turjuman Support <support@turjuman.online>`,
      info: `Turjuman <info@turjuman.online>`,
      admin: `Admin Notifications <admin@turjuman.online>`,
      alerts: `Turjuman Alerts <alerts@turjuman.online>`,
      marketing: `Turjuman Deals <marketing@turjuman.online>`,
    };

    this.from = senders[type] || senders.default;
  }

  async send(templateId, data) {
    try {
      const msg = {
        to: this.to,
        from: this.from,
        templateId,
        dynamic_template_data: data,
      };

      await sgMail.send(msg);
      console.log(`Email with template ${templateId} sent successfully!`);
    } catch (error) {
      console.error("SendGrid API failed:", error.response?.body || error);
      throw error;
    }
  }

  async sendPasswordReset() {
    this.setSender('support');
    await this.send("d-0d8fe808f3e24fa28007e730bb526b47", {
      first_name: this.firstName,
      url: this.url,
      unsubscribe: `https://turjuman.vercel.app/unsubscribe?email=${this.to}`,
      unsubscribe_preferences: "https://turjuman.vercel.app/preferences"
    });
  }

  async sendWelcome() {
    this.setSender('info');
    await this.send("d-3f1136812d5d4f5aac4322f05a8a89d8", {
      first_name: this.firstName,
      url: this.url,
      unsubscribe: `https://turjuman.vercel.app/unsubscribe?email=${this.to}`,
      unsubscribe_preferences: "https://turjuman.vercel.app/preferences"
    });
  }
};
