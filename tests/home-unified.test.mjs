import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('index.html');
const script = read('ngo-website/js/home-unified.js');

test('Single header, main, footer; no second embedded site shell or legacy script', () => {
  for (const tag of ['header', 'main', 'footer']) assert.equal([...html.matchAll(new RegExp('<' + tag + '(?:\\s|>)', 'g'))].length, 1);
  assert.ok(!html.includes('class="oc-expo-bar"'));
  assert.ok(!html.includes('src="ngo-website/js/script.js"'));
  assert.ok(html.includes('src="clipart.png"'));
});
test('All internal navigation anchors exist and all content groups remain accessible', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), match[1]);
  for (const id of ['home','mission','projects','partners','membership','contact']) assert.ok(ids.includes(id));
  for (const lang of ['mn','en']) assert.ok(html.includes(`expo-2027.html?lang=${lang}#expo-contact-${lang}`));
});
test('Standalone full Expo content remains byte-identical to the previous release', () => {
  assert.equal(createHash('sha256').update(read('expo-2027.html')).digest('hex'), '5ab93ab805473b602ce5111d1999a2f0a939ba3cb8b83bfdc05333cbfc030018');
});
test('All local inline scripts parse and all UI translation keys exist in both languages', () => {
  const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  inline.forEach(source => new Function(source));
  const source = inline.find(value => value.includes('const resources ='));
  const resources = runInNewContext(source.slice(0,source.indexOf('let currentLanguage')) + '; resources;');
  for (const match of html.matchAll(/data-i18n="([^"]+)"/g)) {
    for (const lang of ['mn','en']) assert.equal(typeof resources[lang].translation[match[1]], 'string', `${lang}:${match[1]}`);
  }
  assert.equal((html.match(/data-i18n="[^"]+"><\//g) || []).length, 0, 'No empty static translated labels');
});

function boot({valid = true, mobile = true} = {}) {
  const events = {};
  const classes = new Set();
  const menu = {classList: {remove: n=>classes.delete(n), toggle: (n,v)=>v?classes.add(n):classes.delete(n)}, addEventListener:(n,f)=>events['menu:'+n]=f};
  const toggle = {expanded:'false', getAttribute:()=>toggle.expanded, setAttribute:(_,v)=>toggle.expanded=v, addEventListener:(n,f)=>events['toggle:'+n]=f, focus:()=>{toggle.focused=true;}};
  const values = {contactName:'Test & User',contactEmail:'test@example.com',contactSubject:'Expo & enquiry\r\nBCC: fake',contactMessage:'Монгол текст & ? # + \nNext line'};
  const form = {reportValidity:()=>valid,elements:{namedItem:name=>({value:values[name]})},addEventListener:(n,f)=>events['form:'+n]=f};
  const status = {textContent:''};
  const document = {body:{classList:{contains:()=>true,add:()=>{}}},documentElement:{lang:'mn'},getElementById:id=>({ 'site-menu':menu,contactForm:form,'contact-status':status})[id],querySelector:()=>toggle,addEventListener:(n,f)=>events['doc:'+n]=f};
  const media = {matches:mobile, addEventListener:(n,f)=>events['media:'+n]=f};
  const window = {matchMedia:()=>media,location:{href:''}};
  runInNewContext(script,{document,window,encodeURIComponent});
  return {events,classes,toggle,status,values,window,document};
}
test('Mobile navigation opens, closes on Escape and returns keyboard focus', () => {
  const s=boot(); s.events['toggle:click']();
  assert.equal(s.toggle.expanded,'true'); assert.ok(s.classes.has('is-open'));
  s.events['doc:keydown']({key:'Escape'});
  assert.equal(s.toggle.expanded,'false'); assert.equal(s.toggle.focused,true);
});
test('Navigation closes on mobile selection, but desktop links do not hide the menu', () => {
  for(const mobile of [true,false]){
    const s=boot({mobile}); s.events['toggle:click'](); s.events['menu:click']({target:{closest:()=>({})}});
    assert.equal(s.toggle.expanded,mobile?'false':'true');
    s.events['media:change'](); assert.equal(s.toggle.expanded,'false');
  }
});
test('Email form composes an encoded draft, strips subject newlines and retains input without delivery claim', () => {
  const s=boot(); s.events['form:submit']({preventDefault(){}});
  const url=new URL(s.window.location.href);
  assert.equal(url.protocol,'mailto:'); assert.equal(url.pathname,'ceo@ochircenter.org');
  assert.equal(url.searchParams.get('subject'),'Expo & enquiry  BCC: fake');
  assert.ok(url.searchParams.get('body').includes('Монгол текст & ? # +'));
  assert.ok(!url.searchParams.has('bcc'));
  assert.equal(s.values.contactName,'Test & User');
  assert.ok(s.status.textContent.includes('энд хэвээр байна'));
});
test('Invalid form cannot compose a draft', () => {
  const s=boot({valid:false}); s.events['form:submit']({preventDefault(){}});
  assert.equal(s.window.location.href,''); assert.equal(s.status.textContent,'');
});

function localeBoot(search = '', saved = '', blocked = false) {
  const source = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('const resources ='));
  const events = {};
  const labels = ['site.name','nav.menu','hero.subtitle','form.notice'].map(key=>({key,textContent:'',getAttribute(){return this.key;}}));
  const buttons = ['mn','en'].map(lang=>({dataset:{changeLang:lang},setAttribute(key,value){this[key]=value;},addEventListener(name,fn){this[name]=fn;}}));
  const groups = ['mn','en'].map(lang=>({dataset:{expoLanguage:lang},hidden:false}));
  const document = {documentElement:{lang:''},querySelectorAll:selector=>({'[data-i18n]':labels,'[data-change-lang]':buttons,'[data-expo-language]':groups})[selector],addEventListener:(name,fn)=>events[name]=fn};
  const localStorage = {getItem:()=>{if(blocked)throw Error('blocked');return saved;},setItem:()=>{if(blocked)throw Error('blocked');}};
  const window = {addEventListener:(name,fn)=>events[name]=fn};
  const history = {replaceState:(_,__,url)=>history.url=url.href};
  runInNewContext(source,{document,window,localStorage,history,URL,URLSearchParams,location:{search,href:'https://ochircenter.org/'+search}});
  events.DOMContentLoaded();
  return {document,labels,buttons,groups,events,history};
}
test('Homepage translations work even if the external i18next CDN is unavailable', () => {
  const s=localeBoot('?lang=en','mn');
  assert.equal(s.document.documentElement.lang,'en');
  assert.equal(s.labels[0].textContent,'Ochir Center');
  assert.deepEqual(s.groups.map(g=>g.hidden),[true,false]);
  s.buttons[0].click();
  assert.equal(s.labels[0].textContent,'Очир төв');
  assert.equal(s.buttons[0]['aria-pressed'],'true');
});
test('Homepage locale fallback and language switching survive blocked storage', () => {
  const s=localeBoot('?lang=invalid','',true);
  assert.equal(s.document.documentElement.lang,'mn');
  s.buttons[1].click();
  assert.equal(s.document.documentElement.lang,'en');
  assert.match(s.history.url,/lang=en/);
});
test('Homepage follows valid cross-tab language changes without accepting unsupported values', () => {
  const s=localeBoot();
  s.events.storage({key:'siteLang',newValue:'en'});
  assert.equal(s.document.documentElement.lang,'en');
  s.events.storage({key:'siteLang',newValue:'invalid'});
  assert.equal(s.document.documentElement.lang,'en');
});
