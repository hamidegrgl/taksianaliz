(function(){
"use strict";
var A=window.App;if(!A||!A.sb)return;
var $=A.$,toast=A.toast,sb=A.sb,mode="in",LAST="ankaraTaksi.sonEposta";
var recovering=/type=recovery/.test(location.hash);

function hata(e){
 var m=((e&&e.message)||"").toLowerCase();
 if(m.indexOf("invalid login")>-1)return "E-posta veya şifre hatalı.";
 if(m.indexOf("not confirmed")>-1)return "E-postanı henüz doğrulamadın. Gelen kutundaki bağlantıya tıkla.";
 if(m.indexOf("already")>-1)return "Bu e-posta zaten kayıtlı. Giriş yapmayı dene.";
 if(m.indexOf("rate limit")>-1||m.indexOf("too many")>-1)return "Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.";
 if(m.indexOf("password")>-1)return "Şifre en az 6 karakter olmalı.";
 return (e&&e.message)||"Bilinmeyen hata.";
}
function git(){location.replace("panel.html")}
function sonEposta(v){try{if(v)localStorage.setItem(LAST,v);else return localStorage.getItem(LAST)}catch(_){}}

var f0=$("#af").elements,le=sonEposta();if(le)f0.email.value=le;

$("#atog").onclick=function(){
 mode=mode==="in"?"up":"in";
 $("#nm").hidden=mode==="in";
 $("#asub").textContent=mode==="in"?"Giriş yap":"Kayıt ol";
 $("#atog").textContent=mode==="in"?"Hesabın yok mu? Kayıt ol":"Zaten hesabın var mı? Giriş yap";
 f0.pw.autocomplete=mode==="in"?"current-password":"new-password";
};

$("#af").onsubmit=async function(e){
 e.preventDefault();var f=e.target.elements,em=f.email.value.trim(),pw=f.pw.value;
 if(mode==="up"){
  var r=await sb.auth.signUp({email:em,password:pw,options:{data:{full_name:f.name.value.trim()}}});
  if(r.error)return toast("Kayıt başarısız: "+hata(r.error),1);
  if(r.data&&r.data.user&&r.data.user.identities&&r.data.user.identities.length===0)return toast("Bu e-posta zaten kayıtlı. Giriş yapmayı dene.",1);
  sonEposta(em);
  if(!r.data.session)toast("Kayıt oluşturuldu. E-postana gelen doğrulama bağlantısına tıkla, sonra giriş yap.");
 }else{
  var g=await sb.auth.signInWithPassword({email:em,password:pw});
  if(g.error)return toast("Giriş başarısız: "+hata(g.error),1);
  sonEposta(em);
 }
};

$("#forgot").onclick=async function(){
 var em=f0.email.value.trim();
 if(!em)return toast("Önce e-posta adresini yaz.",1);
 var r=await sb.auth.resetPasswordForEmail(em,{redirectTo:new URL("index.html",location.href).href});
 if(r.error)return toast("Gönderilemedi: "+hata(r.error),1);
 toast("Şifre yenileme bağlantısı e-postana gönderildi.");
};

$("#rf").onsubmit=async function(e){
 e.preventDefault();
 var r=await sb.auth.updateUser({password:e.target.elements.pw.value});
 if(r.error)return toast("Güncellenemedi: "+hata(r.error),1);
 toast("Şifren güncellendi.");setTimeout(git,800);
};

sb.auth.onAuthStateChange(function(ev){
 if(ev==="PASSWORD_RECOVERY"){$("#auth").hidden=true;$("#rec").hidden=false}
 else if(ev==="SIGNED_IN"&&!recovering)setTimeout(git,0);
});
if(recovering){$("#rec").hidden=false}
else sb.auth.getSession().then(function(r){if(r.data&&r.data.session)git();else $("#auth").hidden=false});
})();
