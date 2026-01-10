/**
 * Google Apps Script endpoint for handling usage application submissions.
 * Expects JSON payload with title, datetime, host, participants, email, phone.
 */
var PROGRAM_VERSION = 'c56adc0';

function authTest() {
  GmailApp.getProfile(); 
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return createResponse(400, { ok: false, error: 'missing_payload' });
  }

  var payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (error) {
    return createResponse(400, { ok: false, error: 'invalid_json', detail: String(error) });
  }

  var required = ['title', 'datetime', 'host', 'participants', 'email', 'phone'];
  var missing = required.filter(function (key) {
    return payload[key] === undefined || payload[key] === null || String(payload[key]).trim() === '';
  });
  if (missing.length > 0) {
    return createResponse(400, { ok: false, error: 'missing_fields', detail: 'missing: ' + missing.join(', '), fields: missing });
  }

  var bodyLines = [
    '夏目漱石内坪井旧居 使用申請を受け付けました。',
    '',
    '以下の内容で申請されています。',
    '---',
    '催事名: ' + payload.title,
    '日時: ' + payload.datetime,
    '主催: ' + payload.host,
    '参加人数: ' + payload.participants,
    'メールアドレス: ' + payload.email,
    '電話番号: ' + payload.phone,
    '',
    '備考: ' + (payload.note || '（なし）'),
    '',
    '---',
    '送信プログラムバージョン: ' + PROGRAM_VERSION
  ];

  var toAddress = (payload.forwardTo || PropertiesService.getScriptProperties().getProperty('FORWARD_TO'));
  if (!toAddress) {
    return createResponse(500, { ok: false, error: 'missing_forward_address', detail: 'Set script property FORWARD_TO' });
  }

  var subject = '夏目漱石内坪井旧居 使用申請';

  try {
    MailApp.sendEmail({
      to: toAddress,
      subject: subject,
      body: bodyLines.join('\n'),
      replyTo: payload.email
    });
  } catch (error) {
    return createResponse(500, { ok: false, error: 'send_email_failed', detail: String(error) });
  }

  return createResponse(200, { ok: true });
}

function createResponse(status, data) {
  var payload = Object.assign({ status: status }, data);
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
