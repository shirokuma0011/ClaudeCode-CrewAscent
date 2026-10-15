<?php
/* questionnaire-mail.php の設定（見本）。
   このファイルを questionnaire-mail.config.php という名前でコピーし、値を書き換えてから
   questionnaire-mail.php と同じフォルダに置きます。PHPとして動くので、URLを開いても中身は表示されません。 */
return [
  'to' => 'info@example.com',             // 回答を届けるアドレス。data/publish-values.json の email と同じにする
  'from' => 'no-reply@example.com',       // 送り元。サイトと同じドメインのアドレス（例: no-reply@crewascent.com）にする
  'allowedOrigins' => ['https://crewascent.com', 'https://www.crewascent.com'],  // 受け付けるページの置き場所
  'rateLimitPerHour' => 5,                // 同じ送り元から1時間に受け付ける回数
];
