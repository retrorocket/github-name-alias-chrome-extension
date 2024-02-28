chrome.storage.sync.get(["alias"], (item) => {
  if (item.alias) {
    let str = "";
    item.alias.forEach((a) => {
      str += a[0] + "," + a[1] + "," + a[2] + "\n";
    });
    document.querySelector("textarea").value = str;
  }
});

document.querySelector("#setter").addEventListener(
  "click",
  () => {
    const result = convertCSVtoArray(document.querySelector("textarea").value);
    chrome.storage.sync.set(
      {
        alias: result,
      },
      function () {
        alert("設定が保存されました");
      }
    );
  },
  false
);

/**
 * カンマ区切りテキストを二次元配列に変換する
 * https://uxmilk.jp/11586
 */
function convertCSVtoArray(str) {
  // 読み込んだCSVデータが文字列として渡される
  let result = []; // 最終的な二次元配列を入れるための配列
  const tmp = str.split(/\r\n|\n|\r/); // 改行を区切り文字として行を要素とした配列を生成

  // 各行ごとにカンマで区切った文字列を要素とした二次元配列を生成
  for (let i = 0; i < tmp.length; ++i) {
    if (!tmp[i]) {
      break;
    }
    result[i] = tmp[i].split(",");
  }

  return result;
}
