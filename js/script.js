/**
 * メンションに対して別名を表示する
 */
let alias = [];
chrome.storage.sync.get(["alias"], (item) => {
  if (item.alias) {
    alias = item.alias;
    replaceMentions();
  }
});
const replaceMentions = () => {
  let aliasNames = document.querySelectorAll("a.user-mention, a[data-hovercard-type=user], a[data-octo-click=hovercard-link-click]");
  aliasNames.forEach(name => {
    alias.forEach(a => {
      let text = name.textContent;
      if (text.indexOf(a[0]) !== -1 && text.indexOf(a[1]) === -1) {
        name.textContent = text.replace(a[0], `${a[0]} (${a[1]})`);
      }
    })
  });
};

/**
 * GitHubのsuggesterにフックして別名をサジェストする
 */
let ulShowing = true;
let ulLastPos = "";
let calledCreateSuggester = false;

// オブザーバーの作成
const observer = new MutationObserver((mutations) => {
  let ul = document.querySelector("ul.suggester-container");
  let insertedUl = document.querySelector("ul.inserted-extension-ul");
  if (insertedUl) {
    calledCreateSuggester = true;
    return;
  }
  calledCreateSuggester = false;
  if (ul) {
    ulShowing = true;
    if (document.querySelector("li.inserted-extension") == null) {
      ulLastPos = ul.getAttribute("style");
      let liText = "";
      if (mutations[0].target == null) {
        return;
      }
      let children = Array.from(mutations[0].target.children);
      children.forEach((child) => {
        if (child.tagName === "TEXTAREA") {
          let pos = child.selectionStart;
          let text = child.value;
          alias.forEach(a => {
            let start = fetchStr(text, pos);
            if (start && a[2].startsWith(start)) {
              let liText = `<li class="inserted-extension" data-value="${a[0]}" role="option"><span>${a[0]}</span>&nbsp;<small>${a[1]}</small></li>`;
              ul.insertBefore(createElementFromHTML(liText), ul.firstChild);
            }
          });
        }
      });
    }
  } else {
    ulShowing = false; // suggesterが表示された後、候補がなくなったので表示されなくなった
  }
});

// 監視オプションの作成
const options = {
  childList: true
};

let textareas;
// 監視の開始
document.body.addEventListener("click", () => {
  document.querySelectorAll("text-expander").forEach((t) => {
    observer.observe(t, options);
  });
  textareas = document.querySelectorAll("textarea");
  createSuggester();
  replaceMentions();
});

/**
 * GitHubのsuggesterがサジェストを終了した場合にサジェストする
 */
const createSuggester = () => {
  textareas.forEach(textarea => {
    textarea.addEventListener("input",
      () => {
        removeSuggester();
        if (!ulShowing || calledCreateSuggester) {
          let pos = textarea.selectionStart;
          let text = textarea.value;
          var end = textarea.selectionEnd;
          const ulText = `<ul role="listbox" class="inserted-extension-ul suggester-container suggester suggestions list-style-none position-absolute" style="${ulLastPos}">`;
          let liText = "";
          alias.forEach(a => {
            let start = fetchStr(text, pos);
            if (start && a[2].startsWith(start)) {
              liText += `<li class="inserted-extension" data-value="${a[0]}" role="option"><span>${a[0]}</span>&nbsp;<small>${a[1]}</small></li>`;
            }
          });
          if (liText) {
            // ul追加
            textarea.parentNode.insertBefore(createElementFromHTML(ulText + liText + "</ul>"), textarea.nextSibling);
            let lis = document.querySelectorAll("li.inserted-extension");
            lis.forEach(li => {
              li.addEventListener("click", () => {
                let diff = caclPos(text, pos);
                var before = text.substr(0, pos - diff);
                var word = li.getAttribute("data-value");
                var after = text.substr(pos);
                text = before + word + after;
                textarea.value = text;
                textarea.selectionEnd = end + word.length;
                removeSuggester();
              }, false);
            })
          } else {
            removeSuggester();
          }
        }
      }, false);
    textarea.addEventListener("click",
      () => {
        removeSuggester();
      })
  });
};


/**
 * HTML文字列をElementへ変換する。
 * @param html HTML文字列
 * @returns {Element} 
 * https://qiita.com/seijikohara/items/911f886d8eb79862870b
 */
const createElementFromHTML = (html) => {
  const tempEl = document.createElement('div');
  tempEl.innerHTML = html;
  return tempEl.firstElementChild;
};

/**
 * アットマークまでの位置を計算する
 */
const caclPos = (text, caretPos) => {
  let before = text.substr(0, caretPos);
  let index = before.lastIndexOf("@");
  let diff = caretPos - index;
  return diff - 1;
};

/**
 * アットマークからの文字列を取得する
 */
const fetchStr = (text, caretPos) => {
  let before = text.substr(0, caretPos);
  let index = before.lastIndexOf("@");
  return text.substr(index + 1, caretPos).split(" ")[0];
};

/**
 * 自力で作成したsuggesterを削除する
 */

const removeSuggester = () => {
  let ul = document.querySelector("ul.inserted-extension-ul");
  if (ul != null) {
    ul.parentNode.removeChild(ul);
  }
};