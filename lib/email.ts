const ZEPTO_API_URL = "https://api.zeptomail.com/v1.1/email";

function getZeptoToken(): string {
  const rawToken = process.env.ZEPTOMAIL_SEND_TOKEN || "";
  let token = rawToken.trim();
  if (!token.startsWith("Zoho-enczapikey ") && !token.startsWith("Zoho-enczapikey")) {
    token = `Zoho-enczapikey ${token}`;
  } else if (token.startsWith("Zoho-enczapikey") && !token.startsWith("Zoho-enczapikey ")) {
    token = token.replace("Zoho-enczapikey", "Zoho-enczapikey ");
  }
  return token;
}

export async function sendAdminOtpEmail(toEmail: string, code: string): Promise<void> {
  const token = getZeptoToken();
  const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL || "support@userecover.xyz";
  const fromName = process.env.ZEPTOMAIL_FROM_NAME || "Resit Mission Control";

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Resit Mission Control Access Code</title>
</head>
<body style="margin: 0; padding: 40px 20px; background-color: #090D16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #0F172A; border: 1px solid #1E293B; border-radius: 12px; padding: 32px;">
    <tr>
      <td style="padding-bottom: 24px; border-bottom: 1px solid #1E293B;">
        <h1 style="margin: 0; font-size: 18px; font-weight: 600; color: #FFFFFF; letter-spacing: -0.02em;">
          Resit Mission Control
        </h1>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #94A3B8;">
          Internal Platform Security Passcode
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 28px 0 20px 0;">
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #CBD5E1; line-height: 1.5;">
          Use the 6-digit passcode below to authenticate your administrative session:
        </p>
        <div style="background-color: #090D16; border: 1px solid #2563EB; border-radius: 8px; padding: 18px; text-align: center; letter-spacing: 8px; font-size: 28px; font-weight: 700; font-family: monospace; color: #FFFFFF;">
          ${code}
        </div>
        <p style="margin: 20px 0 0 0; font-size: 12px; color: #94A3B8; line-height: 1.5;">
          This security code expires in <strong>10 minutes</strong>. If you did not initiate this authentication request, please inspect server audit logs immediately.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding-top: 24px; border-top: 1px solid #1E293B; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #64748B;">
          Resit Infrastructure &bull; Electroneum Production Network
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const response = await fetch(ZEPTO_API_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({
      from: { address: fromEmail, name: fromName },
      to: [{ email_address: { address: toEmail, name: "Admin" } }],
      subject: `Resit Admin Passcode: ${code}`,
      htmlbody: htmlBody,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ZeptoMail failed with status ${response.status}: ${errorText}`);
  }
}
