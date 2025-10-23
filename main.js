const GAS_ENDPOINT = 'https://script.google.com/macros/s/REPLACE_WITH_DEPLOY_ID/exec';

const form = document.querySelector('#application-form');
const statusEl = document.querySelector('#form-status');

const status = {
  set(message, type = '') {
    statusEl.textContent = message;
    statusEl.classList.remove('status--success', 'status--error');
    if (type) statusEl.classList.add(`status--${type}`);
  },
  clear() {
    statusEl.textContent = '';
    statusEl.classList.remove('status--success', 'status--error');
  }
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.set('送信中です。少しお待ちください…');

  const formData = Object.fromEntries(new FormData(form).entries());
  formData.participants = Number(formData.participants);

  try {
    const res = await fetch(GAS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await res.json();
    if (data.ok) {
      status.set('申請メールを送信しました。文化財課からの返信をお待ちください。', 'success');
      form.reset();
    } else {
      throw new Error(data.error || '送信に失敗しました');
    }
  } catch (error) {
    console.error(error);
    status.set('送信に失敗しました。通信環境を確認して再度お試しください。', 'error');
  }
});
