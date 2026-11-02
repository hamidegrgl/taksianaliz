(function(){
"use strict";
var C=window.APP_CONFIG||{};
var $=function(s){return document.querySelector(s)},$$=function(s){return document.querySelectorAll(s)};
function esc(s){var d=document.createElement("div");d.textContent=s==null?"":s;return d.innerHTML}
function fmt(x,d){return Number(x||0).toLocaleString("tr-TR",{maximumFractionDigits:d||0})}
function iso(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function toast(m,bad){var e=$("#toast");e.textContent=m;e.className=bad?"bad":"";e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(function(){e.hidden=true},5000)}
var sb=null;
if(C.SUPABASE_URL&&C.SUPABASE_ANON_KEY&&window.supabase){
 // Oturum tarayıcıda saklanır ve otomatik yenilenir: sonraki girişlerde tekrar şifre gerekmez.
 sb=window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
}else{
 var s=$("#setup");
 if(s){s.hidden=false;if(C.SUPABASE_URL&&!window.supabase)s.querySelector("p").textContent="Supabase kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edin."}
}
window.App={C:C,$:$,$$:$$,esc:esc,fmt:fmt,iso:iso,toast:toast,sb:sb};
})();
