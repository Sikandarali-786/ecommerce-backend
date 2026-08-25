import nodemailer from "nodemailer";

// ── Create reusable transporter ───────────────────────────────────────────────
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false, // true for port 465, false for 587 (STARTTLS)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// ── Base HTML wrapper ─────────────────────────────────────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body  { margin:0; padding:0; background:#f5f5f5; font-family:'Segoe UI',Arial,sans-serif; }
    .wrap { max-width:600px; margin:30px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08); }
    .header { background:#8B0000; padding:28px 32px; text-align:center; }
    .header h1 { margin:0; color:#fff; font-size:22px; letter-spacing:0.5px; }
    .header p  { margin:4px 0 0; color:#ffb3b3; font-size:13px; }
    .body   { padding:32px; color:#333; }
    .body p { line-height:1.7; font-size:15px; margin:0 0 14px; }
    .btn    { display:inline-block; margin:20px 0; padding:14px 32px; background:#8B0000;
              color:#fff!important; text-decoration:none; border-radius:8px;
              font-size:15px; font-weight:600; letter-spacing:0.3px; }
    .divider { border:none; border-top:1px solid #eee; margin:24px 0; }
    .item-row { display:flex; justify-content:space-between; padding:8px 0;
                border-bottom:1px solid #f0f0f0; font-size:15px; font-weight:600; }
    .item-name { color:#444; font-size:15px; font-weight:600; }
    .item-price { font-weight:600; color:#222; font-size:15px; }
    .font-weight-bold { font-weight:600; font-size:15px; }
    .total-row  { display:flex; justify-content:space-between; padding:12px 0 0;
                  font-size:15px; font-weight:600; color:#8B0000; }
    .badge { display:inline-block; padding:5px 14px; border-radius:20px;
             font-size:13px; font-weight:600; }
    .badge-processing { background:#dbeafe; color:#1e40af; }
    .badge-confirmed  { background:#ede9fe; color:#6d28d9; }
    .badge-shipped    { background:#ffedd5; color:#9a3412; }
    .badge-delivered  { background:#dcfce7; color:#166534; }
    .badge-cancelled  { background:#fee2e2; color:#991b1b; }
    .footer { background:#f9f9f9; padding:20px 32px; text-align:center;
              font-size:12px; color:#999; border-top:1px solid #eee; }
    .footer a { color:#8B0000; text-decoration:none; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>Afzal Bikerz Store</h1>
      <p>Pakistan's #1 Motorcycle Parts Store</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© 2026 Afzal Bikerz Store · Husain a gahi Market, Multan</p>
      <p><span style="display:inline-block; vertical-align:middle; text-align:center;">
        <a href="tel:03048405899">03048405899</a><br/>
        <a href="tel:03700780090">03700780090</a>
      </span>
      &nbsp;|&nbsp;
      <a href="mailto:Afzalbikerzstore@gmail.com">Afzalbikerzstore@gmail.com</a></p>
    </div>
  </div>
</body>
</html>`;

// ── Template: Password Reset ───────────────────────────────────────────────────
const passwordResetTemplate = ({ name, resetUrl }) => baseTemplate(`
  <p>Hi <strong>${name}</strong>,</p>
  <p>We received a request to reset the password for your Afzal Bikerz Store account.</p>
  <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
  <div style="text-align:center;">
    <a href="${resetUrl}" class="btn">Reset My Password</a>
  </div>
  <hr class="divider" />
  <p style="font-size:13px;color:#888;">
    If you didn't request a password reset, you can safely ignore this email.
    Your password will not change.<br/><br/>
    Or copy this link into your browser:<br/>
    <a href="${resetUrl}" style="color:#8B0000;word-break:break-all;">${resetUrl}</a>
  </p>
`);

// ── Template: Welcome / Registration ─────────────────────────────────────────
const welcomeTemplate = ({ name }) => baseTemplate(`
  <p>Hi <strong>${name}</strong> 👋</p>
  <p>Welcome to <strong>Afzal Bikerz Store</strong> — Pakistan's #1 Motorcycle Parts Store!</p>
  <p>Your account has been created successfully. You can now:</p>
  <ul style="font-size:15px;line-height:1.9;color:#444;">
    <li>Browse hundreds of motorcycle parts</li>
    <li>Track your orders in real time</li>
    <li>Save favourites to your wishlist</li>
  </ul>
`);

// ── Template: Order Confirmation ──────────────────────────────────────────────
const orderConfirmationTemplate = ({ name, order }) => {
  const itemsHtml = order.items.map(item => `
      <div class="item-row">
        <span class="item-name">${item.title} × ${item.quantity}</span>
        <span class="item-price">PKR ${(item.price * item.quantity).toLocaleString()}</span>
      </div>`).join('');

  const orderUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders`;

  return baseTemplate(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>🎉 Thank you for your order! We've received it and it's now being processed.</p>

      <div style="background:#fafafa;border-radius:8px;padding:20px;margin:16px 0;">
        <p style="margin:0 0 4px;font-size:13px;color:#888;">ORDER ID</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:#222;font-family:monospace;">
          #${order._id.toString().slice(-8).toUpperCase()}
        </p>
      </div>

      <p style="font-weight:600;margin-bottom:8px;">Items Ordered</p>
      ${itemsHtml}
      <hr class="divider" />
      <div class="item-row">
        <span class="item-name font-weight-bold">Subtotal : </span>
        <span class="item-price">PKR ${order.subtotal.toLocaleString()}</span>
      </div>
      ${order.discount > 0 ? `
      <div class="item-row">
        <span class="item-name font-weight-bold" style="color:#166534;">Advance Payment Discount (1%) : </span>
        <span class="item-price" style="color:#166534;">- PKR ${order.discount.toLocaleString()}</span>
      </div>` : ''}
      <div class="item-row">
        <span class="item-name font-weight-bold">Shipping : </span>
        <span class="item-price">${order.shippingCost === 0 ? 'FREE' : `PKR ${order.shippingCost.toLocaleString()}`}</span>
      </div>
      <div class="item-row">
        <span class="item-name font-weight-bold">Tax : </span>
        <span class="item-price">PKR ${order.tax.toLocaleString()}</span>
      </div>
      <div class="total-row">
        <span class="item-name font-weight-bold">Total Amount : </span>
        <span style="font-size:15px; font-weight:600; color:#8B0000;">PKR ${order.total.toLocaleString()}</span>
      </div>
      <hr class="divider" />

      <p style="font-weight:600;margin-bottom:6px;">Shipping To</p>
      <p style="font-size:14px;color:#555;margin:0;">
        ${order.shippingInfo.fullName}<br/>
        ${order.shippingInfo.address}, ${order.shippingInfo.city}<br/>
        ${order.shippingInfo.state}, ${order.shippingInfo.country} ${order.shippingInfo.zipCode}<br/>
        📞 ${order.shippingInfo.phone}
      </p>
      <hr class="divider" />
      <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>

      <div style="text-align:center;">
        <a href="${orderUrl}" class="btn">View My Orders</a>
      </div>
    `);
};

// ── Template: Order Status Update ────────────────────────────────────────────
const orderStatusTemplate = ({ name, order, newStatus }) => {
  const badgeClass = `badge badge-${newStatus.toLowerCase()}`;
  const messages = {
    Confirmed: "Great news! Your order has been confirmed and is being prepared.",
    Shipped: "Your order is on its way! 🚚 Expect delivery within 2–5 business days.",
    Delivered: "Your order has been delivered. We hope you love your new motorcycle parts! 🎉",
    Cancelled: "Your order has been cancelled. If you paid online, a refund will be processed shortly.",
  };

  const orderUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders`;

  return baseTemplate(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>${messages[newStatus] || `Your order status has been updated.`}</p>

      <div style="background:#fafafa;border-radius:8px;padding:20px;margin:16px 0;">
        <p style="margin:0 0 6px;font-size:13px;color:#888;">ORDER ID</p>
        <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#222;font-family:monospace;">
          #${order._id.toString().slice(-8).toUpperCase()}
        </p>
        <p style="margin:0;font-size:13px;color:#888;">NEW STATUS</p>
        <span class="${badgeClass}">${newStatus}</span>
      </div>

      <div style="text-align:center;">
        <a href="${orderUrl}" class="btn">Track My Order</a>
      </div>
    `);
};

// ── Template: Admin New Order Notification ──────────────────────────────────
const adminNewOrderTemplate = ({ order, customerName }) => {
  const itemsHtml = order.items.map(item => `
      <div class="item-row">
        <span class="item-name">${item.title} × ${item.quantity}</span>
        <span class="item-price">PKR ${(item.price * item.quantity).toLocaleString()}</span>
      </div>`).join('');

  const orderUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/orders`;

  return baseTemplate(`
      <p>Hi Admin,</p>
      <p>A new order has been placed by <strong>${customerName}</strong>.</p>

      <div style="background:#fafafa;border-radius:8px;padding:20px;margin:16px 0;">
        <p style="margin:0 0 4px;font-size:13px;color:#888;">ORDER ID</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:#222;font-family:monospace;">
          #${order._id.toString().slice(-8).toUpperCase()}
        </p>
      </div>

      <p style="font-weight:600;margin-bottom:8px;">Items Ordered</p>
      ${itemsHtml}

      <hr class="divider" />
      <div class="item-row">
        <span class="item-name">Total</span>
        <span>PKR ${order.total.toLocaleString()}</span>
      </div>
      <div class="item-row">
        <span class="item-name">Payment Method</span>
        <span>${order.paymentMethod}</span>
      </div>
      <div class="item-row">
        <span class="item-name">Payment Status</span>
        <span>${order.paymentStatus}</span>
      </div>

      <div style="text-align:center;">
        <a href="${orderUrl}" class="btn">Open Admin Orders</a>
      </div>
    `);
};

// ── Template: Admin Low Stock Notification ─────────────────────────────────
const lowStockTemplate = ({ product, remainingStock, threshold }) => baseTemplate(`
  <p>Hi Admin,</p>
  <p><strong>${product.title}</strong> is running low on stock.</p>

  <div style="background:#fafafa;border-radius:8px;padding:20px;margin:16px 0;">
    <p style="margin:0 0 4px;font-size:13px;color:#888;">PRODUCT</p>
    <p style="margin:0;font-size:16px;font-weight:700;color:#222;">${product.title}</p>
  </div>

  <div class="item-row">
    <span class="item-name">Remaining Stock</span>
    <span class="item-price">${remainingStock}</span>
  </div>
  <div class="item-row">
    <span class="item-name">Low Stock Threshold</span>
    <span class="item-price">${threshold}</span>
  </div>

  <p style="font-size:13px;color:#888;margin-top:18px;">
    Please restock this item soon to avoid stockouts.
  </p>
`);

// ── Core sendEmail function ───────────────────────────────────────────────────
export const sendEmail = async ({ to, subject, html }) => {
  // Diagnostic: log that sendEmail was invoked
  console.log(`⏳ sendEmail invoked -> to: ${to} subject: ${subject}`);

  // Skip silently if email credentials are not configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️  Email credentials not set — skipping email to:", to);
    return;
  }

  try {
    const transporter = createTransporter();
    const from = process.env.EMAIL_FROM || `Afzal Bikerz Store <${process.env.EMAIL_USER}>`;

    const info = await transporter.sendMail({ from, to, subject, html });
    console.log(`✉️  Email sent to ${to} — Message ID: ${info.messageId}`);
  } catch (err) {
    // Log full error but never crash the request if email fails
    console.error("❌  Email send failed:", err);
  }
};

// ── Named email senders ───────────────────────────────────────────────────────
export const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: "Welcome to Afzal Bikerz Store 🏍️",
    html: welcomeTemplate({ name: user.name }),
  });

export const sendPasswordResetEmail = (user, rawToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${rawToken}`;
  return sendEmail({
    to: user.email,
    subject: "Reset Your Password — Afzal Bikerz Store",
    html: passwordResetTemplate({ name: user.name, resetUrl }),
  });
};

export const sendOrderConfirmationEmail = (user, order) =>
  sendEmail({
    to: user.email,
    subject: `Order Confirmed #${order._id.toString().slice(-8).toUpperCase()} — Afzal Bikerz Store`,
    html: orderConfirmationTemplate({ name: user.name, order }),
  });

export const sendOrderStatusEmail = (user, order, newStatus) =>
  sendEmail({
    to: user.email,
    subject: `Your Order is ${newStatus} — Afzal Bikerz Store`,
    html: orderStatusTemplate({ name: user.name, order, newStatus }),
  });

const parseAdminEmails = () =>
  (process.env.ADMIN_EMAIL || "")
    .split(",")
    .map(email => email.trim())
    .filter(Boolean);

export const sendAdminNewOrderEmail = (order, user) => {
  const admins = parseAdminEmails();
  console.log('📣 Admin notification recipients:', admins);
  if (admins.length === 0) return Promise.resolve();

  return Promise.all(
    admins.map(adminEmail =>
      sendEmail({
        to: adminEmail,
        subject: `New Order Received #${order._id.toString().slice(-8).toUpperCase()} — Afzal Bikerz Store`,
        html: adminNewOrderTemplate({
          order,
          customerName: user?.name || user?.email || "Customer",
        }),
      }),
    ),
  );
};

export const sendAdminLowStockEmail = (product, remainingStock) => {
  const admins = parseAdminEmails();
  if (admins.length === 0) return Promise.resolve();

  const threshold = Number(process.env.LOW_STOCK_THRESHOLD) || 5;

  return Promise.all(
    admins.map(adminEmail =>
      sendEmail({
        to: adminEmail,
        subject: `Low Stock Alert: ${product.title} — Afzal Bikerz Store`,
        html: lowStockTemplate({
          product,
          remainingStock,
          threshold,
        }),
      }),
    ),
  );
};
