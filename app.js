(function(){
"use strict";
var A=window.App;if(!A||!A.sb)return;
var $=A.$,$$=A.$$,esc=A.esc,fmt=A.fmt,iso=A.iso,toast=A.toast,sb=A.sb;
var ZN=["Kızılay","Ulus","Çankaya","Keçiören","Mamak","Yenimahalle","Etimesgut","Sincan","Batıkent","Gölbaşı","AŞTİ","Esenboğa"];
var LV=["","Çok akıcı","Akıcı","Orta","Yoğun","Çok yoğun"];
var today=iso(new Date());
function sum(a,f){return a.reduce(function(s,r){return s+(+f(r)||0)},0)}
function tdate(t){return iso(new Date(t.started_at))}
function thour(t){return new Date(t.started_at).getHours()}
function inP(d){return per==="hepsi"||(per==="gun"?d===today:d.slice(0,7)===today.slice(0,7))}
var me=null,prof=null,V=[],T=[],E=[],per="gun",selH=18,mode="in",cur="panel";

/* ---------- Oturum (giriş sayfasında yapılır; burada yalnızca kontrol) ---------- */
sb.auth.onAuthStateChange(function(ev){if(ev==="SIGNED_OUT")location.replace("index.html")});
$("#out").onclick=async function(){await sb.auth.signOut();location.replace("index.html")};
sb.auth.getSession().then(function(r){var s=r.data&&r.data.session;if(!s){location.replace("index.html");return}setUser(s.user)});

async function setUser(u){
 if(!u){location.replace("index.html");return}
 if(me&&me.id===u.id)return;
 me=u;
 await loadAll();
 $("#app").hidden=false;
 $("#who").textContent=(prof&&prof.full_name||u.email)+(prof&&prof.role==="admin"?" · yönetici":"");
 $("#adm").hidden=!(prof&&prof.role==="admin");
 fillSel();show("panel");
}

/* ---------- Veri yükleme ---------- */
async function loadAll(){
 var r=await Promise.all([
  sb.from("profiles").select("*").eq("id",me.id).maybeSingle(),
  sb.from("vehicles").select("*").order("created_at"),
  sb.from("trips").select("*").order("started_at",{ascending:false}).limit(5000),
  sb.from("expenses").select("*").order("spent_on",{ascending:false}).limit(5000)
 ]);
 r.forEach(function(x){if(x.error)toast("Veri okunamadı: "+x.error.message,1)});
 prof=r[0].data;V=r[1].data||[];T=r[2].data||[];E=r[3].data||[];
}
function fillSel(){
 $$(".zs").forEach(function(s){s.innerHTML=ZN.map(function(z){return "<option>"+z+"</option>"}).join("")});
 $$(".vs").forEach(function(s){s.innerHTML='<option value="">Araç seçilmedi</option>'+V.map(function(v){return '<option value="'+esc(v.id)+'">'+esc(v.plate)+"</option>"}).join("")});
 $("#tf").elements.d.value=today;$("#ef").elements.d.value=today;
}

/* ---------- Sekmeler ---------- */
function show(t){
 cur=t;$$("#tabs button").forEach(function(b){b.setAttribute("aria-selected",b.dataset.t===t)});
 $$(".panel").forEach(function(p){p.classList.toggle("on",p.id===t)});
 if(t==="panel")panel();if(t==="arac")veh();if(t==="yogun")yogun();if(t==="trafik")trafik();if(t==="proje")users();
}
$$("#tabs button").forEach(function(b){b.onclick=function(){show(b.dataset.t)}});
$$("#per button").forEach(function(b){b.onclick=function(){per=b.dataset.p;$$("#per button").forEach(function(x){x.setAttribute("aria-pressed",x===b)});panel()}});

/* ---------- Kazanç paneli ---------- */
function panel(){
 var a=T.filter(function(t){return inP(tdate(t))}),ex=E.filter(function(x){return inP(x.spent_on)});
 var inc=sum(a,function(t){return t.fare}),out=sum(ex,function(x){return x.amount});
 var km=sum(a,function(t){return t.trip_km}),eb=sum(a,function(t){return t.empty_km});
 var k=[["main",fmt(inc-out)+" ₺","Hesaplanan fark"],["",fmt(inc)+" ₺","Tahsilat"],["",fmt(out)+" ₺","Kayıtlı gider"],["",a.length,"Yolculuk"],["",fmt(km,1)+" km","Yolculuk km"],["",km+eb?"%"+fmt(eb/(km+eb)*100):"–","Boş km oranı"]];
 $("#kpis").innerHTML=k.map(function(x){return '<div class="card kpi '+x[0]+'"><b>'+x[1]+"</b><span>"+x[2]+"</span></div>"}).join("");
 var vn=function(id){var v=V.find(function(x){return x.id===id});return v?esc(v.plate):"–"};
 $("#tl").innerHTML=T.length?"<table><thead><tr><th>Tarih</th><th>Saat</th><th>Bölge</th><th>Araç</th><th>Ücret</th><th>km</th><th>Boş km</th><th></th></tr></thead><tbody>"+T.slice(0,15).map(function(t){var d=new Date(t.started_at);return "<tr><td>"+tdate(t)+"</td><td>"+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")+"</td><td>"+esc(t.region)+"</td><td>"+vn(t.vehicle_id)+"</td><td>"+fmt(t.fare)+" ₺</td><td>"+fmt(t.trip_km,1)+"</td><td>"+fmt(t.empty_km,1)+'</td><td><button data-del="trips" data-id="'+esc(t.id)+'">Sil</button></td></tr>'}).join("")+"</tbody></table>":'<p class="empty">Henüz yolculuk yok. “Kayıt ekle” sekmesinden ilkini gir.</p>';
 $("#el").innerHTML=E.length?"<table><thead><tr><th>Tarih</th><th>Tür</th><th>Araç</th><th>Tutar</th><th>Not</th><th></th></tr></thead><tbody>"+E.slice(0,15).map(function(x){return "<tr><td>"+esc(x.spent_on)+"</td><td>"+esc(x.category)+"</td><td>"+vn(x.vehicle_id)+"</td><td>"+fmt(x.amount)+" ₺</td><td>"+esc(x.note)+'</td><td><button data-del="expenses" data-id="'+esc(x.id)+'">Sil</button></td></tr>'}).join("")+"</tbody></table>":'<p class="empty">Henüz gider yok.</p>';
}
document.addEventListener("click",async function(e){
 var b=e.target.closest("button[data-del]");if(!b)return;
 if(!confirm("Bu kayıt silinsin mi?"))return;
 var r=await sb.from(b.dataset.del).delete().eq("id",b.dataset.id);
 if(r.error)return toast("Silinemedi: "+r.error.message,1);
 if(b.dataset.del==="trips")T=T.filter(function(x){return x.id!==b.dataset.id});
 else if(b.dataset.del==="expenses")E=E.filter(function(x){return x.id!==b.dataset.id});
 else{V=V.filter(function(x){return x.id!==b.dataset.id});T.forEach(function(t){if(t.vehicle_id===b.dataset.id)t.vehicle_id=null});E.forEach(function(t){if(t.vehicle_id===b.dataset.id)t.vehicle_id=null});fillSel()}
 show(cur);toast("Kayıt silindi.");
});

/* ---------- Kayıt formları ---------- */
$("#tf").onsubmit=async function(e){
 e.preventDefault();var f=e.target.elements;
 var row={started_at:new Date(f.d.value+"T"+f.t.value).toISOString(),region:f.z.value,vehicle_id:f.v.value||null,fare:+f.f.value,trip_km:+f.k.value,empty_km:+f.b.value||0};
 var r=await sb.from("trips").insert(row).select().single();
 if(r.error)return toast("Kaydedilemedi: "+r.error.message,1);
 T.unshift(r.data);T.sort(function(a,b){return b.started_at.localeCompare(a.started_at)});
 f.f.value="";f.k.value="";f.b.value=0;toast("Yolculuk kaydedildi.");
};
$("#ef").onsubmit=async function(e){
 e.preventDefault();var f=e.target.elements;
 var r=await sb.from("expenses").insert({spent_on:f.d.value,category:f.c.value,vehicle_id:f.v.value||null,amount:+f.a.value,note:f.n.value.trim()||null}).select().single();
 if(r.error)return toast("Kaydedilemedi: "+r.error.message,1);
 E.unshift(r.data);E.sort(function(a,b){return b.spent_on.localeCompare(a.spent_on)});
 f.a.value="";f.n.value="";toast("Gider kaydedildi.");
};
$("#vf").onsubmit=async function(e){
 e.preventDefault();var f=e.target.elements;
 var r=await sb.from("vehicles").insert({plate:f.p.value.trim().toUpperCase(),brand:f.b.value.trim()||null,model:f.m.value.trim()||null,year:f.y.value?+f.y.value:null,fuel_type:f.u.value}).select().single();
 if(r.error)return toast(r.error.code==="23505"?"Bu plaka zaten kayıtlı.":"Kaydedilemedi: "+r.error.message,1);
 V.push(r.data);fillSel();e.target.reset();veh();toast("Araç eklendi.");
};
function veh(){
 $("#vl").innerHTML=V.length?"<table><thead><tr><th>Plaka</th><th>Marka</th><th>Model</th><th>Yıl</th><th>Yakıt</th><th></th></tr></thead><tbody>"+V.map(function(v){return "<tr><td>"+esc(v.plate)+"</td><td>"+esc(v.brand)+"</td><td>"+esc(v.model)+"</td><td>"+esc(v.year)+"</td><td>"+esc(v.fuel_type)+'</td><td><button data-del="vehicles" data-id="'+esc(v.id)+'">Sil</button></td></tr>'}).join("")+"</tbody></table>":'<p class="empty">Henüz araç eklemedin.</p>';
}

/* ---------- Yoğunluk ve tahmin ---------- */
function mdl(){
 var days=[],c={};
 T.forEach(function(t){var d=tdate(t);if(!c[d]){c[d]=new Array(24).fill(0);days.push(d)}c[d][thour(t)]++});
 if(days.length<5)return null;
 function hm(ex){var o=days.filter(function(x){return x!==ex}),a=[];for(var h=0;h<24;h++)a.push(o.reduce(function(s,x){return s+c[x][h]},0)/o.length);return a}
 var eM=0,eB=0,n=0;
 days.forEach(function(d){var m=hm(d),g=m.reduce(function(a,b){return a+b},0)/24;for(var h=0;h<24;h++){eM+=Math.abs(c[d][h]-m[h]);eB+=Math.abs(c[d][h]-g);n++}});
 return{m:hm(null),mae:eM/n,base:eB/n,days:days.length};
}
function hbars(H){var mx=Math.max.apply(null,H)||1;return '<div class="hrs">'+H.map(function(v,i){return '<div class="'+(v===mx&&v>0?"pk":"")+'" style="height:'+Math.max(2,v/mx*100)+'%" title="'+i+":00 · "+v+'"></div>'}).join("")+'</div><div class="hl">'+H.map(function(_,i){return "<span>"+(i%3===0?i:"")+"</span>"}).join("")+"</div>"}
function rbars(Z){var k=Object.keys(Z).sort(function(a,b){return Z[b]-Z[a]}),m=Z[k[0]]||1;return k.map(function(z){return '<div class="bar"><span>'+esc(z)+'</span><i style="width:'+Z[z]/m*100+'%"></i><b>'+Z[z]+"</b></div>"}).join("")||'<p class="empty">Veri yok.</p>'}
async function yogun(){
 var el=$("#ygn");
 var H=new Array(24).fill(0),Z={};T.forEach(function(t){H[thour(t)]++;Z[t.region]=(Z[t.region]||0)+1});
 var h='<div class="grid two"><div class="card"><h2>Benim yolculuklarım: saate göre</h2>'+(T.length?hbars(H):'<p class="empty">Analiz için kayıt ekle.</p>')+'</div><div class="card"><h2>Benim yolculuklarım: bölgeye göre</h2>'+rbars(Z)+"</div></div>";
 var M=mdl();
 h+='<div class="card"><h2>Basit talep tahmini (kendi kayıtlarım)</h2>';
 if(!M)h+='<p class="empty">Tahmin için en az 5 farklı güne ait kayıt gerekir.</p>';
 else{
  var top={};T.filter(function(t){return thour(t)===selH}).forEach(function(t){top[t.region]=(top[t.region]||0)+1});
  var tz=Object.keys(top).sort(function(a,b){return top[b]-top[a]})[0];
  h+='<div class="row"><label style="flex-direction:row;align-items:center;gap:8px">Saat <select id="hs">'+M.m.map(function(_,i){return "<option value="+i+(i===selH?" selected":"")+">"+String(i).padStart(2,"0")+":00</option>"}).join("")+"</select></label></div>";
  h+="<p><b>"+String(selH).padStart(2,"0")+":00</b> saatinde günlük ortalama <b>"+fmt(M.m[selH],1)+"</b> yolculuk bekleniyor."+(tz?" Bu saatte en çok başlangıç yapılan bölge: <b>"+esc(tz)+"</b>.":"")+"</p>";
  h+="<p>Her gün sırayla dışarıda bırakılıp tahmin edildi ("+M.days+" gün). Model MAE: <b>"+fmt(M.mae,2)+"</b>, basit ortalama MAE: <b>"+fmt(M.base,2)+"</b>. "+(M.mae<M.base?"Saat bilgisi basit ortalamadan daha iyi tahmin veriyor.":"Saat bilgisi bu veride basit ortalamadan daha iyi tahmin vermiyor.")+"</p>";
 }
 h+='</div><div class="card"><h2>Tüm sürücüler: anonim toplu talep</h2><div id="cw"><p class="empty">Yükleniyor…</p></div></div><p class="note">Sonuçlar pilot örneklemdir ve Ankara genelini temsil etmez. Trafik yoğunluğu müşteri talebi değildir; talep yalnızca yolculuk kayıtlarından ölçülür.</p>';
 el.innerHTML=h;
 var hs=$("#hs");if(hs)hs.onchange=function(){selH=+hs.value;yogun()};
 var r=await sb.rpc("demand_by_hour_region");
 var box=$("#cw");if(!box)return;
 if(r.error){box.innerHTML='<p class="empty">Toplu veri okunamadı: '+esc(r.error.message)+"</p>";return}
 if(!r.data.length){box.innerHTML='<p class="empty">Henüz yeterli veri yok. Bir saat-bölge hücresinin görünmesi için en az 3 farklı sürücünün kaydı gerekir.</p>';return}
 var H2=new Array(24).fill(0),Z2={};
 r.data.forEach(function(x){H2[x.hour]+=+x.trip_count;if(x.hour===selH)Z2[x.region]=(Z2[x.region]||0)+ +x.trip_count});
 box.innerHTML=hbars(H2)+"<h3 style=\"margin-top:12px\">"+String(selH).padStart(2,"0")+":00 saatinde en yoğun bölgeler</h3>"+rbars(Z2);
}

/* ---------- Trafik akışı (ortak veri) ---------- */
async function trafik(){
 var box=$("#trl");box.innerHTML='<p class="empty">Yükleniyor…</p>';
 var r=await sb.from("traffic_snapshots").select("*").order("observed_at",{ascending:false}).limit(300);
 if(r.error){box.innerHTML='<p class="empty">Okunamadı: '+esc(r.error.message)+"</p>";return}
 var seen={},L=[];r.data.forEach(function(x){if(!seen[x.region]){seen[x.region]=1;L.push(x)}});
 box.innerHTML=L.length?'<div class="tbl"><table><thead><tr><th>Bölge</th><th>Durum</th><th>Ort. hız</th><th>Kaynak</th><th>Güncelleme</th></tr></thead><tbody>'+L.map(function(x){return "<tr><td>"+esc(x.region)+'</td><td><span class="pill">'+x.level+" · "+LV[x.level]+"</span></td><td>"+(x.avg_speed_kmh==null?"–":fmt(x.avg_speed_kmh,1)+" km/sa")+"</td><td>"+esc(x.source)+"</td><td>"+new Date(x.observed_at).toLocaleString("tr-TR",{dateStyle:"short",timeStyle:"short"})+"</td></tr>"}).join("")+"</tbody></table></div>":'<p class="empty">Henüz trafik verisi yayınlanmadı. Yönetici hesabı veri girdiğinde burada görünür.</p>';
}
$("#xf").onsubmit=async function(e){
 e.preventDefault();var f=e.target.elements;
 var r=await sb.from("traffic_snapshots").insert({region:f.z.value,level:+f.l.value,avg_speed_kmh:f.s.value?+f.s.value:null,source:f.r.value.trim()||"Elle girildi"});
 if(r.error)return toast("Yayınlanamadı: "+r.error.message,1);
 f.s.value="";toast("Trafik verisi yayınlandı.");trafik();
};

/* ---------- Kayıtlı kullanıcılar (yalnızca yönetici) ---------- */
async function users(){
 var box=$("#usr");if(!box)return;
 if(!(prof&&prof.role==="admin")){box.hidden=true;return}
 box.hidden=false;var el=$("#usl");el.innerHTML='<p class="empty">Yükleniyor…</p>';
 var r=await sb.from("profiles").select("full_name,email,role,created_at").order("created_at",{ascending:false});
 if(r.error){el.innerHTML='<p class="empty">Okunamadı: '+esc(r.error.message)+" (supabase_update.sql çalıştırıldı mı?)</p>";return}
 el.innerHTML=r.data.length?'<div class="tbl"><table><thead><tr><th>Ad soyad</th><th>E-posta</th><th>Rol</th><th>Kayıt tarihi</th></tr></thead><tbody>'+r.data.map(function(x){return "<tr><td>"+esc(x.full_name)+"</td><td>"+esc(x.email)+"</td><td>"+esc(x.role)+"</td><td>"+new Date(x.created_at).toLocaleDateString("tr-TR")+"</td></tr>"}).join("")+"</tbody></table></div>":'<p class="empty">Kayıt yok.</p>';
}
})();
