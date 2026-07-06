async function sendPasswordResetEmail(to, resetUrl) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY 未設定');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'onboarding@resend.dev',
      to,
      subject: '重設你的記帳本密碼',
      html: `
        <p>你收到這封信是因為有人（應該是你）在記帳本網站上要求重設密碼。</p>
        <p><a href="${resetUrl}">點此重設密碼</a>（連結 30 分鐘內有效）</p>
        <p>如果不是你本人操作，請忽略這封信，密碼不會被更動。</p>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error('寄信失敗: ' + body);
  }
}

module.exports = { sendPasswordResetEmail };
