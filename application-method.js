const STORAGE_KEY = 'applicationDraft';
const RECIPIENT_EMAIL = 'soseki.utitsuboi@gmail.com';
// Google Apps Script のデプロイURL
const GAS_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbwzMzh-FZMHDiuEjylpceRCS5b_ggyyTy4UPxwyoUGvJb-TGTiIg_oh6Vy-leaoMXoOZg/exec';
const FLOOR_PLAN_PATH = './assets/新・間取り図.png';
const FLOOR_PLAN_FILENAME = '新・間取り図.png';
const FLOOR_PLAN_SHARE_URL =
  'https://drive.google.com/file/d/1Hc0KB0sbp53dpiQvoFU4w5-aF5n3jBrn/view?usp=sharing';

const draftEl = document.querySelector('#application-draft');
const copyButton = document.querySelector('#copy-draft');
const openMailerButton = document.querySelector('#open-mailer');
const sendMailButton = document.querySelector('#send-mail');
const statusEl = document.querySelector('#copy-status');
const openHoursConfirmEl = document.querySelector('#open-hours-confirm');

const status = {
  set(message, type = '') {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.remove('status--success', 'status--error');
    if (type) statusEl.classList.add(`status--${type}`);
  },
  clear() {
    if (!statusEl) return;
    statusEl.textContent = '';
    statusEl.classList.remove('status--success', 'status--error');
  }
};

function extractDateKeyFromDatetimeLocal(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T/.exec(String(value || '').trim());
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function extractTimeFromDatetimeLocal(value) {
  const match = /T(\d{2}):(\d{2})/.exec(String(value || '').trim());
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

function parseDateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
}

function timeStringToMinutes(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isWithinOpenHours(startValue, endValue) {
  const startDateKey = extractDateKeyFromDatetimeLocal(startValue);
  const endDateKey = extractDateKeyFromDatetimeLocal(endValue);
  if (!startDateKey || !endDateKey || startDateKey !== endDateKey) return false;

  const dateParts = parseDateKey(startDateKey);
  if (!dateParts) return false;

  const date = new Date(dateParts.year, dateParts.month - 1, dateParts.day);
  if (Number.isNaN(date.getTime()) || date.getDay() === 1) return false;

  const startTime = extractTimeFromDatetimeLocal(startValue);
  const endTime = extractTimeFromDatetimeLocal(endValue);
  if (!startTime || !endTime) return false;

  const startMinutes = timeStringToMinutes(startTime);
  const endMinutes = timeStringToMinutes(endTime);
  if (startMinutes === null || endMinutes === null) return false;
  if (endMinutes < startMinutes) return false;

  return startMinutes >= 9 * 60 && endMinutes <= 16 * 60 + 30;
}

function updateOpenHoursConfirm(data) {
  if (!openHoursConfirmEl) return;
  const startValue = data?.datetimeStart ?? '';
  const endValue = data?.datetimeEnd ?? '';
  if (isWithinOpenHours(startValue, endValue)) {
    openHoursConfirmEl.textContent = '開館時間中の相談内容です。よろしいですか？';
    openHoursConfirmEl.hidden = false;
  } else {
    openHoursConfirmEl.textContent = '';
    openHoursConfirmEl.hidden = true;
  }
}

function getDraftData() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getFloorPlanUrl() {
  try {
    return new URL(FLOOR_PLAN_PATH, window.location.href).toString();
  } catch {
    return FLOOR_PLAN_PATH;
  }
}

function formatDraft(data) {
  const title = String(data.title || '').trim();
  const purpose = String(data.purpose || '').trim();
  const datetime = String(data.datetime || '').trim();
  const room = String(data.room || '').trim();
  const paidBusiness = String(data.paidBusiness || '').trim();
  const equipmentCarry = String(data.equipmentCarry || '').trim();
  const equipmentCarryDetails = String(data.equipmentCarryDetails || '').trim();
  const agreeConsideration = String(data.agreeConsideration || '').trim();
  const agreeAdmissionFee = String(data.agreeAdmissionFee || '').trim();
  const host = String(data.host || '').trim();
  const participants = data.participants === 0 ? '0' : String(data.participants || '').trim();
  const email = String(data.email || '').trim();
  const phone = String(data.phone || '').trim();
  const note = String(data.note || '').trim();

  const subjectTitle = title ? title : '（催事名未入力）';
  const subject = `【夏目漱石内坪井旧居 利用相談】${subjectTitle}`;

  const bodyLines = [
    '熊本市文化財課 ご担当者様',
    '',
    '内坪井旧居の利用について、下記の内容で相談いたします。',
    '',
    `【催事名】${title || '（未入力）'}`,
    `【催事の主旨及び使用目的】${purpose || '（未入力）'}`,
    `【開催日時】${datetime || '（未入力）'}`,
    `【利用する部屋】${room || '（未入力）'}`,
    `【有料事業か否か】${paidBusiness || '（未入力）'}`,
    `【備品の持ち込みはあるか】${equipmentCarry || '（未入力）'}`,
    `【備品の持ち込み内容】${equipmentCarry === '持ち込みあり' ? equipmentCarryDetails || '（未入力）' : '（持ち込みなしのため記載なし）'}`,
    `【相談者名】${host || '（未入力）'}`,
    `【参加人数（目安）】${participants || '（未入力）'}`,
    `【返信用メールアドレス】${email || '（未入力）'}`,
    `【返信用電話番号】${phone || '（未入力）'}`,
    `【一般観覧者へ配慮をする旨に同意する】${agreeConsideration || '未同意'}`,
    `【開館時間内では入館料が必要である旨に同意する】${agreeAdmissionFee || '未同意'}`,
    `【備考】${note || '（なし）'}`,
    `【添付】${FLOOR_PLAN_SHARE_URL}`,
    '',
    '以上、よろしくお願いいたします。'
  ];

  const body = bodyLines.join('\n');
  return { subject, body, fullText: `件名: ${subject}\n\n${body}` };
}

async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (!draftEl) throw new Error('draft element not found');
  draftEl.focus();
  draftEl.select();
  const ok = document.execCommand('copy');
  window.getSelection?.().removeAllRanges?.();
  if (!ok) throw new Error('copy failed');
}

function buildMailtoUrl({ subject, body }) {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `mailto:${RECIPIENT_EMAIL}?subject=${encodedSubject}&body=${encodedBody}`;
}

const data = getDraftData();
if (!draftEl || !copyButton || !openMailerButton || !sendMailButton) {
  status.set('表示に失敗しました。ページを再読み込みしてください。', 'error');
} else if (!data) {
  draftEl.value =
    'フォーム入力内容が見つかりませんでした。\n\n「フォームに戻る」から入力し直して、もう一度「相談方法を確認する」を押してください。';
  copyButton.disabled = true;
  openMailerButton.disabled = true;
  sendMailButton.disabled = true;
} else {
  const draft = formatDraft(data);
  draftEl.value = draft.fullText;
  status.clear();
  updateOpenHoursConfirm(data);

  openMailerButton.addEventListener('click', () => {
    status.clear();
    try {
      window.location.assign(buildMailtoUrl(draft));
    } catch (error) {
      console.error(error);
      status.set('メーラーの起動に失敗しました。本文をコピーして手動で貼り付けてください。', 'error');
    }
  });

  sendMailButton.addEventListener('click', async () => {
    status.clear();
    sendMailButton.disabled = true;
    status.set('送信中です。少しお待ちください…');

    try {
      const payload = {
        ...data,
        floorPlanUrl: getFloorPlanUrl(),
        floorPlanFilename: FLOOR_PLAN_FILENAME
      };
      const res = await fetch(GAS_ENDPOINT, {
        method: 'POST',
        // application/json を指定するとプリフライトが走るため付けない
        body: JSON.stringify(payload)
      });

      const rawText = await res.text();
      let response;
      try {
        response = JSON.parse(rawText);
      } catch {
        throw new Error(`invalid_json_response (status=${res.status}) ${rawText.slice(0, 300)}`);
      }

      if (response.ok) {
        status.set('相談メールを送信しました。文化財課からの返信をお待ちください。', 'success');
        sessionStorage.removeItem(STORAGE_KEY);
      } else {
        const code = response.error || 'unknown_error';
        const detail = response.detail ? ` / ${response.detail}` : '';
        throw new Error(`send_failed (status=${res.status}) ${code}${detail}`);
      }
    } catch (error) {
      console.error(error);
      sendMailButton.disabled = false;
      status.set(
        `送信に失敗しました。もう一度お試しください。\n原因: ${String(error && error.message ? error.message : error)}`,
        'error'
      );
    }
  });

  copyButton.addEventListener('click', async () => {
    status.clear();
    try {
      await copyToClipboard(draftEl.value);
      status.set('コピーしました。メールに貼り付けて送信してください。', 'success');
    } catch (error) {
      console.error(error);
      status.set('コピーに失敗しました。本文を手動で選択してコピーしてください。', 'error');
    }
  });
}
