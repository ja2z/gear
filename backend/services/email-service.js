const { Resend } = require('resend');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const BSA_LOGO_PATH = path.join(__dirname, '../assets/BSA_Logo.png');
const BSA_LOGO_BASE64 = fs.readFileSync(BSA_LOGO_PATH).toString('base64');
const BSA_LOGO_URL = 'https://gear.t222.org/BSA_Logo_blue.png';

function buildPDF(outingName, reservedBy, reservationDate, items) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header with BSA logos flanking title
    const logoSize = 44;
    const pageWidth = 612;
    const contentWidth = pageWidth - 100; // margins
    const titleY = 50;

    // Center the title, place logos just outside it
    const titleText = 'Troop 222 Gear Reservation';
    const titleFontSize = 22;
    doc.fontSize(titleFontSize).font('Helvetica-Bold');
    const titleWidth = doc.widthOfString(titleText);
    const titleX = 50 + (contentWidth - titleWidth) / 2;

    const leftLogoX = titleX - logoSize - 10;
    const rightLogoX = titleX + titleWidth + 10;
    const logoY = titleY + (titleFontSize - logoSize) / 2 + 2;

    doc.image(BSA_LOGO_PATH, Math.max(50, leftLogoX), logoY, { width: logoSize, height: logoSize });
    doc.image(BSA_LOGO_PATH, Math.min(rightLogoX, pageWidth - 50 - logoSize), logoY, { width: logoSize, height: logoSize });

    doc
      .fontSize(titleFontSize)
      .fillColor('#1E398A')
      .font('Helvetica-Bold')
      .text(titleText, 50, titleY, { align: 'center' });

    doc.y = titleY + logoSize + 14;

    // Reservation details — left aligned
    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#444444')
      .text(`Outing: ${outingName}`)
      .text(`Reserved by: ${reservedBy}`)
      .text(`Reservation Date: ${reservationDate}`);

    doc.moveDown(1);
    doc
      .moveTo(50, doc.y)
      .lineTo(562, doc.y)
      .strokeColor('#1E398A')
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.5);

    // Items table header
    doc
      .fontSize(11)
      .fillColor('#1E398A')
      .font('Helvetica-Bold')
      .text('Item ID', 50, doc.y, { width: 120 })
      .text('Category', 170, doc.y - doc.currentLineHeight(), { width: 140 })
      .text('Description', 310, doc.y - doc.currentLineHeight(), { width: 252 });

    doc.moveDown(0.3);
    doc
      .moveTo(50, doc.y)
      .lineTo(562, doc.y)
      .strokeColor('#cccccc')
      .lineWidth(0.5)
      .stroke();
    doc.moveDown(0.3);

    // Items rows
    const rowHeight = 22;
    doc.font('Helvetica').fillColor('#333333').fontSize(10);
    items.forEach((item, idx) => {
      const y = doc.y;
      if (idx % 2 === 0) {
        doc.rect(48, y - 3, 516, rowHeight).fillColor('#f5f7ff').fill();
      }
      doc
        .fillColor('#333333')
        .text(item.itemId, 50, y, { width: 120 })
        .text(item.itemDesc || '', 170, y, { width: 140 })
        .text(item.description || '', 310, y, { width: 252 });
      doc.y = y + rowHeight;
    });

    doc.moveDown(1.5);
    doc
      .fontSize(9)
      .fillColor('#888888')
      .text(`Total items reserved: ${items.length}`, { align: 'right' });

    doc.moveDown(2);
    doc
      .fontSize(9)
      .fillColor('#888888')
      .text('Troop 222 — Gear Reservation System', { align: 'right' })
      .text('Questions? Contact qm@t222.org', { align: 'right' });

    doc.end();
  });
}

async function sendReservationConfirmation({ outingName, reservedBy, reservedEmail, loggedInEmail, items, reservationDate }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️  RESEND_API_KEY not configured — skipping reservation confirmation email');
    return { skipped: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Build recipient list: logged-in user, outing leader (reservedEmail), and QM — deduplicated.
  // In dev mode (EMAIL_DEV_ONLY=true), send only to the logged-in user.
  let recipients;
  if (process.env.EMAIL_DEV_ONLY === 'true') {
    recipients = [loggedInEmail || reservedEmail];
  } else {
    const seen = new Set();
    recipients = [loggedInEmail, reservedEmail, 'qm@t222.org']
      .filter(e => e && !seen.has(e.toLowerCase()) && seen.add(e.toLowerCase()));
  }
  const pdfBuffer = await buildPDF(outingName, reservedBy, reservationDate, items);

  const itemListHtml = items
    .map(i => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;">${i.itemId}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;">${i.itemDesc || ''}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;">${i.description || ''}</td></tr>`)
    .join('');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1E398A;border-radius:8px 8px 0 0;">
        <tr>
          <td width="52" bgcolor="#1E398A" style="padding:16px 0 16px 16px;vertical-align:middle;background-color:#1E398A;">
            <img src="${BSA_LOGO_URL}" alt="BSA" width="36" height="36" style="display:block;" />
          </td>
          <td bgcolor="#1E398A" style="padding:16px 8px;vertical-align:middle;text-align:center;background-color:#1E398A;">
            <span style="color:white;font-size:20px;font-weight:bold;">Troop 222 Gear Reservation Confirmed</span>
          </td>
          <td width="52" bgcolor="#1E398A" style="padding:16px 16px 16px 0;vertical-align:middle;text-align:right;background-color:#1E398A;">
            <img src="${BSA_LOGO_URL}" alt="BSA" width="36" height="36" style="display:block;margin-left:auto;" />
          </td>
        </tr>
      </table>
      <div style="background:#f9f9f9;padding:20px;border:1px solid #ddd;border-top:none;">
        <p>Hi ${reservedBy},</p>
        <p>Your gear reservation for <strong>${outingName}</strong> has been confirmed on ${reservationDate}.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:12px;">
          <thead>
            <tr style="background:#1E398A;color:white;">
              <th style="padding:6px 8px;text-align:left;">Item ID</th>
              <th style="padding:6px 8px;text-align:left;">Category</th>
              <th style="padding:6px 8px;text-align:left;">Description</th>
            </tr>
          </thead>
          <tbody>${itemListHtml}</tbody>
        </table>
        <p style="margin-top:16px;">A PDF copy of this reservation is attached.</p>
        <p style="color:#666;font-size:13px;">Questions? Contact <a href="mailto:qm@t222.org">qm@t222.org</a></p>
      </div>
    </div>
  `;

  await resend.emails.send({
    from: `Troop 222 QM <${process.env.RESEND_FROM || 'qm@t222.org'}>`,
    to: recipients,
    subject: `Gear Reservation Confirmed — ${outingName}`,
    html,
    attachments: [
      {
        filename: `reservation-${outingName.replace(/[^a-z0-9]/gi, '-')}.pdf`,
        content: pdfBuffer.toString('base64'),
      },
    ],
  });

  return { sent: true };
}

async function sendMagicLink({ to, first_name, magicLink }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️  RESEND_API_KEY not configured — magic link:', magicLink);
    return { skipped: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#1E398A;border-radius:8px 8px 0 0;">
        <tr>
          <td width="52" bgcolor="#1E398A" style="padding:16px 0 16px 16px;vertical-align:middle;">
            <img src="${BSA_LOGO_URL}" alt="BSA" width="36" height="36" style="display:block;" />
          </td>
          <td bgcolor="#1E398A" style="padding:16px 8px;vertical-align:middle;text-align:center;">
            <span style="color:white;font-size:20px;font-weight:bold;">Troop 222 Gear Tracker</span>
          </td>
          <td width="52" bgcolor="#1E398A" style="padding:16px 16px 16px 0;vertical-align:middle;text-align:right;">
            <img src="${BSA_LOGO_URL}" alt="BSA" width="36" height="36" style="display:block;margin-left:auto;" />
          </td>
        </tr>
      </table>
      <div style="background:#f9f9f9;padding:24px;border:1px solid #ddd;border-top:none;">
        <p style="margin-top:0;">Hi ${first_name},</p>
        <p>Click the button below to log in to the Troop 222 Gear Tracker.
           This link expires in <strong>15 minutes</strong> and can only be used once.</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${magicLink}"
             style="background:#1E398A;color:white;padding:14px 32px;border-radius:8px;
                    text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
            Log In to Gear Tracker
          </a>
        </div>
        <p style="color:#666;font-size:13px;">
          If you didn't request this, you can safely ignore this email.<br/>
          This link will expire automatically.
        </p>
        <p style="color:#666;font-size:13px;">
          Questions? Contact <a href="mailto:qm@t222.org">qm@t222.org</a>
        </p>
      </div>
    </div>
  `;

  await resend.emails.send({
    from:    `Troop 222 QM <${process.env.RESEND_FROM || 'qm@t222.org'}>`,
    to,
    subject: 'Your Troop 222 Gear Tracker login link',
    html,
  });

  return { sent: true };
}

module.exports = { sendReservationConfirmation, sendMagicLink };
