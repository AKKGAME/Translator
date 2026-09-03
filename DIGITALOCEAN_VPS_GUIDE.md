# Ubuntu VPS (DigitalOcean) ပေါ်တွင် 1-Click တင်နည်း လမ်းညွှန်

ဤလမ်းညွှန်သည် **AnimeGabar AI Subtitle Translator** ကို DigitalOcean (သို့မဟုတ် မည်သည့် Ubuntu VPS တွင်မဆို) အလွယ်ကူဆုံးနှင့် အမြန်ဆုံး Install ပြုလုပ်နိုင်ရန် ရေးသားထားသော လမ်းညွှန်ဖြစ်ပါသည်။

ပရောဂျက်ထဲတွင် **အလိုအလျောက် တပ်ဆင်ပေးမည့် Script (`install.sh`)** ကို ပြုလုပ်ပေးထားသောကြောင့် Command ၂ ကြောင်း ရိုက်နှိပ်ရုံဖြင့် အားလုံး အလိုအလျောက် ပြီးစီးသွားပါမည်။

---

## အဆင့် (၁) - DigitalOcean Droplet ဖန်တီးခြင်း

1. [DigitalOcean](https://cloud.digitalocean.com/) သို့ Login ဝင်ပါ။
2. **Create** ➔ **Droplets** ကို နှိပ်ပါ။
3. ရွေးချယ်ရမည့် အချက်များ:
   * **Distribution:** `Ubuntu 24.04 LTS` (သို့မဟုတ် `22.04 LTS`)
   * **Plan:** `Basic` ➔ `Regular` ($4 သို့မဟုတ် $6/month ပလန်ဖြင့် လုံလောက်စွာ သုံးနိုင်ပါသည်)
   * **Datacenter Region:** Singapore (စင်ကာပူ - မြန်မာနိုင်ငံအတွက် အမြန်ဆုံး ဖြစ်ပါသည်)
   * **Authentication:** Password (စကားဝှက်) သတ်မှတ်ပါ
4. **Create Droplet** ကို နှိပ်ပြီး ခဏစောင့်ပါ။ Droplet ရလာပါက **IPv4 Address** (ဥပမာ `159.223.xx.xx`) ကို ရရှိပါမည်။

---

## အဆင့် (၂) - Terminal တွင် 1-Click Auto Install ပြုလုပ်ခြင်း (အလွယ်ကူဆုံးနည်း)

မိမိကွန်ပျူတာ၏ Terminal သို့မဟုတ် DigitalOcean ၏ **Console** ခလုတ်ကို နှိပ်၍ အောက်ပါ command များအတိုင်း အဆင့်ဆင့် ရိုက်ထည့်ပါ:

### ၁။ Code ကို VPS ထဲသို့ ဒေါင်းလုဒ်ရယူပါ:
*(GitHub သို့မဟုတ် ZIP ဖြင့် တင်ထားသော Link ဖြစ်စေ၊ GitHub Repo မှဖြစ်စေ)*
```bash
git clone <မိမိ၏-github-repo-url> animegabar
cd animegabar
```
*(သို့မဟုတ် ZIP ဖိုင် Upload တင်ထားပါက unzip လုပ်ပြီး folder ထဲသို့ `cd` ဝင်ပါ)*

### ၂။ 1-Click Install Script ကို Run ပါ:
```bash
sudo bash install.sh
```

**Auto-Installer က အောက်ပါတို့ကို အလိုအလျောက် လုပ်ဆောင်ပေးသွားပါမည်:**
* Ubuntu System Update ပြုလုပ်ပေးခြင်း
* **Node.js 22 LTS**, Git, Nginx, Certbot (SSL) တို့ကို သွင်းပေးခြင်း
* **PM2 Process Manager** ဖြင့် Background တွင် ၂၄ နာရီ မပိတ်အောင် Run ပေးခြင်း
* VPS Reboot ကျလျှင်ပင် အလိုအလျောက် ပြန်ပွင့်လာအောင် Auto-Startup စီစဉ်ပေးခြင်း
* **Nginx Reverse Proxy** ကို ချိန်ညှိပေးပြီး Port 80/443 (HTTP/HTTPS) ဖြင့် တိုက်ရိုက် ကြည့်ရှုနိုင်အောင် ပြုလုပ်ပေးခြင်း
* **Domain Name** ထည့်သွင်းပါက Let's Encrypt Free SSL (HTTPS) ကိုပါ တန်းပြီး သွင်းပေးသွားမည် ဖြစ်ပါသည်။

တပ်ဆင်မှု ပြီးဆုံးပါက မိမိ၏ VPS IP (သို့မဟုတ် Domain) ဖြင့် Browser တွင် တန်းဝင်အသုံးပြုနိုင်ပါပြီ!

---

## အဆင့် (၃) - နောက်ပိုင်း Update ပြုလုပ်လိုလျှင် (1-Click Update)

Applet ထဲတွင် Feature အသစ်များ ထည့်သွင်းပြီးပါက VPS ထဲတွင် အောက်ပါ command တစ်ကြောင်းသာ ရိုက်နှိပ်ရုံဖြင့် အလိုအလျောက် Build ပြုလုပ်ပြီး Update ဖြစ်သွားပါမည်:

```bash
bash update.sh
```

---

## အသုံးဝင်သော Command များ

* **App အခြေအနေ စစ်ဆေးရန်:**
  ```bash
  pm2 status
  ```
* **Real-time Logs ကြည့်ရှုရန်:**
  ```bash
  pm2 logs animegabar
  ```
* **App ကို Restart ပြုလုပ်ရန်:**
  ```bash
  pm2 restart animegabar
  ```
* **Server ၏ Persistent Data ဖိုင်များ:**
  ```bash
  ls -la data/
  ```
  *(Keys များ၊ Subtitle ဖိုင်များနှင့် Settings အားလုံးသည် `data/` ဖိုဒါထဲတွင် အမြဲတမ်း လုံခြုံစွာ သိမ်းဆည်းနေပါမည်)*

---

## နည်းလမ်း (၂) - Docker ဖြင့် Run လိုသူများအတွက် (Optional)

အကယ်၍ Docker သုံးလိုပါက အသင့်ပါဝင်သော `docker-compose.yml` ဖြင့် အလွယ်တကူ run နိုင်ပါသည်:

```bash
docker compose up -d --build
```
