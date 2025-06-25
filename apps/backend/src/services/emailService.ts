import nodemailer from "nodemailer";
import { env } from "../config/env";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;
  // Initialize the email transporter
  private static getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465, // true for 465, false for other ports
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  // Send email
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const transporter = this.getTransporter();

      const mailOptions = {
        from: `"${env.APP_NAME}" <${env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", result.messageId);
      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  }

  // Send password reset email
  static async sendPasswordResetEmail(
    email: string,
    resetToken: string
  ): Promise<boolean> {
    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - ${env.APP_NAME}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #666; }
            .btn { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .btn:hover { background-color: #0056b3; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${env.APP_NAME}</h1>
              <h2>Password Reset Request</h2>
            </div>
            
            <div class="content">
              <p>Hello,</p>
              
              <p>We received a request to reset the password for your ${
                env.APP_NAME
              } account associated with this email address.</p>
              
              <p>To reset your password, click the button below:</p>
              
              <div style="text-align: center;">
                <a href="${resetLink}" class="btn">Reset Password</a>
              </div>
              
              <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
              <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px;">
                ${resetLink}
              </p>
              
              <div class="warning">
                <strong>Important:</strong>
                <ul>
                  <li>This link will expire in ${
                    env.PASSWORD_RESET_EXPIRY_HOURS
                  } hour(s)</li>
                  <li>If you didn't request this password reset, please ignore this email</li>
                  <li>For security reasons, this link can only be used once</li>
                </ul>
              </div>
              
              <p>If you're having trouble or didn't request this reset, please contact our support team.</p>
              
              <p>Best regards,<br>The ${env.APP_NAME} Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>&copy; ${new Date().getFullYear()} ${
      env.APP_NAME
    }. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Password Reset Request - ${env.APP_NAME}
      
      Hello,
      
      We received a request to reset the password for your ${env.APP_NAME} account.
      
      To reset your password, visit the following link:
      ${resetLink}
      
      This link will expire in ${env.PASSWORD_RESET_EXPIRY_HOURS} hour(s).
      
      If you didn't request this password reset, please ignore this email.
      
      Best regards,
      The ${env.APP_NAME} Team
    `;

    return await this.sendEmail({
      to: email,
      subject: `Password Reset - ${env.APP_NAME}`,
      html,
      text,
    });
  }

  // Send welcome email
  static async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ${env.APP_NAME}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #666; }
            .btn { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .btn:hover { background-color: #218838; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ${env.APP_NAME}!</h1>
            </div>
            
            <div class="content">
              <p>Hi ${name},</p>
              
              <p>Welcome to ${
                env.APP_NAME
              }! We're excited to have you on board.</p>
              
              <p>You can now start tracking your expenses, managing budgets, and gaining insights into your financial habits.</p>
              
              <div style="text-align: center;">
                <a href="${
                  env.FRONTEND_URL
                }/dashboard" class="btn">Get Started</a>
              </div>
              
              <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>
              
              <p>Happy budgeting!<br>The ${env.APP_NAME} Team</p>
            </div>
            
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${
      env.APP_NAME
    }. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Welcome to ${env.APP_NAME}!
      
      Hi ${name},
      
      Welcome to ${env.APP_NAME}! We're excited to have you on board.
      
      You can now start tracking your expenses, managing budgets, and gaining insights into your financial habits.
      
      Visit ${env.FRONTEND_URL}/dashboard to get started.
      
      Happy budgeting!
      The ${env.APP_NAME} Team
    `;

    return await this.sendEmail({
      to: email,
      subject: `Welcome to ${env.APP_NAME}!`,
      html,
      text,
    });
  }

  // Test email connection
  static async testConnection(): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      console.log("Email server connection verified");
      return true;
    } catch (error) {
      console.error("Email server connection failed:", error);
      return false;
    }
  }
}
