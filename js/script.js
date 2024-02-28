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
  const aliasNames = document.querySelectorAll(
    "a.user-mention, a[data-hovercard-type=user], a[data-octo-click=hovercard-link-click]"
  );
  aliasNames.forEach((name) => {
    alias.forEach((a) => {
      const text = name.textContent;
      if (text.indexOf(a[0]) !== -1 && text.indexOf(a[1]) === -1) {
        name.textContent = text.replace(a[0], `${a[0]} (${a[1]})`);
      }
    });
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
  const uls = document.querySelectorAll("ul.suggester-container");
  if (uls.length > 1) {
    removeSuggester();
  }
  const ul = document.querySelector("ul.suggester-container");
  const insertedUl = document.querySelector("ul.inserted-extension-ul");
  if (insertedUl) {
    calledCreateSuggester = true;
    return;
  }
  calledCreateSuggester = false;
  if (ul) {
    ulShowing = true;
    if (!document.querySelector("li.inserted-extension")) {
      ulLastPos = ul.getAttribute("style");
      if (!mutations[0].target) {
        return;
      }
      const child = mutations[0].target.querySelector("textarea");
      const pos = child.selectionStart;
      const text = child.value;
      alias.forEach((a) => {
        const start = fetchStr(text, pos);
        if (start && a[2].startsWith(start)) {
          const liText = `<li class="inserted-extension" data-value="${a[0]}" role="option"><span>${a[0]}</span>&nbsp;<small>${a[1]}</small></li>`;
          ul.insertBefore(createElementFromHTML(liText), ul.firstChild);
        }
      });
    }
  } else {
    ulShowing = false; // suggesterが表示された後、候補がなくなったので表示されなくなった
  }
});

// 監視オプションの作成
const options = {
  childList: true,
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
  textareas.forEach((textarea) => {
    textarea.addEventListener(
      "keyup",
      (e) => {
        removeSuggester();
        if (!ulShowing || calledCreateSuggester) {
          const pos = e.target.selectionStart;
          let text = e.target.value;
          const end = e.target.selectionEnd;
          const ulText = `<ul role="listbox" class="inserted-extension-ul suggester-container suggester suggestions list-style-none position-absolute" style="${ulLastPos}">`;
          let liText = "";
          alias.forEach((a) => {
            const start = fetchStr(text, pos);
            if (start && a[2].startsWith(start)) {
              liText += `<li class="inserted-extension" data-value="${a[0]}" role="option"><span>${a[0]}</span>&nbsp;<small>${a[1]}</small></li>`;
            }
          });
          if (liText) {
            // ul追加
            e.target.parentNode.insertBefore(
              createElementFromHTML(ulText + liText + "</ul>"),
              e.target.nextSibling
            );
            const lis = document.querySelectorAll("li.inserted-extension");
            lis.forEach((li) => {
              li.addEventListener(
                "click",
                () => {
                  const diff = caclPos(text, pos);
                  const before = text.substr(0, pos - diff);
                  const word = li.getAttribute("data-value");
                  const after = text.substr(pos);
                  text = before + word + after;
                  e.target.value = text;
                  e.target.selectionEnd = end + word.length;
                  removeSuggester();
                },
                false
              );
            });
          } else {
            removeSuggester();
          }
        }
      },
      false
    );
    textarea.addEventListener("click", () => {
      removeSuggester();
    });
  });
};

/**
 * HTML文字列をElementへ変換する。
 * @param html HTML文字列
 * @returns {Element}
 * https://qiita.com/seijikohara/items/911f886d8eb79862870b
 */
const createElementFromHTML = (html) => {
  const tempEl = document.createElement("div");
  tempEl.innerHTML = html;
  return tempEl.firstElementChild;
};

/**
 * アットマークまでの位置を計算する
 */
const caclPos = (text, caretPos) => {
  const before = text.substr(0, caretPos);
  const index = before.lastIndexOf("@");
  const diff = caretPos - index;
  return diff - 1;
};

/**
 * アットマークからの文字列を取得する
 */
const fetchStr = (text, caretPos) => {
  const before = text.substr(0, caretPos);
  const index = before.lastIndexOf("@");
  return text.substr(index + 1, caretPos).split(" ")[0];
};

/**
 * 自力で作成したsuggesterを削除する
 */
const removeSuggester = () => {
  const ul = document.querySelector("ul.inserted-extension-ul");
  if (ul) {
    ul.parentNode.removeChild(ul);
  }
};

/**
 * PRのサジェストに候補を追加する
 */
let users;
let clone;
const prObserver = new MutationObserver((mutations) => {
  if (clone) return;
  clone = document
    .querySelector(
      "div[data-filterable-for=review-filter-field] > label[role=menuitemcheckbox]"
    )
    .cloneNode(true);
});

document.body.addEventListener("click", () => {
  if (!document.querySelector("div[data-filterable-for=review-filter-field]"))
    return;

  if (!users) {
    fetch(
      document
        .querySelector("div[data-filterable-for=review-filter-field]")
        .getAttribute("data-filterable-src"),
      {
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    )
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error();
        }
      })
      .then((json) => {
        users = json;
      })
      .catch((error) => {
        console.log(error);
      });
  }
  prObserver.observe(
    document.querySelector("div[data-filterable-for=review-filter-field]"),
    options
  );
  document.querySelector("#review-filter-field").addEventListener(
    "keyup",
    (e) => {
      alias.forEach((a) => {
        if (e.target.value && a[2].startsWith(e.target.value)) {
          users.users.filter((item, index) => {
            if (item.login === a[0]) {
              clone.querySelector("span.js-username").textContent = a[2];
              clone.querySelector("span.js-description").textContent = a[1];
              clone.querySelector("input[type=checkbox]").value = item.id;
              clone.querySelector("div.select-menu-item-gravatar > img").src =
                item.avatar;
              document
                .querySelector("div[data-filterable-for=review-filter-field]")
                .insertBefore(
                  clone,
                  document.querySelector(
                    "div[data-filterable-for=review-filter-field]"
                  ).firstChild
                );
            }
          });
        }
      });
    },
    false
  );
});
