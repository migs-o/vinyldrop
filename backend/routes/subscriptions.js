const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/subscriptions/subscribe - Subscribe email
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existing = await query(
      'SELECT id, verified FROM subscribers WHERE email = $1',
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      const subscriber = existing.rows[0];
      
      // If already verified, return success
      if (subscriber.verified) {
        return res.status(200).json({ 
          success: true,
          message: 'You are already subscribed!',
          verified: true 
        });
      }
      
      // If not verified, update subscribed_at and resend email
      await query(
        'UPDATE subscribers SET subscribed_at = NOW() WHERE email = $1',
        [normalizedEmail]
      );
      
      await sendWelcomeEmail(normalizedEmail);
      
      return res.status(200).json({ 
        success: true,
        message: 'Welcome email sent! Please check your inbox.',
        verified: false 
      });
    }

    // Insert new subscriber
    await query(
      'INSERT INTO subscribers (email, verified) VALUES ($1, $2)',
      [normalizedEmail, true] // Auto-verify for now, can add verification flow later
    );

    // Send welcome email
    await sendWelcomeEmail(normalizedEmail);

    res.json({ 
      success: true, 
      message: 'Thanks for subscribing! Check your email for a welcome message.' 
    });

  } catch (error) {
    console.error('Subscription error:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Email already subscribed' });
    }
    res.status(500).json({ error: 'Failed to subscribe. Please try again later.' });
  }
});

// GET /api/subscriptions/unsubscribe - Unsubscribe email (via link)
router.get('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const normalizedEmail = decodeURIComponent(email).toLowerCase().trim();

    // Update database
    const result = await query(
      'UPDATE subscribers SET unsubscribed_at = NOW(), verified = false WHERE email = $1 RETURNING id',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Remove from Resend's audience
    try {
      await resend.contacts.remove({
        email: normalizedEmail
      });
      console.log(`✅ Removed ${normalizedEmail} from Resend audience`);
    } catch (resendError) {
      console.error('Error removing from Resend audience:', resendError);
      // Continue even if Resend update fails, as we've already updated our database
    }

    res.json({ 
      success: true, 
      message: 'Successfully unsubscribed' 
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// POST /api/subscriptions/unsubscribe - Unsubscribe email (via form)
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Update database
    const result = await query(
      'UPDATE subscribers SET unsubscribed_at = NOW(), verified = false WHERE email = $1 RETURNING id',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Remove from Resend's audience
    try {
      await resend.contacts.remove({
        email: normalizedEmail
      });
      console.log(`✅ Removed ${normalizedEmail} from Resend audience`);
    } catch (resendError) {
      console.error('Error removing from Resend audience:', resendError);
      // Continue even if Resend update fails, as we've already updated our database
    }

    res.json({ 
      success: true, 
      message: 'Successfully unsubscribed' 
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Helper function to send welcome email
async function sendWelcomeEmail(email) {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    const fromName = process.env.RESEND_FROM_NAME || 'VinylDrop';
    
    // Validate that RESEND_FROM_EMAIL is set and not using test domain
    if (!fromEmail) {
      throw new Error('RESEND_FROM_EMAIL environment variable is required. Please set it to an email from your verified domain (e.g., noreply@yourdomain.com)');
    }
    
    if (fromEmail.includes('resend.dev') || fromEmail.includes('onboarding@')) {
      throw new Error('Cannot use Resend test domain. Please set RESEND_FROM_EMAIL to an email from your verified domain (e.g., noreply@yourdomain.com)');
    }
    
    // Generate unsubscribe URL with email parameter
    const unsubscribeUrl = `${frontendUrl}/unsubscribe?email=${encodeURIComponent(email)}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to VinylDrop</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 20px 0; text-align: center; background-color: #1a1a2e;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">VinylDrop</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 20px; background-color: #ffffff;">
                <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto;">
                  <tr>
                    <td>
                      <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 20px; font-weight: 600;">Welcome!</h2>
                      <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                        Thank you for subscribing to VinylDrop. You will now receive updates about new vinyl releases, preorders, and exclusive deals.
                      </p>
                      <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                        We track releases from multiple sources:
                      </p>
                      <ul style="margin: 0 0 30px 0; padding-left: 20px; color: #666666; font-size: 16px; line-height: 1.8;">
                        <li>Music releases from r/VinylReleases</li>
                        <li>Video game music from r/VGMvinyl</li>
                        <li>Deals and discounts from r/vinyldeals</li>
                      </ul>
                      <table role="presentation" style="width: 100%; margin: 30px 0;">
                        <tr>
                          <td style="text-align: center;">
                            <a href="${frontendUrl}" style="display: inline-block; padding: 12px 24px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">View Latest Releases</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 30px 0 0 0; color: #999999; font-size: 14px; line-height: 1.5;">
                        You're receiving this because you subscribed to VinylDrop updates.
                      </p>
                      <p style="margin: 15px 0 0 0; text-align: center;">
                        <a href="${unsubscribeUrl}" style="color: #999999; text-decoration: underline; font-size: 14px;">Unsubscribe from these emails</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px; text-align: center; background-color: #f4f4f4;">
                <p style="margin: 0; color: #999999; font-size: 12px;">
                  VinylDrop - Your source for vinyl releases and deals
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const textContent = `Welcome to VinylDrop!

Thank you for subscribing. You will now receive updates about new vinyl releases, preorders, and exclusive deals.

We track releases from:
- Music releases from r/VinylReleases
- Video game music from r/VGMvinyl
- Deals and discounts from r/vinyldeals

Visit us at: ${frontendUrl}

You're receiving this because you subscribed to VinylDrop updates.
Unsubscribe: ${unsubscribeUrl}

VinylDrop - Your source for vinyl releases and deals`;

    // Add to Resend's audience first
    try {
      await resend.contacts.create({
        email: email,
        first_name: email.split('@')[0], // Use the part before @ as first name
        unsubscribed: false
      });
      console.log(`✅ Added ${email} to Resend audience`);
    } catch (resendError) {
      console.error('Error adding to Resend audience:', resendError);
      // Continue with sending the email even if adding to audience fails
    }

    // Send welcome email
    try {
      await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: email,
        replyTo: process.env.RESEND_REPLY_TO || fromEmail,
        subject: 'Welcome to VinylDrop!',
        html: htmlContent,
        text: textContent,
        headers: {
          'X-Entity-Ref-ID': 'welcome-email',
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'Precedence': 'bulk',
          'X-Auto-Response-Suppress': 'All',
        },
      });
      console.log(`✅ Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't throw - we don't want to fail the subscription if email fails
      // The email is stored in DB, we can retry later if needed
    }
  } catch (error) {
    console.error('Unexpected error in sendWelcomeEmail:', error);
    throw error;
  }
}

module.exports = router;

