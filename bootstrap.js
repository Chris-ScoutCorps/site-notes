'use strict';

let IS_CHROME = (() => {
  var isChromium = window.chrome;
  var winNav = window.navigator;
  var vendorName = winNav.vendor;
  var isOpera = typeof window.opr !== "undefined";
  var isIEedge = winNav.userAgent.indexOf("Edg") > -1;
  var isIOSChrome = winNav.userAgent.match("CriOS");

  return isIOSChrome || (
    isChromium !== null &&
    typeof isChromium !== "undefined" &&
    vendorName === "Google Inc." &&
    isOpera === false &&
    isIEedge === false);
})();

let STORAGE = IS_CHROME ? chrome.storage.local : browser.storage.local;
let TABS = IS_CHROME ? chrome.tabs : browser.tabs;

let WINDOW_ID;
browser.windows.getCurrent({ populate: true }).then((windowInfo) => {
  WINDOW_ID = windowInfo.id;
});

let DEBOUNCES = {};
function debounce(key, callback, timeout = 250) {
  clearTimeout(DEBOUNCES[key]);
  DEBOUNCES[key] = setTimeout(callback, timeout);
}
