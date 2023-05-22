'use strict';

const IS_CHROME = (() => {
  const isChromium = window.chrome;
  const winNav = window.navigator;
  const vendorName = winNav.vendor;
  const isOpera = typeof window.opr !== "undefined";
  const isIEedge = winNav.userAgent.indexOf("Edg") > -1;
  const isIOSChrome = winNav.userAgent.match("CriOS");

  return isIOSChrome || (
    isChromium !== null &&
    typeof isChromium !== "undefined" &&
    vendorName === "Google Inc." &&
    isOpera === false &&
    isIEedge === false);
})();

const STORAGE = IS_CHROME ? chrome.storage.local : browser.storage.local;
const TABS = IS_CHROME ? chrome.tabs : browser.tabs;
const WINDOWS = IS_CHROME ? chrome.windows : browser.windows;

let WINDOW_ID;
WINDOWS.getCurrent({ populate: true }).then((windowInfo) => {
  WINDOW_ID = windowInfo.id;
});

const DEBOUNCES = {};
function debounce(key, callback, timeout = 250) {
  clearTimeout(DEBOUNCES[key]);
  DEBOUNCES[key] = setTimeout(callback, timeout);
}
