const sgMail = require("@sendgrid/mail");
const { generateInvoice } = require("./invoiceGenerator");
require("dotenv").config();

sgMail.setApiKey(process.env.SENDGRID_PASSWORD); // or SENDGRID_API_KEY if renamed

module.exports = class Email {
  constructor(email, name, url) {
    if (!email) {
      throw new Error("Recipient email is required!");
    }
    this.to = email;
    this.firstName = name?.split(" ")[0] || "";
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
      billing: `Turjuman Billing <payment@turjuman.online>`,
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
    this.setSender("support");
    await this.send("d-0d8fe808f3e24fa28007e730bb526b47", {
      first_name: this.firstName,
      url: this.url,
      unsubscribe: `https://turjuman.online/unsubscribe?email=${this.to}`,
      unsubscribe_preferences: "https://turjuman.online/preferences",
    });
  }

  // async sendWelcome() {
  //   this.setSender("info");
  //   await this.send("d-3f1136812d5d4f5aac4322f05a8a89d8", {
  //     first_name: this.firstName,
  //     url: this.url,
  //     unsubscribe: `https://turjuman.online/unsubscribe?email=${this.to}`,
  //     unsubscribe_preferences: "https://turjuman.online/preferences",
  //   });
  // }

  async sendInvoice(items) {
    this.setSender("billing");

    const pdfBuffer = await generateInvoice(
      { name: this.firstName, email: this.to },
      items
    );

    const msg = {
      to: this.to,
      from: this.from,
      templateId: "d-f2d5c5a03bf34906b2ee8b26448bf398",
      dynamic_template_data: {
        first_name: this.firstName,
        current_date: new Date().toLocaleDateString(),
        invoice_id: "INV-" + Math.floor(Math.random() * 100000), // يمكنك تحسين هذا لاحقاً
        amount: items.reduce((total, item) => total + item.amount, 0),
        url: this.url,
        unsubscribe: `https://turjuman.online/unsubscribe?email=${this.to}`,
        unsubscribe_preferences: "https://turjuman.online/preferences",
      },
    };

    await sgMail.send(msg);
    console.log("📩 Invoice template sent!");
  }

  async sendVerificationEmail() {
    this.setSender("info");
    await this.send("d-e021b42e83bd42cbb70219ced68f1c7c", {
      first_name: this.firstName,
      url: this.url,
      unsubscribe: `https://turjuman.online/unsubscribe?email=${this.to}`,
      unsubscribe_preferences: "https://turjuman.online/preferences",
    });
  }
};
