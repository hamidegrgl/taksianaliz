# Ankara Taksi Talep ve Kazanç Analizi

Sürücülerin kendi hesaplarıyla giriş yaptığı, araç, yolculuk (gelir) ve gider kayıtlarını bulutta tuttuğu; saat/bölge talep analizi ve ortak trafik akışı verisini gösteren web uygulaması. YBS311 Bilgisayar Ağları dersi projesi.

## Dosyalar

| Dosya | Görevi |
|---|---|
| `index.html` | Ana sayfa: giriş, kayıt, şifremi unuttum, harita butonu |
| `panel.html` | Giriş yapınca açılan uygulama (kazanç, kayıt, araç, yoğunluk, trafik, proje) |
| `harita.html` | Adres aramalı Ankara trafik haritası (TomTom) |
| `style.css` | Tüm sayfaların tek stil dosyası (bilgisayar, tablet, telefon) |
| `js/common.js` | Ortak yardımcılar ve Supabase bağlantısı (oturum cihazda saklanır) |
| `js/auth.js` | Giriş / kayıt / şifre yenileme |
| `js/app.js` | Panel mantığı (önceki index.html içindeki kodla aynı) |
| `js/harita.js` | Harita ve adres arama |
| `config.js` | Supabase ve TomTom anahtarları (**tek doldurulacak yer**) |
| `supabase_schema.sql` | Yeni kurulum için tablolar, güvenlik kuralları |
| `supabase_update.sql` | Şemayı daha önce çalıştırdıysanız, tek seferlik güncelleme (e-posta kaydı) |

## Hangi veritabanı? Neden Supabase (PostgreSQL)?

Tek bir veritabanı yeterli: **Supabase**. Kimlik doğrulama, PostgreSQL ve REST API aynı yerde gelir; ayrıca sunucu yazmadan GitHub Pages gibi statik bir siteden kullanılabilir.

| Ölçüt | Supabase (PostgreSQL) | Firebase (Firestore) |
|---|---|---|
| Veri modeli | İlişkisel: kullanıcı → araç → yolculuk/gider | Doküman tabanlı, ilişkiler elle kurulur |
| Analiz (saat/bölge gruplama, ortalama) | SQL ile doğrudan (`group by`, fonksiyonlar) | Sunucu tarafı toplama sınırlı, çoğu istemcide yapılır |
| Güvenlik | Satır düzeyinde güvenlik (RLS): herkes yalnızca kendi satırı | Güvenlik kuralları var, ama ilişkisel sorgularda kısıtlı |
| Ders konusuna uyum | REST/HTTPS, JWT, istemci-sunucu daha görünür | Eşdeğer, ama arka planı daha soyut |
| Ücretsiz katman | Var (proje 1 hafta kullanılmazsa duraklatılabilir) | Var |

Firebase de çalışırdı; talep analizi toplu sorgular gerektirdiği ve veriler birbirine bağlı olduğu için SQL daha mantıklı. **İkinci bir veritabanı gerekmiyor.** Canlı trafik için ayrı depolama değil, bir dış trafik API'si gerekir (aşağıya bakın).

## Kurulum

1. **supabase.com** → yeni proje oluşturun.
2. **SQL Editor → New query**: `supabase_schema.sql` içeriğini yapıştırıp **Run**.
3. **Project Settings → API**: `Project URL` ve `anon public` anahtarı `config.js` içine yazın. `service_role` anahtarını asla GitHub'a koymayın.
4. **Authentication → URL Configuration**: *Site URL* alanına GitHub Pages adresinizi, *Redirect URLs* listesine `https://kullanici.github.io/repo/index.html` adresini ekleyin (şifre yenileme bağlantısı buraya döner).
   Şemayı daha önce çalıştırdıysanız SQL Editor'de ayrıca `supabase_update.sql` dosyasını çalıştırın.
5. Test sırasında e-posta doğrulamasını kapatabilirsiniz: **Authentication → Providers → Email → Confirm email**. Canlıda açık bırakın.
6. Siteye girip kayıt olun. Sonra yönetici olmak için SQL Editor'de (e-postanızı yazarak):
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'ornek@mail.com');
   ```
7. **GitHub Pages**: Settings → Pages → `main` / `(root)`.

## Veri nasıl korunuyor?

- Her kullanıcı yalnızca kendi araç, yolculuk ve gider satırlarını görür (RLS).
- Kullanıcı kendi rolünü değiştiremez; yalnızca `full_name` güncellenebilir.
- Trafik verisini herkes okur, yalnızca `admin` yazar.
- "Tüm sürücüler" talep verisi anonimdir; bir saat-bölge hücresi en az 3 farklı sürücü içermiyorsa gösterilmez. Az kullanıcıyla test ederken `supabase_schema.sql` içindeki `>= 3` değerini `>= 1` yapın, canlıda geri alın.
- Plaka kişisel veridir. Gerçek sürücülere vermeden önce kısa bir aydınlatma/gizlilik metni eklemeniz gerekir (KVKK).

## Trafik akışı verisi

Site şu an trafik verisini `traffic_snapshots` tablosundan okur; veriyi yönetici elle girer. Canlı trafik için TomTom, HERE veya Google gibi bir trafik API'sine hesap açıp anahtar almanız gerekir. API anahtarı tarayıcıya konmamalı: bir **Supabase Edge Function** zamanlanmış çalışıp API'den okuyarak aynı tabloya yazmalı. Arayüzde değişiklik gerekmez. Bu kısım henüz yazılmadı ve test edilmedi.

## Bilinen sınırlar

- Sahte bir Supabase ile arayüz denendi, gerçek bir Supabase projesine karşı denenmedi. İlk kurulumdan sonra kayıt, giriş ve yolculuk eklemeyi bir kez deneyin.
- Tahmin modeli saat bazlı basit ortalamadır; sonuçlar pilot örneklemdir.
- Trafik yoğunluğu müşteri talebi değildir; talep yalnızca yolculuk kayıtlarından ölçülür.

## Haritaya ek notlar

- Harita `harita.html` sayfasındadır; TomTom anahtarı `config.js` içindeki `TOMTOM_KEY` alanındadır. TomTom panelinden anahtara kendi alan adınızı kısıtlama olarak ekleyin, çünkü tarayıcıdaki anahtar herkese görünür.
- Hesap e-postaları Supabase'in `auth.users` tablosunda ve `profiles.email` alanında saklanır; yalnızca yönetici "Proje hakkında" sekmesinde listeyi görür. E-posta kişisel veridir, aydınlatma metni gerekir (KVKK).
