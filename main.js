const STORAGE_KEY = 'applicationDraft';

const form = document.querySelector('#application-form');
const statusEl = document.querySelector('#form-status');

function formatDatetimeLocalToJapanese(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(value || '').trim());
  if (!match) return String(value || '').trim();

  const year = match[1];
  const month = String(Number(match[2]));
  const day = String(Number(match[3]));
  const hour = match[4];
  const minute = match[5];
  return `${year}年${month}月${day}日 ${hour}:${minute}`;
}

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

function buildDatetimeRange(startValue, endValue) {
  const start = String(startValue || '').trim();
  const end = String(endValue || '').trim();
  if (!start && !end) return '';
  if (start && !end) return formatDatetimeLocalToJapanese(start);
  if (!start && end) return formatDatetimeLocalToJapanese(end);

  const startDateKey = extractDateKeyFromDatetimeLocal(start);
  const endDateKey = extractDateKeyFromDatetimeLocal(end);

  if (startDateKey && endDateKey && startDateKey === endDateKey) {
    const endTime = extractTimeFromDatetimeLocal(end);
    if (endTime) return `${formatDatetimeLocalToJapanese(start)}〜${endTime}`;
  }

  return `${formatDatetimeLocalToJapanese(start)}〜${formatDatetimeLocalToJapanese(end)}`;
}

if (!form || !statusEl) {
  // フォームが描画されていない場合は何もしない
  console.error('form or status element not found');
} else {
  const status = {
    set(message, type = '') {
      statusEl.textContent = message;
      statusEl.classList.remove('status--success', 'status--error', 'status--info');
      if (type) statusEl.classList.add(`status--${type}`);
    },
    clear() {
      statusEl.textContent = '';
      statusEl.classList.remove('status--success', 'status--error', 'status--info');
    }
  };

  const datetimeStartInput = form.querySelector('input[name="datetimeStart"]');
  const datetimeEndInput = form.querySelector('input[name="datetimeEnd"]');
  const openHoursStatusEl = form.querySelector('#open-hours-status');
  const equipmentCarryInputs = form.querySelectorAll('input[name="equipmentCarry"]');
  const equipmentCarryDetailsEl = form.querySelector('#equipment-carry-details');
  const equipmentCarryDetailsInput = form.querySelector('textarea[name="equipmentCarryDetails"]');

  const updateOpenHoursStatus = () => {
    if (!openHoursStatusEl) return;
    const startValue = datetimeStartInput?.value ?? '';
    const endValue = datetimeEndInput?.value ?? '';
    if (isWithinOpenHours(startValue, endValue)) {
      openHoursStatusEl.textContent = '開館時間中です';
      openHoursStatusEl.classList.add('status--info');
    } else {
      openHoursStatusEl.textContent = '';
      openHoursStatusEl.classList.remove('status--info');
    }
  };

  if (datetimeStartInput) {
    datetimeStartInput.addEventListener('input', updateOpenHoursStatus);
    datetimeStartInput.addEventListener('change', updateOpenHoursStatus);
  }
  if (datetimeEndInput) {
    datetimeEndInput.addEventListener('input', updateOpenHoursStatus);
    datetimeEndInput.addEventListener('change', updateOpenHoursStatus);
  }
  updateOpenHoursStatus();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.clear();

    const emailInput = form.querySelector('input[name="email"]');
    if (emailInput) {
      emailInput.value = String(emailInput.value || '').trim();
      if (!emailInput.checkValidity()) {
        status.set('メールアドレスの形式で入力してください。', 'error');
        emailInput.reportValidity?.();
        return;
      }
    }

    const datetimeStart = form.querySelector('input[name="datetimeStart"]')?.value ?? '';
    const datetimeEnd = form.querySelector('input[name="datetimeEnd"]')?.value ?? '';
    const equipmentCarry = form.querySelector('input[name="equipmentCarry"]:checked')?.value ?? '';

    if (equipmentCarry === '持ち込みあり' && equipmentCarryDetailsInput && !String(equipmentCarryDetailsInput.value || '').trim()) {
      status.set('備品の持ち込み内容を入力してください。', 'error');
      equipmentCarryDetailsInput.reportValidity?.();
      return;
    }

    if (!String(datetimeStart).trim() || !String(datetimeEnd).trim()) {
      status.set('開催日時（開始・終了）を入力してください。', 'error');
      return;
    }

    if (datetimeStart && datetimeEnd && datetimeEnd < datetimeStart) {
      status.set('終了日時は開始日時より後にしてください。', 'error');
      return;
    }

    const datetime = buildDatetimeRange(datetimeStart, datetimeEnd);
    const datetimeHidden = form.querySelector('input[name="datetime"]');
    if (datetimeHidden) datetimeHidden.value = datetime;

    status.set('確認ページへ移動します…');

    const formData = Object.fromEntries(new FormData(form).entries());
    formData.datetime = datetime || String(formData.datetime || '').trim();
    formData.participants = Number(formData.participants);

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      window.location.assign('./application-method.html');
    } catch (error) {
      console.error(error);
      status.set('切り替えに失敗しました。ページを再読み込みして再度お試しください。', 'error');
    }
  });
}

const CALENDAR_EVENTS = {
  '01-10': {
    title: '句会',
    description: '参加者募集中'
  }
};
const calendarSection = document.querySelector('#availability-calendar');

if (calendarSection) {
  const monthLabel = calendarSection.querySelector('#calendar-month');
  const gridEl = calendarSection.querySelector('#calendar-grid');
  const selectedDateEl = calendarSection.querySelector('#calendar-selected-date');
  const eventPanel = calendarSection.querySelector('#calendar-event');
  const eventTitleEl = calendarSection.querySelector('#calendar-event-title');
  const eventDescEl = calendarSection.querySelector('#calendar-event-desc');
  const navButtons = calendarSection.querySelectorAll('.calendar__nav');

  if (
    !monthLabel ||
    !gridEl ||
    !selectedDateEl ||
    !eventPanel ||
    !eventTitleEl ||
    !eventDescEl
  ) {
    console.error('calendar elements not found');
  } else {
    const today = new Date();
    let currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    let selectedDateKey = formatDateKeyFromDate(today);

    function formatDateKeyFromDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function formatMonthLabel(date) {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      return `${year}年${month}月`;
    }

    function formatDateLabel(dateKey) {
      const parsed = parseDateKey(dateKey);
      if (!parsed) return '';
      return `${parsed.year}年${parsed.month}月${parsed.day}日`;
    }

    function getCalendarEvent(dateKey) {
      if (!dateKey) return null;
      if (CALENDAR_EVENTS[dateKey]) return CALENDAR_EVENTS[dateKey];
      const parsed = parseDateKey(dateKey);
      if (!parsed) return null;
      const monthDay = `${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(
        2,
        '0'
      )}`;
      return CALENDAR_EVENTS[monthDay] || null;
    }

    function updateSelectedDateInfo() {
      selectedDateEl.textContent = formatDateLabel(selectedDateKey);
      const eventData = getCalendarEvent(selectedDateKey);
      if (eventData) {
        eventTitleEl.textContent = eventData.title;
        eventDescEl.textContent = eventData.description;
        eventPanel.hidden = false;
      } else {
        eventTitleEl.textContent = '';
        eventDescEl.textContent = '';
        eventPanel.hidden = true;
      }
    }

    function renderCalendar() {
      const year = currentMonth.getFullYear();
      const monthIndex = currentMonth.getMonth();
      const firstDay = new Date(year, monthIndex, 1);
      const lastDay = new Date(year, monthIndex + 1, 0);
      const startOffset = firstDay.getDay();
      const totalDays = lastDay.getDate();
      const todayKey = formatDateKeyFromDate(today);

      monthLabel.textContent = formatMonthLabel(currentMonth);
      gridEl.innerHTML = '';

      for (let i = 0; i < startOffset; i += 1) {
        const placeholder = document.createElement('div');
        placeholder.className = 'calendar__day calendar__day--outside';
        placeholder.setAttribute('aria-hidden', 'true');
        gridEl.appendChild(placeholder);
      }

      for (let day = 1; day <= totalDays; day += 1) {
        const date = new Date(year, monthIndex, day);
        const dateKey = formatDateKeyFromDate(date);
        const eventData = getCalendarEvent(dateKey);
        const eventTitle = eventData?.title || '';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'calendar__day';
        button.dataset.date = dateKey;
        button.setAttribute('aria-pressed', dateKey === selectedDateKey ? 'true' : 'false');
        button.setAttribute(
          'aria-label',
          eventTitle
            ? `${year}年${monthIndex + 1}月${day}日：${eventTitle}`
            : `${year}年${monthIndex + 1}月${day}日`
        );

        if (dateKey === selectedDateKey) button.classList.add('calendar__day--selected');
        if (dateKey === todayKey) button.classList.add('calendar__day--today');
        if (eventTitle) button.classList.add('calendar__day--filled');

        const dayNumber = document.createElement('span');
        dayNumber.className = 'calendar__day-number';
        dayNumber.textContent = String(day);

        button.append(dayNumber);
        if (eventTitle) {
          const noteEl = document.createElement('span');
          noteEl.className = 'calendar__day-note';
          noteEl.textContent = eventTitle;
          button.append(noteEl);
        }
        button.addEventListener('click', () => {
          selectedDateKey = dateKey;
          updateSelectedDateInfo();
          renderCalendar();
        });

        gridEl.appendChild(button);
      }

      const totalCells = startOffset + totalDays;
      const remainder = totalCells % 7;
      const trailing = remainder === 0 ? 0 : 7 - remainder;

      for (let i = 0; i < trailing; i += 1) {
        const placeholder = document.createElement('div');
        placeholder.className = 'calendar__day calendar__day--outside';
        placeholder.setAttribute('aria-hidden', 'true');
        gridEl.appendChild(placeholder);
      }
    }

    navButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const offset = Number(button.dataset.month || 0);
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
        selectedDateKey = formatDateKeyFromDate(currentMonth);
        updateSelectedDateInfo();
        renderCalendar();
      });
    });
    updateSelectedDateInfo();
    renderCalendar();
  }
}

document.querySelectorAll('[data-slider]').forEach((slider) => {
  const track = slider.querySelector('.photo-slider__track');
  const prevButton = slider.querySelector('.photo-slider__nav--prev');
  const nextButton = slider.querySelector('.photo-slider__nav--next');

  if (!track) return;

  const scrollByAmount = (direction) => {
    const amount = Math.max(track.clientWidth * 0.85, 280);
    track.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  prevButton?.addEventListener('click', () => scrollByAmount(-1));
  nextButton?.addEventListener('click', () => scrollByAmount(1));
});
