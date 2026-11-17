

## 📋 Umumiy tartib

| # | Qadam | Natija |
|---|-------|--------|
| 1 | VPS tayyorlash (Python, Docker, nginx) | Asosiy dasturlar o'rnatildi |
| 2 | Kodni olish + virtual muhit | Loyiha serverda |
| 3 | `.env` sozlash (kalit, domen) | Xavfsiz sozlamalar |
| 4 | Migratsiya + static yig'ish | Baza va fayllar tayyor |
| 5 | Docker image qurish | Kod ishlaydigan konteyner |
| 6 | systemd xizmatlari | **Avtomatik ishga tushirish** ✅ |
| 7 | nginx + SSL (certbot) | https:// ishlaydi |
| 8 | Sinov | Sayt ochiladi |

---

## 1. VPS tayyorlash

SSH orqali serverga kiramiz (`root` sifatida):

```bash
apt update && apt upgrade -y

# Kerakli paketlar
apt install -y python3 python3-venv python3-pip git nginx curl ufw

# Docker — kod bajaruvchi konteyner uchun
apt install -y docker.io
systemctl enable --now docker
```

**Firewall:**

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

> 8765 port (queue_server) **ochilmaydi** — u faqat `127.0.0.1` da ishlaydi,
> tashqaridan kirish mumkin emas.

---

## 2. Kodni olish

```bash
# Foydalanuvchi yaratamiz (ismi bo'yicha yo'l: /home/sputnik/loyha)
adduser sputnik
usermod -aG docker sputnik      # Docker ishlatish uchun
usermod -aG www-data sputnik    # nginx static fayllarni o'qiydi

# Kodni ko'chiramiz
cd /home/sputnik
git clone https://github.com/<sizning-reponingiz>.git loyha
cd loyha

# Virtual muhit
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
```

**Windows'dagi `muhit/` papkani serverga ko'chirmang** — u Linux uchun ishlamaydi.
Serverda `venv/` yangidan yaratiladi.

---

## 3. `.env` sozlash

```bash
cd /home/sputnik/loyha
cp .env.example .env
nano .env
```

**Muhim qiymatlar:**

```dotenv
DEBUG=false

# Xavfsiz kalit yaratamiz (faqat harf/raqam/-/_ bo'ladi):
#   python3 -c "import secrets; print(secrets.token_urlsafe(50))"
#
# DIQQAT: Django'ning get_random_secret_key() funksiyasini ISHLATMANG —
# u !@#$%^* belgilarini beradi, systemd esa EnvironmentFile da
# $ va % ni kengaytirib yuboradi (kalit buziladi). token_urlsafe esa
# faqat A-Za-z0-9-_ beradi — hamma joyda bir xil o'qiladi.
SECRET_KEY="SHU_YERNI_YANGI_KALIT_BILAN_ALMASHTIRING"

# Aniq domeningiz ( "*" taqiqlanadi! )
ALLOWED_HOSTS=sputnik.uz,www.sputnik.uz

# Avval false qoldiring (7-bosqichdan keyin true qiling)
SECURE_SSL=false

TIME_ZONE=Asia/Tashkent
CODE_RUNNER_BASE_URL=http://127.0.0.1:8765
LOG_LEVEL=INFO
```

Kalit yaratish:

```bash
./venv/bin/python -c "import secrets; print(secrets.token_urlsafe(50))"
```

> ⚠️ `DEBUG=false` bo'lsa, `SECRET_KEY` `django-insecure-` bilan boshlansa yoki
> `ALLOWED_HOSTS=*` bo'lsa — Django **xato beradi va ishga tushmaydi**.
> Bu qasddan qilingan himoya.

---

## 4. Migratsiya + static

```bash
cd /home/sputnik/loyha

# Baza yaratiladi (SQLite — qo'shimcha o'rnatish kerak emas)
./venv/bin/python manage.py migrate

# Admin yaratish
./venv/bin/python manage.py createsuperuser

# Static fayllarni yig'ish (nginx shu papkadan beradi)
./venv/bin/python manage.py collectstatic --noinput
```

---

## 5. Kod bajaruvchi (Docker image)

`queue_server` Python kodini **Docker konteynerida** izolyatsiya qilingan holda
bajaradi. Avval rasm (image) quramiz:

```bash
docker build -t sputnik-python:3.12 /home/sputnik/loyha/code_runner
docker images | grep sputnik     # rasm yaratilganini tekshiramiz
```

Tekshiruv — konteyner qo'lda ishga tushsin:

```bash
docker run --rm --network none --memory=128m sputnik-python:3.12 python -c "print('ok')"
```

`ok` chiqsa — tayyor.

---

## 6. ⚡ Avtomatik ishga tushirish (systemd)

Ikki xizmatni avtomatik boshlaymiz: **Django** va **kod bajaruvchi**.

```bash
cd /home/sputnik/loyha

# 6.1 Django (gunicorn)
sudo cp deploy/sputnik-django.service /etc/systemd/system/

# 6.2 Kod bajaruvchi (queue_server)
sudo cp deploy/sputnik-queue.service /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now sputnik-django
sudo systemctl enable --now sputnik-queue
```

**Tekshirish:**

```bash
systemctl status sputnik-django --no-pager
systemctl status sputnik-queue  --no-pager
```

Ikkalasi ham **active (running)** bo'lishi kerak.

**Loglarni ko'rish:**

```bash
journalctl -u sputnik-django -f     # Django
journalctl -u sputnik-queue  -f     # Kod bajaruvchi
```

**Qayta ishga tushirish** (kod o'zgarganda):

```bash
sudo systemctl restart sputnik-django
sudo systemctl restart sputnik-queue
```

> ✅ Endi server **qayta yoqilganda** ikkala xizmat o'z-o'zidan boshlanadi —
> qo'lda hech narsa qilish shart emas.

**Kod bajaruvchi ishlashini tekshirish:**

```bash
curl http://127.0.0.1:8765/health
# {"status": "ok", "workers": 3, ...}
```

---

## 7. nginx + SSL

### 7.1 nginx sozlash

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/sputnik

# Yo'llarni o'zingizning loyiha manzilingizga moslang (3 ta joy):
sudo nano /etc/nginx/sites-available/sputnik
#   alias /home/sputnik/loyha/staticfiles/;
#   alias /home/sputnik/loyha/media/;
#   server_name sputnik.uz www.sputnik.uz;

sudo ln -sf /etc/nginx/sites-available/sputnik /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t            # Syntax to'g'rimi?
sudo systemctl reload nginx
```

### 7.2 SSL (https) o'rnatish

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d sputnik.uz -d www.sputnik.uz
```

Certbot o'zi `server_name` ni to'g'rilaydi va `redirect` qo'shadi.
**Keyin** Django'da SSL'ni yoqamiz:

```bash
cd /home/sputnik/loyha
nano .env
# SECURE_SSL=false  ->  SECURE_SSL=true
sudo systemctl restart sputnik-django
```

> ⚠️ `SECURE_SSL=true` ni **faqat SSL ishga tushgandan keyin** qo'ying,
> aks holda sayt ochilmaydi (cheksiz redirect).

---

## 8. ✅ Yakuniy sinov

| Tekshiruv | Buyruq / natija |
|-----------|-----------------|
| Sayt ochiladi | `https://sputnik.uz/` → 200 |
| Admin | `https://sputnik.uz/admin/` → kirish sahifasi |
| Kod bajarish | `curl http://127.0.0.1:8765/health` → `"status": "ok"` |
| Static | `https://sputnik.uz/static/main/Alert.js` → 200 |
| Media (PDF) | `https://sputnik.uz/media/...` → 200 |
| Xizmatlar | `systemctl is-active sputnik-django sputnik-queue` → active active |

Django xatolarini ko'rish:

```bash
journalctl -u sputnik-django -n 100 --no-pager
```

---

## 🔄 Yangilanish (kod o'zgarganda)

```bash
cd /home/sputnik/loyha
git pull
./venv/bin/pip install -r requirements.txt
./venv/bin/python manage.py migrate
./venv/bin/python manage.py collectstatic --noinput
sudo systemctl restart sputnik-django
sudo systemctl restart sputnik-queue
```

---

## 💾 SQLite backup

MySQL/PostgreSQL'dan farqli o'laroq, SQLite — **bitta fayl**.
Uni muntazam nusxalash shart:

```bash
# Qo'lda
cp /home/sputnik/loyha/db.sqlite3 /backup/db-$(date +%F).sqlite3

# Cron — har kuni 03:00 da (crontab -e)
0 3 * * * cp /home/sputnik/loyha/db.sqlite3 /backup/db-$(date +\%F).sqlite3
```

**Muhim:** `media/` papkasi (yuklangan PDF, preview) ham backup'ga kiradi:

```bash
cp -r /home/sputnik/loyha/media /backup/media-$(date +%F)
```

---

## ❗ Tez-tez uchraydigan muammolar

| Muammo | Sabab | Yechim |
|--------|-------|--------|
| **Cheksiz redirect** | `SECURE_SSL=true`, lekin nginx `X-Forwarded-Proto` yubormayapti | `nginx.conf` da `proxy_set_header X-Forwarded-Proto $scheme;` borligini tekshiring |
| **502 Bad Gateway** | gunicorn ishlamayapti | `systemctl status sputnik-django` · `journalctl -u sputnik-django -f` |
| **Kod bajarilmaydi** | queue_server yoki Docker image yo'q | `systemctl status sputnik-queue` · `docker images \| grep sputnik` |
| **400 Bad Request** | `ALLOWED_HOSTS` da domen yo'q | `.env` ni tahrirlang → `systemctl restart sputnik-django` |
| **Static topilmadi (404)** | `collectstatic` bajarilmagan | `./venv/bin/python manage.py collectstatic --noinput` |
| **Media topilmadi (404)** | nginx `alias` yo'li noto'g'ri | `nginx.conf` dagi `alias` ni tekshiring |
| **SECRET_KEY xatosi** | `.env` da kalit `django-insecure-` bilan | Yangi kalit yarating (3-bosqich) |
| **Docker ruxsati yo'q** | foydalanuvchi docker guruhida emas | `usermod -aG docker sputnik` → qayta login |

---

## 📁 Serverdagi tuzilish

```
/home/sputnik/loyha/
├── venv/                  ← virtual muhit (serverda yaratiladi)
├── .env                   ← sozlamalar (git'ga TUSHMAYDI)
├── db.sqlite3             ← baza (git'ga TUSHMAYDI)
├── media/                 ← yuklangan PDF, preview (git'ga TUSHMAYDI)
├── staticfiles/           ← collectstatic natijasi
├── gunicorn.conf.py       ← gunicorn sozlamalari
├── config/                ← Django loyihasi
├── main/                  ← asosiy ilova
├── code_runner/           ← kod bajaruvchi (queue_server.py)
└── deploy/                ← nginx + systemd fayllari

/etc/nginx/sites-available/sputnik
/etc/systemd/system/sputnik-django.service    ← avtomatik ishga tushadi
/etc/systemd/system/sputnik-queue.service     ← avtomatik ishga tushadi
```

---

## 🛡️ Xavfsizlik qoidalari

1. **`.env` hech qachon git'ga tushmasin** — `.gitignore` da allaqachon bor.
2. **`db.sqlite3` va `media/`** ham git'ga tushmaydi (mahalliy nusxa sifatida).
3. **`DEBUG=false`** production'da — aks holda kod va kalit ochiq ko'rinadi.
4. **Kalitni** hech kimga bermang, `git log` ga yozmang.
5. Serverda **`ufw`** yoniq bo'lsin — faqat 22, 80, 443 portlar ochiq.
