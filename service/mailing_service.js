// Function to send mail.

// Import the required modules.
const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");
require("dotenv").config();


const generateEmail = async ({
  to,
  subject,
  data,
  cc,
  bcc,
  salutation,
  messageOne,
  messageTwo,
}) => {

  const transporter = nodemailer.createTransport({
     service: 'gmail',
   auth: {
    user: process.env.USER,
    pass: process.env.PASS  // <-- use the one you just got
  }
});

  try {
    const templatePath = path.join(
      __dirname,
      "../",
      "templates",
      "welcome_email2.ejs"
      
    );
    const template = await ejs.renderFile(
      templatePath,
      {
        data: data,
        salutation: salutation,
        messageOne: messageOne,
        messageTwo: messageTwo,
        timestamp: Date.now(),
      },
      { async: true }
    );

    const mailOptions = {
      from: {
        name: 'Event Book',
        address: process.env.USER,
      },
      to: to,
      subject: subject,
      html: template,
      cc: cc,
      bcc: bcc,
    };

    await transporter.sendMail(mailOptions);

  } catch (error) {
    console.log(error);
    throw error;
  } 
};

module.exports = generateEmail;