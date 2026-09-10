/* =========================================================================
   設定ファイル
   ここだけ書き換えれば動きます。ほかのファイルは触らなくて大丈夫です。
   ========================================================================= */

window.APOTTO_CONFIG = {

  /* GASのウェブアプリURL。
     gas/code.gs をデプロイして発行された
     https://script.google.com/macros/s/xxxxxxxx/exec
     を、下のシングルクォートの中に貼り付けてください。
     空のままだと、フォームは送信ボタンを止めて電話・メールをご案内します。 */
  gasEndpoint: 'https://script.google.com/macros/s/AKfycbyJhwPQURRr2eDDxgwUSJO5v2U7aY5jytn64PpRLd5fJFgX0quIVjvhZijq3aMHY6jLzg/exec',

  /* 送信完了後に表示するページ */
  thanksUrl: 'thanks.html',

  /* 送信に失敗したときに案内する連絡先 */
  fallbackTel: '052-228-2650',
  fallbackMail: 'marketing@kunoshoji.com'
};
