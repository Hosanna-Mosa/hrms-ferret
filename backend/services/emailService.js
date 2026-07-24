const nodemailer = require('nodemailer');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Role = require('../models/Role');

// Transporter configuration with fallback
const sendMail = async (options) => {
  let transporter;
  
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Fallback: create Ethereal test SMTP account
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (e) {
      console.error('Failed to create Ethereal test SMTP account. Falling back to console logger.', e);
      // Stub logger transporter
      transporter = {
        sendMail: async (mailOpts) => {
          console.log('\n--- EMAIL NOTIFICATION STUB ---');
          console.log(`To: ${mailOpts.to}`);
          console.log(`Subject: ${mailOpts.subject}`);
          console.log(`Content:\n${mailOpts.text || mailOpts.html}`);
          console.log('--------------------------------\n');
          return { messageId: 'stub_id' };
        }
      };
    }
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Ferret PeopleOS" <no-reply@ferrettechnologies.com>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    if (info && info.host === 'smtp.ethereal.email') {
      console.log('\n--- Ethereal Test Email Sent! ---');
      console.log(`View inbox at: ${nodemailer.getTestMessageUrl(info)}`);
      console.log('---------------------------------\n');
    }
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

// Traverse up manager hierarchy
const getManagerEmails = async (employeeId) => {
  const emails = [];
  let currentId = employeeId;
  const visited = new Set();

  while (currentId) {
    if (visited.has(currentId.toString())) break;
    visited.add(currentId.toString());

    const emp = await Employee.findById(currentId).populate('user_id').exec();
    if (!emp) break;

    // Add manager email if not the starting employee
    if (currentId.toString() !== employeeId.toString() && emp.user_id && emp.user_id.work_email) {
      emails.push(emp.user_id.work_email);
    }
    currentId = emp.manager_id;
  }
  return emails;
};

// Retrieve all HR emails
const getHrEmails = async () => {
  try {
    const hrRole = await Role.findOne({ name: 'HR' }).exec();
    if (!hrRole) return [];

    const hrUsers = await User.find({ role_id: hrRole._id }).exec();
    const userIds = hrUsers.map((u) => u._id);

    const hrEmployees = await Employee.find({ user_id: { $in: userIds } }).populate('user_id').exec();
    return hrEmployees.map((emp) => emp.user_id?.work_email).filter(Boolean);
  } catch (error) {
    console.error('Error fetching HR emails:', error);
    return [];
  }
};

// Retrieve all Super Admin emails
const getSuperAdminEmails = async () => {
  try {
    const adminRole = await Role.findOne({ name: 'SuperAdmin' }).exec();
    if (!adminRole) return [];

    const adminUsers = await User.find({ role_id: adminRole._id }).exec();
    const userIds = adminUsers.map((u) => u._id);

    const adminEmployees = await Employee.find({ user_id: { $in: userIds } }).populate('user_id').exec();
    return adminEmployees.map((emp) => emp.user_id?.work_email).filter(Boolean);
  } catch (error) {
    console.error('Error fetching admin emails:', error);
    return [];
  }
};

// Fetch list of recipients for notifications
const getNotificationRecipients = async (employeeId) => {
  try {
    const requester = await Employee.findById(employeeId).populate('user_id').exec();
    const requesterEmail = requester?.user_id?.work_email;

    const parentManagers = await getManagerEmails(employeeId);
    const hrEmails = await getHrEmails();
    const adminEmails = await getSuperAdminEmails();

    const allRecipients = Array.from(new Set([
      ...parentManagers,
      ...hrEmails,
      ...adminEmails
    ])).filter(email => email !== requesterEmail);
    
    return allRecipients;
  } catch (error) {
    console.error('Error resolving notification recipients:', error);
    return [];
  }
};

module.exports = {
  sendMail,
  getNotificationRecipients,
  getHrEmails,
  getSuperAdminEmails
};
