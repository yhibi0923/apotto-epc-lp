/* =========================================================================
   アポっと！ 施工パートナー紹介 LP
   問い合わせフォーム（URLパラメータの反映・入力チェック・GASへ送信）
   ========================================================================= */
(function () {
  'use strict';

  var CONFIG = window.APOTTO_CONFIG || {};
  var THANKS_URL = CONFIG.thanksUrl || 'thanks.html';

  /* ---------------------------------------------------------------------
     問い合わせフォーム
     --------------------------------------------------------------------- */
  function initForm() {
    var form = document.getElementById('contact-form');
    if (!form) return;

    var statusEl = document.getElementById('form-status');
    var submitBtn = document.getElementById('submit-btn');
    var endpoint = (CONFIG.gasEndpoint || '').trim();

    prefillFromQuery(form);

    if (!endpoint) {
      submitBtn.disabled = true;
      setStatus('現在フォームからの送信を受け付けられません。お手数ですが ' +
        (CONFIG.fallbackTel || '') + ' またはメールでご連絡ください。', 'is-error');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submitBtn.disabled) return;

      clearErrors(form);
      var errors = validate(form);

      if (errors.length) {
        errors.forEach(function (err) { showError(form, err.field, err.message); });
        setStatus('未入力の項目があります。赤字の箇所をご確認ください。', 'is-error');
        focusField(form, errors[0].field);
        return;
      }

      // 自動投稿よけ。人には見えない項目が埋まっていたら送信しない
      if (form.elements.website && form.elements.website.value) {
        window.location.href = THANKS_URL;
        return;
      }

      send(collect(form));
    });

    function send(payload) {
      submitBtn.disabled = true;
      setStatus('送信しています…', 'is-busy');

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      })
        .then(function (res) { return res.json(); })
        .then(function (json) {
          if (json && json.ok) {
            window.location.href = THANKS_URL;
          } else {
            throw new Error((json && json.error) || 'unknown');
          }
        })
        .catch(function () {
          // レスポンスが読めないだけの可能性があるので、no-corsで一度だけ送り直す
          return fetch(endpoint, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
          }).then(function () {
            window.location.href = THANKS_URL;
          }).catch(function () {
            submitBtn.disabled = false;
            setStatus('送信できませんでした。通信状況をご確認のうえもう一度お試しいただくか、' +
              (CONFIG.fallbackTel || '') + '（平日9:00–18:00）または ' +
              (CONFIG.fallbackMail || '') + ' までご連絡ください。', 'is-error');
          });
        });
    }

    function setStatus(message, cls) {
      statusEl.textContent = message;
      statusEl.className = 'form-status' + (cls ? ' ' + cls : '');
    }
  }

  /* ---- URLパラメータをフォームに反映する ---- */
  function prefillFromQuery(form) {
    var q = new URLSearchParams(window.location.search);
    if (!q.toString()) return;

    checkBoxes(form, 'work', q.get('work'));
    checkBoxes(form, 'area', q.get('area'));
    setSelect(form.elements.timing, q.get('timing'));
    setSelect(form.elements.freq, q.get('freq'));
  }

  function checkBoxes(form, name, csv) {
    if (!csv) return;
    var wanted = csv.split(',').map(function (s) { return s.trim(); });
    form.querySelectorAll('input[name="' + name + '"]').forEach(function (input) {
      if (wanted.indexOf(input.value) !== -1) input.checked = true;
    });
  }

  function setSelect(select, value) {
    if (!select || !value) return;
    var found = Array.prototype.slice.call(select.options).some(function (opt) {
      return opt.value === value || opt.textContent === value;
    });
    if (found) select.value = value;
  }

  /* ---- 入力チェック ---- */
  function validate(form) {
    var e = form.elements;
    var errors = [];

    if (!val(e.company)) errors.push({ field: 'company', message: '会社名をご記入ください。' });
    if (!val(e.name)) errors.push({ field: 'name', message: 'お名前をご記入ください。' });

    var email = val(e.email);
    if (!email) {
      errors.push({ field: 'email', message: 'メールアドレスをご記入ください。' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: 'email', message: 'メールアドレスの形式をご確認ください。' });
    }

    var tel = val(e.tel);
    if (!tel) {
      errors.push({ field: 'tel', message: '電話番号をご記入ください。' });
    } else if ((tel.replace(/[^0-9]/g, '')).length < 10) {
      errors.push({ field: 'tel', message: '市外局番からご記入ください。' });
    }

    if (!val(e.pref)) errors.push({ field: 'pref', message: '所在地をお選びください。' });

    if (!checkedValues(form, 'work').length) {
      errors.push({ field: 'work', message: '依頼したい工事を1つ以上お選びください。' });
    }
    if (!checkedValues(form, 'area').length) {
      errors.push({ field: 'area', message: '施工エリアを1つ以上お選びください。' });
    }
    if (!e.consent.checked) {
      errors.push({ field: 'consent', message: '情報の取り扱いについてご同意ください。' });
    }

    return errors;
  }

  function val(el) { return el && el.value ? el.value.trim() : ''; }

  function checkedValues(form, name) {
    return Array.prototype.slice
      .call(form.querySelectorAll('input[name="' + name + '"]:checked'))
      .map(function (i) { return i.value; });
  }

  function clearErrors(form) {
    form.querySelectorAll('.field-error').forEach(function (p) {
      p.hidden = true;
      p.textContent = '';
    });
    form.querySelectorAll('.field.has-error').forEach(function (f) {
      f.classList.remove('has-error');
    });
  }

  function showError(form, field, message) {
    var p = form.querySelector('[data-error-for="' + field + '"]');
    if (!p) return;
    p.textContent = message;
    p.hidden = false;
    var wrapper = p.closest('.field');
    if (wrapper) wrapper.classList.add('has-error');
  }

  function focusField(form, field) {
    var target = form.querySelector('#' + field) ||
      form.querySelector('[name="' + field + '"]');
    if (!target) return;
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  /* ---- 送信データを組み立てる ---- */
  function collect(form) {
    var e = form.elements;
    var purpose = form.querySelector('input[name="purpose"]:checked');

    return {
      company: val(e.company),
      name: val(e.name),
      dept: val(e.dept),
      email: val(e.email),
      tel: val(e.tel),
      pref: val(e.pref),
      work: checkedValues(form, 'work').join('、'),
      area: checkedValues(form, 'area').join('、'),
      timing: val(e.timing),
      freq: val(e.freq),
      purpose: purpose ? purpose.value : '',
      detail: val(e.detail),
      pageUrl: window.location.href,
      referrer: document.referrer || ''
    };
  }

  /* --------------------------------------------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForm);
  } else {
    initForm();
  }
})();
