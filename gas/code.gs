/**
 * アポっと！ 施工パートナー紹介LP ─ 問い合わせ受付
 *
 * LPのフォームから送られたJSONをスプレッドシートに1行追記し、
 * 社内へ通知メールを送る。必要なら送信者へ自動返信も出す。
 *
 * 使い方は同じフォルダの README.md を参照。
 */

// ---- 設定 ------------------------------------------------------------

/** 記録先スプレッドシートのID。空にするとコンテナ（このGASを紐づけたシート）を使う */
var SPREADSHEET_ID = '1pnmKkg_sIqzE4i4HU8JNhlIjPWwWflarhBnOS4yke6M';

/** 記録先のシート名。なければ自動で作る */
var SHEET_NAME = 'EPC問い合わせ';

/** 社内への通知先。カンマ区切りで複数可 */
var NOTIFY_TO = 'marketing@kunoshoji.com,yhibi@kunoshoji.com';

/** 送信者への自動返信を出すか */
var SEND_AUTO_REPLY = true;

/** 自動返信の差出人名 */
var REPLY_FROM_NAME = 'アポっと！事務局（久野商事株式会社）';

/** 社内の連絡先（自動返信の本文に入る） */
var CONTACT_TEL = '052-228-2650';
var CONTACT_MAIL = 'marketing@kunoshoji.com';

// ---- 列の定義 --------------------------------------------------------

var COLUMNS = [
  ['receivedAt', '受付日時'],
  ['company', '会社名'],
  ['name', 'お名前'],
  ['dept', '部署・役職'],
  ['email', 'メール'],
  ['tel', '電話'],
  ['pref', '所在地'],
  ['work', '依頼したい工事'],
  ['area', '施工エリア'],
  ['timing', '希望時期'],
  ['freq', '依頼の頻度'],
  ['purpose', 'ご相談の内容'],
  ['detail', '案件の概要'],
  ['status', '対応状況'],
  ['owner', '担当'],
  ['memo', '社内メモ'],
  ['pageUrl', '送信元URL'],
  ['referrer', '流入元']
];

// ---- エンドポイント --------------------------------------------------

function doGet() {
  return json({ ok: true, service: 'apotto-epc-contact' });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'empty_body' });
    }

    var data = JSON.parse(e.postData.contents);

    var missing = ['company', 'name', 'email', 'tel'].filter(function (key) {
      return !String(data[key] || '').trim();
    });
    if (missing.length) {
      return json({ ok: false, error: 'missing:' + missing.join(',') });
    }

    var receivedAt = new Date();
    appendRow(data, receivedAt);
    notify(data, receivedAt);

    if (SEND_AUTO_REPLY) {
      autoReply(data);
    }

    return json({ ok: true });

  } catch (err) {
    // 失敗しても問い合わせを取りこぼさないよう、ログと通知は残す
    console.error(err);
    try {
      MailApp.sendEmail(NOTIFY_TO, '【要確認】LP問い合わせの記録に失敗しました',
        'エラー: ' + err + '\n\n受信内容:\n' +
        (e && e.postData ? e.postData.contents : '(なし)'));
    } catch (ignore) {}
    return json({ ok: false, error: String(err) });
  }
}

// ---- 記録 ------------------------------------------------------------

function appendRow(data, receivedAt) {
  var sheet = getSheet();
  var values = COLUMNS.map(function (col) {
    var key = col[0];
    if (key === 'receivedAt') return receivedAt;
    if (key === 'status') return '未対応';
    if (key === 'owner' || key === 'memo') return '';
    return String(data[key] || '');
  });
  sheet.appendRow(values);
}

function getSheet() {
  var book = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!book) {
    throw new Error('スプレッドシートが見つかりません。SPREADSHEET_IDを設定してください。');
  }

  var sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    var headers = COLUMNS.map(function (col) { return col[1]; });
    sheet.appendRow(headers);
    var head = sheet.getRange(1, 1, 1, headers.length);
    head.setFontWeight('bold').setBackground('#1e6fd9').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 150);   // 受付日時
    sheet.setColumnWidth(2, 220);   // 会社名
    sheet.setColumnWidth(13, 360);  // 案件の概要
  }

  return sheet;
}

// ---- 通知 ------------------------------------------------------------

function notify(data, receivedAt) {
  var subject = '【LP問い合わせ】' + (data.company || '(会社名なし)') +
    '／' + (data.area || 'エリア未記入');

  var lines = [
    '施工パートナー紹介LPから問い合わせが入りました。',
    '',
    '受付日時　　　' + Utilities.formatDate(receivedAt, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
    '会社名　　　　' + (data.company || ''),
    'お名前　　　　' + (data.name || '') + '（' + (data.dept || '部署未記入') + '）',
    'メール　　　　' + (data.email || ''),
    '電話　　　　　' + (data.tel || ''),
    '所在地　　　　' + (data.pref || ''),
    '',
    '依頼したい工事　' + (data.work || ''),
    '施工エリア　　　' + (data.area || ''),
    '希望時期　　　　' + (data.timing || '未記入'),
    '依頼の頻度　　　' + (data.freq || '未記入'),
    'ご相談の内容　　' + (data.purpose || '未記入'),
    '',
    '案件の概要',
    (data.detail || '(記入なし)'),
    '',
    '---',
    '送信元　' + (data.pageUrl || ''),
    '流入元　' + (data.referrer || '(直接アクセス)')
  ];

  MailApp.sendEmail({
    to: NOTIFY_TO,
    subject: subject,
    body: lines.join('\n'),
    replyTo: data.email || undefined,
    name: 'アポっと！LP'
  });
}

function autoReply(data) {
  if (!data.email) return;

  var body = [
    (data.company || '') + '　' + (data.name || '') + ' 様',
    '',
    'お問い合わせありがとうございます。久野商事株式会社「アポっと！」事務局です。',
    '下記の内容で承りました。担当者より原則1営業日以内にご連絡いたします。',
    '',
    '──────────────────',
    '依頼したい工事　' + (data.work || ''),
    '施工エリア　　　' + (data.area || ''),
    '希望時期　　　　' + (data.timing || '未記入'),
    '依頼の頻度　　　' + (data.freq || '未記入'),
    '',
    '案件の概要',
    (data.detail || '(記入なし)'),
    '──────────────────',
    '',
    'ご紹介・ヒアリング・お引き合わせまで費用はかかりません。',
    '紹介手数料・成約手数料もいただいておりません。',
    '',
    'このメールは自動送信です。お急ぎの場合はお電話ください。',
    '',
    '久野商事株式会社　マーケティング部',
    'TEL ' + CONTACT_TEL + '（平日 9:00–18:00）',
    'MAIL ' + CONTACT_MAIL
  ].join('\n');

  MailApp.sendEmail({
    to: data.email,
    subject: '【アポっと！】お問い合わせを受け付けました',
    body: body,
    name: REPLY_FROM_NAME,
    replyTo: CONTACT_MAIL
  });
}

// ---- 共通 ------------------------------------------------------------

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 動作確認用。エディタでこの関数を実行すると、テスト行が1件入り
 * 通知メールが飛ぶ（自動返信の宛先はNOTIFY_TOになる）。
 */
function testPost() {
  var result = doPost({
    postData: {
      contents: JSON.stringify({
        company: 'テスト建設株式会社',
        name: 'テスト 太郎',
        dept: '工事部',
        email: NOTIFY_TO,
        tel: '052-228-2650',
        pref: '愛知県',
        work: 'フェンス設置、防草シート敷設',
        area: '中部・北陸',
        timing: '1〜3ヶ月以内',
        freq: '継続的に依頼したい',
        purpose: '施工会社の紹介を希望',
        detail: 'これは動作確認用のテスト送信です。',
        pageUrl: 'test',
        referrer: 'test'
      })
    }
  });
  console.log(result.getContent());
}


/**
 * スプレッドシートのタイムゾーンを日本時間にする。
 * 受付日時が米国時間で表示されるのを直すため、1回だけ実行すればよい。
 * （2026-09-10に実行済み）
 */
function setupTimeZone() {
  var book = SpreadsheetApp.openById(SPREADSHEET_ID);
  book.setSpreadsheetTimeZone('Asia/Tokyo');
  console.log('タイムゾーン: ' + book.getSpreadsheetTimeZone());
}
