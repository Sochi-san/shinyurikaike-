<?php
// 絶対にこの上に空白/改行を置かないこと！
// （HTMLとして使う場合も、先頭にBOMや空白があると意図しない挙動の原因になる）

// エラー表示をオフ（本番の見た目を崩さないため）
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);

// 取得したい note ユーザーID
// 例：公式 note 運営アカウントなら 'info'（https://note.com/info/rss）
$noteUserId = 'info';  // ★岡野さんの note アカウントID に変更してね

$rssUrl = "https://note.com/{$noteUserId}/rss";

// ---- cURLでRSS取得 ----
$ch = curl_init($rssUrl);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_USERAGENT      => 'shinyuri-accg-note-rss/1.0',
    // ローカル環境なのでSSL検証は一旦OFF（本番サーバーでは true 推奨）
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
]);

$rss = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

curl_close($ch);

// ---- 取得失敗時：シンプルなプレースホルダー表示 ----
if ($rss === false || $httpCode !== 200) : ?>
  <p class="note__empty text-small">
    現在、noteの記事を取得できませんでした。時間をおいて再度ご確認ください。
  </p>
<?php
  return;
endif;

// ---- RSS をパース ----
$xml = @simplexml_load_string($rss);
if (!$xml || !isset($xml->channel->item)) : ?>
  <p class="note__empty text-small">
    現在、noteの記事を取得できませんでした。時間をおいて再度ご確認ください。
  </p>
<?php
  return;
endif;

// ---- 日付しきい値（直近1ヶ月）を計算 ----
$now = new DateTime('now', new DateTimeZone('Asia/Tokyo'));
$threshold = (clone $now)->sub(new DateInterval('P1M')); // P1M = 1 month

$items  = $xml->channel->item;
$max    = 3;   // 最大表示件数
$count  = 0;

foreach ($items as $item) {

    if ($count >= $max) {
        break;
    }

    // pubDate を DateTime に変換
    $pubDateRaw = (string)$item->pubDate;
    try {
        $pubDateObj = new DateTime($pubDateRaw, new DateTimeZone('Asia/Tokyo'));
    } catch (Exception $e) {
        // 日付としておかしい場合はスキップ
        continue;
    }

    // NEW 付与判定（直近1ヶ月以内ならtrue）
    $isNew = ($pubDateObj >= $threshold);

    // 表示用フォーマット
    $displayDate  = $pubDateObj->format('Y.m.d'); // 2025.11.28
    $datetimeAttr = $pubDateObj->format('Y-m-d'); // 2025-11-28

    // 各種フィールド取得
    $title = (string)$item->title;
    $link  = (string)$item->link;

    // description は HTML混じりなのでタグ削除して短く
    $descRaw      = (string)$item->description;
    $descStripped = trim(mb_substr(strip_tags($descRaw), 0, 60)) . '…';

    ?>
    <article class="note-card">
      <a href="<?php echo htmlspecialchars($link, ENT_QUOTES, 'UTF-8'); ?>"
         class="note-card__link"
         target="_blank"
         rel="noopener">

        <div class="note-card__top">
          <span class="note-card__date-tag">
            <span class="note-card__date-icon" aria-hidden="true">🗓</span>
            <time datetime="<?php echo htmlspecialchars($datetimeAttr, ENT_QUOTES, 'UTF-8'); ?>">
              <?php echo htmlspecialchars($displayDate, ENT_QUOTES, 'UTF-8'); ?>
            </time>
          </span>

          <?php if ($isNew) : ?>
            <span class="note-card__badge note-card__badge--new">NEW</span>
          <?php endif; ?>
        </div>

        <h3 class="note-card__title">
          <?php echo htmlspecialchars($title, ENT_QUOTES, 'UTF-8'); ?>
        </h3>

        <p class="note-card__excerpt">
          <?php echo htmlspecialchars($descStripped, ENT_QUOTES, 'UTF-8'); ?>
        </p>

        <span class="note-card__more">
          続きを読む（note）<span aria-hidden="true">→</span>
        </span>

      </a>
    </article>
    <?php
    $count++;
}
