# アポっと！ 施工パートナー紹介LP

久野商事株式会社が運営する「アポっと！」の、EPC事業者さま向け施工パートナー紹介サービスのランディングページです。

- `index.html` … LP本体（問い合わせフォームを含む）
- `thanks.html` … 送信完了ページ
- `contact.html` … 旧URL用の転送ページ
- `assets/` … スタイル・スクリプト・画像
- `gas/code.gs` … 問い合わせを受け取る Google Apps Script

## 問い合わせフォームの接続先

`assets/config.js` の `gasEndpoint` に Apps Script ウェブアプリのURLを設定します。
未設定のあいだは送信ボタンを止め、電話・メールでの連絡を案内します。

## 写真について

本文の写真は Unsplash（商用利用可・クレジット表記不要）のものです。
自社の施工現場写真に差し替える場合は `assets/img/` の同名ファイルを上書きしてください。

(c) KUNO SHOJI CO., LTD.
