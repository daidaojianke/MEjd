/*
脚本：清空购物车
更新时间：2021-08-18
因其他脚本会加入商品到购物车，故此脚本用来取消清空购物车
默认：不执行 如需要请添加环境变量
gua_cleancart_Run="true"

商品和店铺规则通用
2@&@商品1,商品2,商品3 👉 表示账号2不清空商品1、商品2和商品3
*@&@商品4,商品5,商品6 👉 表示所有账号不清空商品4、商品5和商品6
4@&@不清空 👉 表示账号4不清空商品或店铺
5@&@ 👉 表示账号5清空所有的商品或店铺
——————————————
|-|账号之间隔开
英文大小写请填清楚
——————————————
2@&@ 👉 指定账号(后面添加商品或店铺 前面账号顺序[数字] *表示所有账号
|-| 👉 账号之间隔开

——————————————
定义不清空的[商品]名称支持模糊匹配
gua_cleancart_products="2@&@商品1,商品2|-|5@&@|-|*@&@不清空"
定义不清空的[店铺]名称支持模糊匹配
gua_cleancart_shop="2@&@店铺1,店铺2|-|3@&@|-|*@&@不清空"


 */
const $ = new Env('清空购物车');
//Node.js用户请在jdCookie.js处填写京东ck;
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
const notify = $.isNode() ? require('./sendNotify') : '';

let cleancartProductsAll = []
let cleancartProductsArr = []
let productsArr = []
let cleancartRun = $.getval('gua_cleancart_Run') || 'false' // 执行脚本
if ($.isNode() && process.env.gua_cleancart_Run) {
  cleancartRun = process.env.gua_cleancart_Run;
}
let cleancartProducts = $.getval('gua_cleancart_products') || '' // 定义不清空的[商品]名称支持模糊匹配 英文大小写请填清楚
if ($.isNode() && process.env.gua_cleancart_products) {
  cleancartProducts = process.env.gua_cleancart_products;
}
let cleancartShopAll = {}
let cleancartShopArr = []
let shopArr = []
let cleancartShop = $.getval('gua_cleancart_shop') || '' // 定义不清空的[店铺]名称支持模糊匹配 英文大小写请填清楚
if ($.isNode() && process.env.gua_cleancart_shop) {
  cleancartShop = process.env.gua_cleancart_shop;
}

for (let i of cleancartProducts && cleancartProducts.split('|-|')) {
  productsArr.push(i)
}
for (let i in productsArr) {
  if(productsArr[i].indexOf('@&@') > -1){
    let arr = productsArr[i].split('@&@')
    cleancartProductsAll[arr[0]] = arr[1].split(',')
  }
}
for (let i of cleancartShop && cleancartShop.split('|-|')) {
  shopArr.push(i)
}
for (let i in shopArr) {
  if(shopArr[i].indexOf('@&@') > -1){
    let arr = shopArr[i].split('@&@')
    cleancartShopAll[arr[0]] = arr[1].split(',')
  }
}

//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [], cookie = '', allMessage = '';
if ($.isNode()) {
  Object.keys(jdCookieNode).forEach((item) => {
    cookiesArr.push(jdCookieNode[item])
  })
  if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => { };
} else {
  cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
}
!(async () => {
  if (!cookiesArr[0]) {
    $.msg('【京东账号一】清空购物车失败', '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', { "open-url": "https://bean.m.jd.com/bean/signIndex.action" });
  }
  if(cleancartRun !== 'true'){
    console.log('脚本停止\n请添加环境变量[gua_cleancart_Run]为"true"')
    return
  }
  for (let i = 0; i < cookiesArr.length; i++) {
    if (cookiesArr[i]) {
      cookie = cookiesArr[i];
      $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
      $.index = i + 1;
      $.isLogin = true;
      $.nickName = '';
      console.log(`\n****开始【京东账号${$.index}】${$.nickName || $.UserName}*****\n`);
      if(cleancartShopAll[$.index]){
        cleancartShopArr = cleancartShopAll[""+$.index]
      }else if(cleancartShopAll["*"]){
        cleancartShopArr = cleancartShopAll["*"]
      }else cleancartShopArr = []
      if(cleancartProductsAll[$.index]){
        cleancartProductsArr = cleancartProductsAll[""+$.index]
      }else if(cleancartProductsAll["*"]){
        cleancartProductsArr = cleancartProductsAll["*"]
      }else cleancartProductsArr = []
      console.log(cleancartShopArr)
      console.log(cleancartProductsArr)
      allMessage += `京东账号${$.index} - ${$.nickName || $.UserName}\n`;
      await getCarts();
      allMessage += `购物车商品数：${$.currentCount} 选择清空的数量：${$.cartsTotalNum}\n`;
      if ($.cartsTotalNum > 0) {
        await unsubscribeCartsFun();
      }
      allMessage += '\n'
    }
  }
  if (allMessage) {
    allMessage = allMessage.substring(0, allMessage.length - 1)
    $.msg($.name, '', allMessage);
    if ($.isNode()) await notify.sendNotify($.name, allMessage);
  }
})()
  .catch((e) => {
    $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
  })
  .finally(() => {
    $.done();
  })

function unsubscribeCartsFun() {
  return new Promise(resolve => {

    const options = {
      "url": `https://wq.jd.com/deal/mshopcart/rmvCmdy?sceneval=2&g_login_type=1&g_ty=ajax`,
      "body": `pingouchannel=0&commlist=${$.commlist}&type=0&checked=0&locationid=${$.areaId}&templete=1&reg=1&scene=0&version=20190418&traceid=${$.traceId}&tabMenuType=1&sceneval=2`,
      "headers": {
        "Accept": "application/json,text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-cn",
        "Connection": "keep-alive",
        "Cookie": cookie,
        "Referer": "https://p.m.jd.com/",
        "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1")
      }
    }
    $.post(options, (err, resp, data) => {
      try {
        data = JSON.parse(data);
        if (data['errId'] == '0') {
          allMessage += `清空结果：✅\n`;
        } else {
          allMessage += `清空结果：❌\n`;
        }
      } catch (e) {
        allMessage += `清空结果：❌\n`;
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    });
  })
}

function getStr(text, start, end) {

  var str = text;
  var aPos = str.indexOf(start);
  if (aPos < 0) { return null }
  var bPos = str.indexOf(end, aPos + start.length);
  if (bPos < 0) { return null }
  var retstr = str.substr(aPos + start.length, text.length - (aPos + start.length) - (text.length - bPos));
  return retstr;

}
function getCarts() {
  $.shopsTotalNum = 0;
  return new Promise((resolve) => {
    const option = {
      url: `https://p.m.jd.com/cart/cart.action`,
      headers: {
        "Host": "p.m.jd.com",
        "Accept": "*/*",
        "Connection": "keep-alive",
        "Cookie": cookie,
        "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
        "Accept-Language": "zh-cn",
        "Accept-Encoding": "gzip, deflate, br"
      },
    }
    $.get(option, (err, resp, data) => {
      try {
        data = JSON.parse(getStr(data, 'window.cartData =', 'window._PFM_TIMING'));
        // console.log(data.cart.currentCount)
        $.currentCount = data.cart.currentCount || 0
        $.cartsTotalNum = 0;
        if (data.errId === '0') {
          $.traceId = data['traceId']
          $.areaId = data['areaId']
          let itemId, sKuId, index, temp
          $.commlist = ''
          // console.log(JSON.stringify(data['cart']['venderCart']))
          for (let i = 0; i < data['cart']['venderCart'].length; i++) {
            let out = false
            const vender = data['cart']['venderCart'][i];
            for (let c of cleancartShopArr) {
              if(!c) continue
              if(c == '不清空'){
                out = true
                break
              }
              if (vender.popInfo.vname.indexOf(c) > -1) {
                out = true
                break
              }
            }
            if (out) continue
            for (let s = 0; s < vender['sortedItems'].length; s++) {
              const sorted = vender['sortedItems'][s];
              for (let m = 0; m < sorted['polyItem']['products'].length; m++) {
                const products = sorted['polyItem']['products'][m];
                let outs = false
                for (let c of cleancartProductsArr) {
                  if(!c) continue
                  if(c == '不清空'){
                    outs = true
                    break
                  }
                  if (products.mainSku.name.indexOf(c) > -1) {
                    outs = true
                    break
                  }
                }
                if (outs) continue
                console.log(vender.popInfo.vname, "|", products.mainSku.name)
                itemId = sorted['itemId']
                if (itemId == products['mainSku']['id']) {
                  sKuId = ''
                  index = '1'
                } else {
                  sKuId = itemId
                  index = sorted['polyType'] == '4' ? '13' : '11'
                }
                temp = [products['mainSku']['id'], , '1', products['mainSku']['id'], index, sKuId, '0', 'skuUuid:' + products['skuUuid'] + '@@useUuid:' + products['useUuid']].join(',')
                if ($.commlist.length > 0) {
                  $.commlist += '$'
                }
                $.commlist += temp
                $.cartsTotalNum += 1
              }
            }
          }
          if ($.commlist.length > 0) {
            // console.log($.commlist)
            $.commlist = encodeURIComponent($.commlist)
          }
          console.log(`当前购物车商品数：${$.currentCount} 选择清空的数量：${$.cartsTotalNum}\n`)
        }
      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(data);
      }
    });
  })
}

function jsonParse(str) {
  if (typeof str == "string") {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.log(e);
      $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
      return [];
    }
  }
}
// prettier-ignore
function Env(t, e) { "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0); class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }