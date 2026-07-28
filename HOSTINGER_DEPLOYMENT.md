# Hostinger Hosting Deployment Guide (မြန်မာဘာသာ)

ဤ Web App ကို Hostinger (Shared Hosting သို့မဟုတ် Node.js Hosting) တွင် တင်နည်း လမ်းညွှန်ဖြစ်ပါသည်။

---

## နည်းလမ်း (၁) - Hostinger Shared Hosting (Standard Web Hosting / `public_html`) တွင် တင်နည်း (အလွယ်ကူဆုံး)

Hostinger ၏ မူလ Shared Hosting (`public_html`) တွင် Static Single Page App (SPA) အဖြစ် တင်ဆက်အသုံးပြုနိုင်ပါသည်။

### အဆင့် ၁: Build ပြုလုပ်ပါ
ကွန်ပျူတာ၏ Terminal / Command Prompt တွင် အောက်ပါ Command ကို ရိုက်နှိပ်ပါ:
```bash
npm run build
```
Build လုပ်ပြီးပါက `dist` ဟူသော ဖိုဒါတစ်ခု ထွက်လာပါမည်။

### အဆင့် ၂: Hostinger သို့ Upload တင်ပါ
1. Hostinger hPanel သို့ ဝင်ရောက်ပြီး **File Manager** သို့ သွားပါ။
2. `public_html` ဖိုဒါထဲသို့ ဝင်ပါ။
3. `dist` ဖိုဒါထဲတွင် ရှိသော ဖိုင်အားလုံး ( `index.html`, `assets` ဖိုဒါ, `.htaccess` စသည်) ကို `public_html` ထဲသို့ တိုက်ရိုက် Upload တင်ပါ သို့မဟုတ် ZIP ချုံ့၍ Upload တင်ပြီး Unzip ပြုလုပ်ပါ။

> 💡 **မှတ်ချက် (.htaccess ဖိုင်):** `public/.htaccess` ဖိုင်ကို ပရောဂျက်ထဲတွင် ထည့်သွင်းပေးထားပြီး ဖြစ်သောကြောင့် Refresh လုပ်သည့်အခါ Page Not Found (404 Error) မဖြစ်ဘဲ သာယာချောမွေ့စွာ အလုပ်လုပ်ပါမည်။

### အဆင့် ၃: Gemini API Key ထည့်သွင်းခြင်း
Hostinger Static Web Hosting ပေါ်တွင် သုံးပါက Server မပါရှိသောကြောင့် Web App ထဲရှိ **"ဘာသာပြန် ဆက်တင်များ"** တွင် မိမိပိုင် Gemini API Key ကို ထည့်သွင်း၍ ဘာသာပြန်ဆိုနိုင်ပါသည်။

---

## နည်းလမ်း (၂) - Hostinger Node.js Web Application အဖြစ် တင်နည်း

Hostinger VPS သို့မဟုတ် Hostinger Node.js Application feature တွင် Full-Stack Node App အဖြစ် တင်လိုပါက:

### အဆင့် ၁: Configuration
- **Node.js Version:** `18.x` သို့မဟုတ် `20.x` ကို ရွေးပါ။
- **Startup File:** `dist/server.cjs`
- **Build Command:** `npm run build`
- **Environment Variable:** `.env` ဖိုင်တွင် `GEMINI_API_KEY=your_gemini_api_key_here` ဟု ထည့်သွင်းပါ (သို့မဟုတ် hPanel Environment Variables တွင် ထည့်ပါ)။

### အဆင့် ၂: App စတင်ပါ
Hostinger Node Manager တွင် `Start` ကို နှိပ်၍ အက်ပ်ကို စတင်လည်ပတ်နိုင်ပါသည်။

---

## အနှစ်ချုပ်
- **.htaccess ဖိုင်** ပါဝင်ပြီးဖြစ်သဖြင့် Hostinger Single Page App Routing အဆင်သင့်ဖြစ်ပါသည်။
- **Shared Hosting (public_html)** တွင် တင်ပါက `npm run build` လုပ်ထားသော `dist/` ဖိုင်များကို Upload တင်ရုံဖြင့် ချက်ချင်း အသုံးပြုနိုင်ပါသည်။
