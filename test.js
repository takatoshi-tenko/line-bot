// 予約情報転記
function logHotelDetailsToSheet() {
  var sheet = getSheet();

  // すでに転記済みのメールIDを取得
  var lastRow = sheet.getLastRow();
  // 9：9行目から範囲選択
  // 20：20列目から選択
  var processedIds = sheet.getRange(9, 20, lastRow - 2, 1).getValues().flat(); // T列に保存するメールIDを取得

  // 件名が【予約】じゃらんnet_予約通知で始まるメールを検索
  var threads = GmailApp.search('subject:"【予約】じゃらんnet_予約通知"');

  // 各スレッドを処理
  threads.forEach(thread => {
    thread.getMessages().forEach(message => {
      var messageId = message.getId(); // メールの一意なIDを取得

      // メールがすでに処理されているかを確認
      if (processedIds.includes(messageId)) {
        return; // すでに転記済みのメールはスキップ
      }

      // メールの本文を取得
      var body = message.getPlainBody();
      var receivedDate = message.getDate();
      var data = extractHotelDetailsFromBody(body);
      console.log(data)

      // ポイント利用があった場合、料金からポイント分を引く
      var finalPrice = data.price - data.pointsUsed;

      // 合計人数を計算
      var totalGuests = parseInt(data.guestCountMale, 10) + parseInt(data.guestCountFemale, 10) + parseInt(data.guestCountChild, 10) + parseInt(data.guestCountInfant, 10);

      // データを追加する配列を作成
      var newRow = [
        '',  // A列: 空白
        '',  // B列: キャンセル
        '',  // C列: 予約変更
        data.hotelDate,                     // D列: 宿泊日時
        formatDateToCustom(receivedDate),    // E列: 宿泊予約日
        'じゃらん',                         // F列: 宿泊予約サイト
        data.stayCount,                     // G列: 泊数
        data.roomType,                      // H列: 部屋タイプ
        data.plan,                          // I列: プラン
        data.guestCountMale,                // J列: 大人 男
        data.guestCountFemale,              // K列: 大人 女
        data.guestCountChild,               // L列: 小学生
        data.guestCountInfant,                // M列：幼児
        totalGuests,                        // N列: 合計人数
        data.pointsUsed,                    // O列: ポイント利用
        finalPrice,                         // P列: 料金（ポイント分引いた後の金額）
        data.guestName,                     // Q列: 予約者氏名
        data.email,                         // R列: 予約者メール
        data.tel,                           // S列: 予約者電話番号
        messageId                           // T列: メールID
      ];

      // シートに新しい行を追加
      sheet.appendRow(newRow);

      // 最終行に対して料金（P列）に通貨フォーマットを適用
      lastRow = sheet.getLastRow();  // 新しく追加された最終行を取得
      sheet.getRange(lastRow, 16).setNumberFormat("¥#,##0");  // P列（16列目）に通貨フォーマットを設定
    });
  });

  // GmailIDのT列は非表示
  sheet.hideColumns(20);

  addCheckboxesToRange(12, 2, 2);  // B列,C列（キャンセル通知、予約変更）
  addCheckboxesToRange(12, 23, 5);  // W列からAA列（管理人更新範囲）
}

// 予約項目のフォーマット群
function extractHotelDetailsFromBody(body) {
  // var datePattern = /宿泊日時\s*：\s*([\d]{4}年[\d]{2}月[\d]{2}日\(.\)[\d]{2}:\d{2}\s*～\s*\d{2}:\d{2})/;
  var datePattern = /宿泊日時\s*：\s*([\d]{4}年[\d]{2}月[\d]{2}日\(.\)[\d]{2}:\d{2})(?:★)?(?:\s*（変更前：[\d\/]+）)?(?:\s*～\s*[\d]{2}:\d{2})?/;
  var stayCountPattern = /泊数\s*：\s*(\d泊)/;
  var roomTypePattern = /部屋タイプ\s*：\s*(.+)/;
  var planPattern = /プラン\s*：\s*(.+)/;
  var adultPattern = /大人\s*：\s*男\s*(\d+)\s*、\s*女\s*(\d+)/;
  var childPattern = /小学生\s*：\s*(\d+)名/;
  var infantPattern = /幼児\s*・.*布団のみ.*：\s*(\d+)名/; // 幼児の布団のみ人数を抽出するパターン
  var pointsPattern = /■ポイント利用\s*：\s*([\d,]+)/;
  var pricePattern = /合計\s*：\s*([\d,]+)円/;
  var guestNamePattern = /予約者氏名\s*：\s*(.+)\s*様/;
  var telPattern = /宿泊代表者連絡先\s*：\s*(\d+)/;

  console.log('幼児ヒットした値', body.match(infantPattern))

  return {
    hotelDate: (body.match(datePattern) || [""])[1],
    stayCount: (body.match(stayCountPattern) || [""])[1],
    roomType: (body.match(roomTypePattern) || [""])[1],
    plan: (body.match(planPattern) || [""])[1],
    guestCountMale: (body.match(adultPattern) || ["", "0"])[1],
    guestCountFemale: (body.match(adultPattern) || ["", "", "0"])[2],
    guestCountChild: (body.match(childPattern) || ["", "0"])[1],  // 小学生の人数
    guestCountInfant: (body.match(infantPattern) || ["", "0"])[1],  // 幼児・布団のみ人数
    pointsUsed: parseFloat((body.match(pointsPattern) || ["", "0"])[1].replace(",", "")),  // ポイント利用額
    price: parseFloat((body.match(pricePattern) || ["", "0"]).slice(1).join().replace(",", "")),  // 合計金額
    guestName: (body.match(guestNamePattern) || [""])[1],
    email: getEmailFromBody(body),
    tel: "'" + (body.match(telPattern) || [""])[1]
  };
}

// シートの特定列に転記する関数
function logHotelDetailsToMatchingRow() {
  var sheet = getSheet();

  // 件名が【予約】じゃらんnet_予約通知で始まるメールを検索
  var threads = GmailApp.search('subject:"【予約】じゃらんnet_予約通知"');

  threads.forEach(thread => {
    thread.getMessages().forEach(message => {
      var messageId = message.getId(); // メールの一意なIDを取得

      // メールの本文を取得
      var body = message.getPlainBody();
      var data = extractHotelDetailsFromBody(body);
      var matchQuestionWithRequest = body.match(/■予約者からの回答：([\s\S]*?)■予約者から宿への要望/);
      var matchQuestionWithoutRequest = body.match(/■予約者からの回答：([\s\S]*?)じゃらんnet/);
      var matchRequest = body.match(/（必要があれば、メール・電話などで宿泊者にご連絡下さい）：([\s\S]*?)※キャンセル料請求については、管理画面上から操作をお願いします。/);
      if (matchQuestionWithRequest) {
        var questions = matchQuestionWithRequest[1].trim();
      } else {
        var questions = matchQuestionWithoutRequest[1].trim();
      }
      var requests = matchRequest[1].trim(); // 質問部分をトリムして取得

      // シート内で予約者の名前が一致する行を検索
      var nameColumn = 17; // 予約者氏名が格納されている列番号（例：Q列 = 17）
      var questionColumn = 21; // 質問の転記先の列番号（例：U列 = 21）
      var requestColumn = 22; // 要望の転記先の列番号（例：V列 = 22）
      var dataRange = sheet.getDataRange().getValues();

      var questionRow = null; // 転記する行を格納
      var requestRow = null; // 転記する行を格納
      for (var i = 0; i < dataRange.length; i++) {
        if (dataRange[i][nameColumn - 1] === data.guestName) { // 名前が一致する行を探す
          questionRow = i + 1; // 行番号はインデックス+1
          requestRow = i + 1; // 行番号はインデックス+1
          break;
        }
      }

      // 名前が一致する行が見つかった場合のみ処理
      if (questionRow || requestRow) {
        sheet.getRange(questionRow, questionColumn).setValue(questions); // 質問を転記
        sheet.getRange(requestRow, requestColumn).setValue(requests); // 要望を転記
      } else {
        Logger.log(`転記失敗: 名前 ${data.guestName} が一致する行が見つかりませんでした。`);
      }
    });
  });
}

// 予約変更通知の処理
function handleReservationChange() {
  processReservationChange("【変更／通知】じゃらんnet_予約変更通知");
}

// 予約キャンセル通知
function handleCancellation() {
  processEmail("【ＣＸＬ／通知】じゃらんnet_予約キャンセル通知", 2, '#d3d3d3');
}

// キャンセル・日付昇順でソート
function sortSheetFrom12thRow() {
  var sheet = getSheet();
  var range = sheet.getRange(12, 1, sheet.getLastRow() - 11, sheet.getLastColumn());
  range.sort([{ column: 2, ascending: false }, { column: 4, ascending: true }]);
}

// すでに終わった予約情報は非表示する
function hideRowsPastToday() {
  var sheet = getSheet();
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  // D列（宿泊日時）と G列（泊数）の範囲を取得
  var range = sheet.getRange(12, 4, sheet.getLastRow() - 11, 4); // D列（宿泊日時）とG列（泊数）
  var values = range.getValues();

  values.forEach((row, i) => {
    var match = row[0].match(/([\d]{4}年[\d]{1,2}月[\d]{1,2}日)/); // 宿泊開始日を取得
    var stayCount = parseInt(row[3]); // 泊数を取得（G列）

    if (match && !isNaN(stayCount)) {
      // 宿泊開始日をパース
      var startDate = new Date(match[1].replace(/年|月/g, '/').replace(/日/, ''));
      startDate.setHours(0, 0, 0, 0);

      // チェックアウト日を計算（宿泊開始日に泊数を加算）
      var checkoutDate = new Date(startDate);
      checkoutDate.setDate(startDate.getDate() + stayCount);

      // 今日よりもチェックアウト日が過去であれば、その行を非表示
      if (checkoutDate <= today) {
        sheet.hideRows(i + 12);
      }
    }
  });
}

// ヘルパー関数
function getSheet() {
  return SpreadsheetApp.openById("1ryaClyl6zchQ9OBTk-bAy_J3DKvVnFqUUnpTnl6na3M").getSheetByName("test_宿泊情報");
}

// 予約日時の時刻フォーマット
function formatDateToCustom(date) {
  // 日付の各部分を取得
  var year = date.getFullYear();
  var month = ('0' + (date.getMonth() + 1)).slice(-2);
  var day = ('0' + date.getDate()).slice(-2);
  var weekDays = ['日', '月', '火', '水', '木', '金', '土'];
  var weekDay = weekDays[date.getDay()];
  return year + '年' + month + '月' + day + '日' + '(' + weekDay + ')';
}

// 変更通知検知用のEmail検索
function processEmail(subject, targetColumn, color) {
  var sheet = getSheet();
  var threads = GmailApp.search(`subject:"${subject}"`);

  threads.forEach(thread => {
    thread.getMessages().forEach(message => {
      var body = message.getPlainBody();
      var reservationEmail = getEmailFromBody(body);
      if (!reservationEmail) return;

      var data = sheet.getDataRange().getValues();
      for (var row = 1; row < data.length; row++) {
        var sheetEmail = data[row][18]; // メールアドレス列を取得
        if (typeof sheetEmail === "string" && sheetEmail.trim() === reservationEmail) {
          sheet.getRange(row + 1, targetColumn).setValue(true);
          sheet.getRange(row + 1, 1, 1, sheet.getLastColumn()).setBackground(color);
          break;
        }
      }
    });
  });
}

// 変更通知検知用のEmail検索とデータの上書き
function processReservationChange(subject) {
  var sheet = getSheet();
  var threads = GmailApp.search(`subject:"${subject}"`);

  threads.forEach(thread => {
    thread.getMessages().forEach(message => {
      var body = message.getPlainBody();
      var reservationEmail = getEmailFromBody(body);
      if (!reservationEmail) return;

      var data = sheet.getDataRange().getValues();
      for (var row = 1; row < data.length; row++) {
        // 予約者メールアドレスがnullやundefinedでないことを確認
        var sheetEmail = data[row][18];
        if (typeof sheetEmail === "string" && sheetEmail.trim() === reservationEmail) {
          var newData = extractHotelDetailsFromBody(body);
          updateReservationRow(sheet, row + 1, newData, message, body);  // row+1でシートの行に対応
          break;
        }
      }
    });
  });
}

// 予約変更箇所の検出
function updateReservationRow(sheet, row, newData, message, body) {
  // 現在のシートの値を取得（D列からV列まで）
  var existingData = sheet.getRange(row, 4, 1, 19).getValues()[0];

  // 大人の男・女の人数を抽出
  var guestCounts = extractGuestCounts(body);

  // 新しいデータの配列（D列からR列に対応）
  var newRowData = [
    newData.hotelDate,
    formatDateToCustom(message.getDate()),  // 宿泊予約日
    "じゃらん",  // 宿泊予約サイト
    newData.stayCount,  // 泊数
    newData.roomType,  // 部屋タイプ
    newData.plan,  // プラン
    guestCounts.male,  // 大人 男
    guestCounts.female,  // 大人 女
    newData.guestCountChild,  // 小学生
    newData.guestCountInfant, // 幼児
    parseInt(guestCounts.male + guestCounts.female + newData.guestCountChild + newData.guestCountInfant) / 10,  // 合計人数
    newData.pointsUsed,  // ポイント利用
    newData.price - newData.pointsUsed,  // 料金
    newData.guestName,  // 予約者氏名
    newData.email,  // 予約者メール
    // newData.tel  // 予約者電話番号
  ];

  // 差分を検知して上書き、変更箇所を黄色に
  for (var i = 0; i < newRowData.length; i++) {
    var existingValue = existingData[i];
    var newValue = newRowData[i];

    // 差分があれば上書きして黄色に変更、差分がなければ色を元に戻す
    if (existingValue != newValue) {
      sheet.getRange(row, 4 + i).setValue(newValue).setBackground("#ffe101");
    } else {
      sheet.getRange(row, 4 + i).setBackground(null);  // 色をリセット
    }
  }

  // 予約変更セルにチェックマークをセット
  sheet.getRange(row, 3).setValue(true);
}

// 大人人数の変更検知
function extractGuestCounts(body) {
  // bodyがnullまたはundefinedの場合は空のオブジェクトを返す
  if (!body || typeof body !== 'string') {
    return
  }

  // 大人の人数を抽出するパターン
  var adultPattern = /大人：(?:★)?男\s*(\d+)、(?:★)?女\s*(\d+)/;
  var matchAdults = body.match(adultPattern);

  // 正規表現がマッチしなかった場合はデフォルト値（0）を返す
  var guestCountMale = matchAdults ? parseInt(matchAdults[1]) : 0;
  var guestCountFemale = matchAdults ? parseInt(matchAdults[2]) : 0;

  return {
    male: guestCountMale,
    female: guestCountFemale
  };
}

// 予約者Eメール取得
function getEmailFromBody(body) {
  var emailPattern = /予約者Ｅメールアドレス\s*：\s*(.+)/;
  var matchEmail = body.match(emailPattern);
  return matchEmail ? matchEmail[1].trim() : null;
}

// チェックボックス追加
function applyCheckboxes(range) {
  range.insertCheckboxes();
  var values = range.getValues();
  for (var i = 0; i < values.length; i++) {
    range.getCell(i + 1, 1).setValue(values[i][0] === true || values[i][0] === "TRUE");
  }
}

// 汎用的なチェックボックス設置関数
function addCheckboxesToRange(startRow, startCol, numCols) {
  var sheet = getSheet();
  var lastRow = sheet.getLastRow();

  // 指定した範囲にチェックボックスを追加
  applyCheckboxes(sheet.getRange(startRow, startCol, lastRow - (startRow - 1), numCols));
}
