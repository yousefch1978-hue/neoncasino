// Email Service - Simulates sending emails by storing them in localStorage
// In production, replace with actual email API like SendGrid, AWS SES, etc.

export interface Email {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
}

// Store sent emails in localStorage
const EMAILS_KEY = 'neoncasino_emails';

const getStoredEmails = (): Email[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(EMAILS_KEY);
  return stored ? JSON.parse(stored) : [];
};

const storeEmail = (email: Email) => {
  if (typeof window === 'undefined') return;
  const emails = getStoredEmails();
  emails.unshift(email);
  localStorage.setItem(EMAILS_KEY, JSON.stringify(emails.slice(0, 100))); // Keep last 100
};

export const sendEmail = async ({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}): Promise<boolean> => {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const email: Email = {
      id: `email-${Date.now()}`,
      to,
      subject,
      body,
      sentAt: new Date().toISOString(),
    };
    
    storeEmail(email);
    
    // Log for debugging
    console.log('📧 Email sent:', { to, subject });
    
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

export const sendWelcomeEmail = async (email: string, username: string): Promise<boolean> => {
  const subject = 'Welcome to NeonCasino! 🎰';
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #fff; padding: 30px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #00ff87; font-size: 32px; margin: 0;">NeonCasino</h1>
        <p style="color: #888; margin: 10px 0 0;">Play. Win. Repeat.</p>
      </div>
      
      <h2 style="color: #fff; font-size: 24px;">Welcome, ${username}! 👋</h2>
      
      <p style="color: #ccc; line-height: 1.6;">
        Thank you for joining NeonCasino! We're excited to have you as part of our community.
      </p>
      
      <div style="background: #1a1a1a; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <h3 style="color: #00ff87; margin-top: 0;">What's next?</h3>
        <ul style="color: #ccc; padding-left: 20px; line-height: 1.8;">
          <li>Make your first deposit and claim bonuses</li>
          <li>Try our exciting games: Mines, Coin Flip, Crash, and Dice</li>
          <li>Join our Discord community for updates and support</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://https://discord.gg/b3p3NKDV" 
           style="background: #5865F2; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
          Join Our Discord
        </a>
      </div>
      
      <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
        If you have any questions, reply to this email or contact our support team.
      </p>
    </div>
  `;
  
  return sendEmail({ to: email, subject, body });
};


export const sendPasswordResetEmail = async (email: string, resetToken: string): Promise<boolean> => {
  const subject = 'Password Reset Request - NeonCasino';
  const resetUrl = `${window.location.origin}/reset-password?token=${resetToken}`;
  
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #fff; padding: 30px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #00ff87; font-size: 32px; margin: 0;">NeonCasino</h1>
      </div>
      
      <h2 style="color: #fff; font-size: 24px;">Password Reset Request 🔐</h2>
      
      <p style="color: #ccc; line-height: 1.6;">
        We received a request to reset your password. Click the button below to create a new password:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background: #00ff87; color: #0f0f0f; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
          Reset Password
        </a>
      </div>
      
      <p style="color: #666; font-size: 12px;">
        If you didn't request this, you can safely ignore this email. The link will expire in 24 hours.
      </p>
    </div>
  `;
  
  return sendEmail({ to: email, subject, body });
};

export const sendDepositConfirmation = async (email: string, amount: number, crypto: string): Promise<boolean> => {
  const subject = 'Deposit Request Received - NeonCasino';
  
  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #fff; padding: 30px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #00ff87; font-size: 32px; margin: 0;">NeonCasino</h1>
      </div>
      
      <h2 style="color: #fff; font-size: 24px;">Deposit Request Received 💰</h2>
      
      <p style="color: #ccc; line-height: 1.6;">
        We've received your deposit request and it's being processed.
      </p>
      
      <div style="background: #1a1a1a; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="color: #00ff87; margin: 0; font-size: 18px;">Amount: $${amount.toFixed(2)}</p>
        <p style="color: #888; margin: 5px 0 0;">Cryptocurrency: ${crypto.toUpperCase()}</p>
      </div>
      
      <p style="color: #ccc; line-height: 1.6;">
        Your deposit will be credited to your account once confirmed. This usually takes a few minutes.
      </p>
    </div>
  `;
  
  return sendEmail({ to: email, subject, body });
};

// Get all sent emails (for admin panel)
export const getSentEmails = (): Email[] => {
  return getStoredEmails();
};
