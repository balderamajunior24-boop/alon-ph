/* Robust inquiry sender with fallbacks for devices/browsers where `mailto:`
 * does nothing (Windows with no mail app, shared PCs, phones without a default
 * mail client). Instead of blindly firing mailto:, we open a small chooser:
 *
 *   1. Gmail web compose, for Google accounts
 *   2. Outlook web compose, for Outlook, Hotmail, and Live accounts
 *   3. The device's default mail app
 *   4. Copy details, ready to paste elsewhere
 *
 * The composed email is always visible so nothing is lost even if every
 * mail option fails.
 */

const SUBJECT = "ALOK quotation request";

export function buildBody(items) {
  const lines = ["Hi ALOK,", "", "I'd like to request a quotation for the following:", ""];
  items.forEach((it, i) => {
    lines.push(
      `${i + 1}. ${it.productName}${it.variantName ? ": " + it.variantName : ""}`,
      `   Qty: ${it.qty}${it.note ? "\n   Note: " + it.note : ""}`
    );
  });
  lines.push("", "Name: ", "Organization: ", "Contact number: ", "Event / needed by: ", "", "Thank you!");
  return lines.join("\n");
}

function composeUrls(email, subject, body) {
  const s = encodeURIComponent(subject);
  const b = encodeURIComponent(body);
  const to = encodeURIComponent(email);
  return {
    mailto: `mailto:${email}?subject=${s}&body=${b}`,
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${s}&body=${b}`,
    outlook: `https://outlook.office.com/mail/deeplink/compose?to=${to}&subject=${s}&body=${b}`,
  };
}

let modalEl = null;

function ensureModal() {
  if (modalEl) return modalEl;
  const el = document.createElement("div");
  el.className = "send-modal";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", "Send your inquiry");
  el.hidden = true;
  el.innerHTML = `
    <div class="send-modal__backdrop" data-close></div>
    <div class="send-modal__panel">
      <button class="send-modal__x" data-close aria-label="Close">✕</button>
      <h2>Send your inquiry</h2>
      <p class="send-modal__lead">Pick how you'd like to send it. If your device has no email app, use Gmail, Outlook, or just copy the details.</p>
      <div class="send-modal__actions">
        <a class="send-btn send-btn--gmail" data-gmail target="_blank" rel="noopener">Send via Gmail</a>
        <a class="send-btn send-btn--outlook" data-outlook target="_blank" rel="noopener">Send via Outlook</a>
        <a class="send-btn send-btn--mail" data-mailto>Use my email app</a>
        <button class="send-btn send-btn--copy" data-copy type="button">Copy details to clipboard</button>
      </div>
      <p class="send-modal__to">Or email us directly at <a data-email-link></a></p>
      <details class="send-modal__preview">
        <summary>Preview message</summary>
        <textarea data-preview readonly rows="10"></textarea>
      </details>
      <p class="send-modal__status" data-status role="status" aria-live="polite"></p>
    </div>`;
  document.body.appendChild(el);

  el.querySelectorAll("[data-close]").forEach((n) =>
    n.addEventListener("click", () => (el.hidden = true))
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el.hidden) el.hidden = true;
  });
  modalEl = el;
  return el;
}

/**
 * Open the send chooser.
 * @param {string} email  recipient
 * @param {Array}  items  inquiry line items
 */
export function sendInquiry(email, items) {
  if (!items || !items.length) return;
  const body = buildBody(items);
  const urls = composeUrls(email, SUBJECT, body);
  const el = ensureModal();

  el.querySelector("[data-gmail]").href = urls.gmail;
  el.querySelector("[data-outlook]").href = urls.outlook;
  const mailLink = el.querySelector("[data-mailto]");
  mailLink.href = urls.mailto;
  const emailLink = el.querySelector("[data-email-link]");
  emailLink.textContent = email;
  emailLink.href = urls.mailto;
  el.querySelector("[data-preview]").value = `Subject: ${SUBJECT}\n\n${body}`;
  const status = el.querySelector("[data-status]");
  status.textContent = "";

  // Try mailto, then detect whether the page stayed visible.
  mailLink.onclick = (e) => {
    e.preventDefault();
    const before = Date.now();
    // Attempt to open the default handler.
    window.location.href = urls.mailto;
    // If the page is still here and focused shortly after, mailto probably
    // did nothing (no mail app). Nudge the user to another option.
    setTimeout(() => {
      if (!document.hidden && Date.now() - before < 1500) {
        status.textContent =
          "No email app opened? Try Gmail, Outlook, or Copy details above.";
      }
    }, 800);
  };

  // Copy to clipboard with graceful fallback.
  const copyBtn = el.querySelector("[data-copy]");
  copyBtn.onclick = async () => {
    const text = `To: ${email}\nSubject: ${SUBJECT}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = "Copied! Paste it into your email and send to " + email + ".";
    } catch {
      // Fallback: select the preview textarea so they can copy manually.
      const ta = el.querySelector("[data-preview]");
      el.querySelector(".send-modal__preview").open = true;
      ta.focus();
      ta.select();
      status.textContent = "Press Ctrl/Cmd+C to copy the selected text.";
    }
  };

  el.hidden = false;
  el.querySelector("[data-gmail]").focus();
}

/* Site-wide safety net: for ANY plain mailto: link (footer, contact,
 * "Partner With Us", etc.), detect when clicking it does nothing (no mail
 * app) and offer Gmail/copy instead. Call once per page. */
export function installMailtoFallback() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest?.('a[href^="mailto:"]');
    if (!a) return;
    // Parse the mailto to reuse the same chooser.
    const url = new URL(a.href);
    const email = decodeURIComponent(url.pathname);
    const params = url.searchParams;
    const subject = params.get("subject") || "ALOK inquiry";
    const body = params.get("body") || "";
    const before = Date.now();
    // Let the native mailto attempt fire, then check if we're still here.
    setTimeout(() => {
      if (!document.hidden && Date.now() - before < 1500) {
        e.preventDefault?.();
        openSimpleChooser(email, subject, body);
      }
    }, 700);
  });
}

// A lighter chooser for arbitrary mailto links (no inquiry item list).
function openSimpleChooser(email, subject, body) {
  const el = ensureModal();
  const urls = composeUrls(email, subject, body);
  el.querySelector("[data-gmail]").href = urls.gmail;
  el.querySelector("[data-outlook]").href = urls.outlook;
  const mailLink = el.querySelector("[data-mailto]");
  mailLink.href = urls.mailto;
  mailLink.onclick = null; // plain link; user already saw it didn't work
  const emailLink = el.querySelector("[data-email-link]");
  emailLink.textContent = email;
  emailLink.href = urls.mailto;
  el.querySelector("[data-preview]").value = `Subject: ${subject}\n\n${body}`;
  const status = el.querySelector("[data-status]");
  status.textContent = "";
  el.querySelector("[data-copy]").onclick = async () => {
    try {
      await navigator.clipboard.writeText(`To: ${email}\nSubject: ${subject}\n\n${body}`);
      status.textContent = "Copied! Paste into your email to " + email + ".";
    } catch {
      const ta = el.querySelector("[data-preview]");
      el.querySelector(".send-modal__preview").open = true;
      ta.focus(); ta.select();
      status.textContent = "Press Ctrl/Cmd+C to copy.";
    }
  };
  el.hidden = false;
  el.querySelector("[data-gmail]").focus();
}
