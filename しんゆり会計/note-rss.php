<?php
// 絶対にこの上に空白/改行を置かないこと！

// XMLが壊れないように、エラー表示をオフにする
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);

header('Content-Type: application/xml; charset=utf-8');

// 取得したい note ユーザーID（公式 note 運営アカウント）
$noteUserId = 'info';  // https://note.com/info/rss

$rssUrl = "https://note.com/{$noteUserId}/rss";

// ---- cURLでRSS取得 ----
$ch = curl_init($rssUrl);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_USERAGENT      => 'shinyuri-accg-note-rss/1.0',
    // ローカル環境なのでSSL検証は一旦OFF（本番ではtrue推奨）
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
]);

$rss = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

curl_close($ch);

// ---- エラー時：シンプルなXMLだけ返す ----
if ($rss === false || $httpCode !== 200) {
    http_response_code(500);
    echo '<?xml version="1.0" encoding="UTF-8"?>';
    echo '<error>failed to fetch note rss</error>';
    exit;
}

// ---- 正常時：取得したRSSをそのまま1つだけ返す ----
echo $rss;
exit;
