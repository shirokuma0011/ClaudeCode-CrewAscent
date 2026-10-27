<?php
/* =====================================================================
   クルーアセント 相談アンケートの受け口（任意）  questionnaire-mail.php  v2026-10-25

   site/consult-form.html（はじめての方ヒアリング）と site/hearing-form.html（本格ヒアリング）の回答を、
   決めたメールアドレスへ1通送るだけ。受付番号（CA-月日-4桁）は画面側で作り、件名と本文に入る。
   ・保存しない（サーバーにもデータベースにも残さない）
   ・自動返信しない（他人のアドレスを入れて迷惑メールを送らせる悪用を防ぐ）
   ・置き場所と設定は server/README.md
   使わない場合は置かなくてよい。置かなければ、アンケートは「メールアプリで送る」になる。
   ===================================================================== */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function reply(int $code, array $body): void {
  http_response_code($code);
  echo json_encode($body, JSON_UNESCAPED_UNICODE);
  exit;
}
/* 改行と制御文字を落とす（件名・ヘッダー用） */
function one_line(string $s, int $max): string {
  $s = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $s) ?? '';
  return mb_substr(trim($s), 0, $max);
}
/* 改行とタブ以外の制御文字を落とす（本文用） */
function body_text(string $s, int $max): string {
  $s = str_replace(["\r\n", "\r"], "\n", $s);
  $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/u', '', $s) ?? '';
  return mb_substr($s, 0, $max);
}

$configFile = __DIR__ . '/questionnaire-mail.config.php';
if (!is_file($configFile)) reply(500, ['ok' => false, 'error' => 'not_configured']);
$config = require $configFile;
$to = (string)($config['to'] ?? '');
$from = (string)($config['from'] ?? '');
if (!filter_var($to, FILTER_VALIDATE_EMAIL) || !filter_var($from, FILTER_VALIDATE_EMAIL)) reply(500, ['ok' => false, 'error' => 'not_configured']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') reply(405, ['ok' => false, 'error' => 'method']);

/* 同じサイトのページからだけ受ける */
$origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
$allowed = (array)($config['allowedOrigins'] ?? []);
if ($origin === '' || !in_array($origin, $allowed, true)) reply(403, ['ok' => false, 'error' => 'origin']);
if (stripos((string)($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json') !== 0) reply(415, ['ok' => false, 'error' => 'type']);

$raw = file_get_contents('php://input', false, null, 0, 65536);
if ($raw === false || strlen($raw) >= 65536) reply(413, ['ok' => false, 'error' => 'size']);
$data = json_decode($raw, true);
if (!is_array($data)) reply(400, ['ok' => false, 'error' => 'json']);

/* ボット対策: 見えない欄に入力がある／開いてから5秒未満 → 送らずに成功だけ返す */
if ((string)($data['website'] ?? '') !== '' || (int)($data['elapsed'] ?? 0) < 5) reply(200, ['ok' => true]);

$forms = ['consult' => '【はじめての方ヒアリング】', 'hearing' => '【本格ヒアリング】'];
$form = (string)($data['form'] ?? '');
if (!isset($forms[$form])) reply(400, ['ok' => false, 'error' => 'form']);
$text = body_text((string)($data['text'] ?? ''), 20000);
if (mb_strlen(trim($text)) < 10) reply(400, ['ok' => false, 'error' => 'empty']);
$subject = one_line((string)($data['subject'] ?? ''), 100);
if (strpos($subject, $forms[$form]) !== 0) $subject = $forms[$form] . $subject;
$receipt = (string)($data['receipt'] ?? '');
if (!preg_match('/^CA-\d{4}-\d{4}$/', $receipt)) $receipt = '';
$replyTo = one_line((string)($data['replyTo'] ?? ''), 254);
if ($replyTo !== '' && !filter_var($replyTo, FILTER_VALIDATE_EMAIL)) $replyTo = '';

/* 同じ送り元からの連続送信を抑える（1時間あたり） */
$limit = max(1, (int)($config['rateLimitPerHour'] ?? 5));
$ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
$stamp = sys_get_temp_dir() . '/crewascent-qn-' . hash('sha256', $ip . '|' . $from) . '.json';
$now = time();
$hits = is_file($stamp) ? (json_decode((string)file_get_contents($stamp), true) ?: []) : [];
$hits = array_values(array_filter($hits, fn($t) => is_int($t) && $t > $now - 3600));
if (count($hits) >= $limit) reply(429, ['ok' => false, 'error' => 'rate']);
$hits[] = $now;
@file_put_contents($stamp, json_encode($hits), LOCK_EX);

$body = $text . "\n\n---\n受付番号: " . ($receipt !== '' ? $receipt : '（なし）') . "\n受信: " . date('Y-m-d H:i') . "\n送信元のブラウザ: " . one_line((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 200) . "\n";
mb_language('Japanese');
mb_internal_encoding('UTF-8');
$headers = 'From: ' . $from;
if ($replyTo !== '') $headers .= "\r\nReply-To: " . $replyTo;
$sent = mb_send_mail($to, $subject, $body, $headers);
reply($sent ? 200 : 500, $sent ? ['ok' => true] : ['ok' => false, 'error' => 'mail']);
