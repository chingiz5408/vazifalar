const modules=[
  {
    title:'Dasturlash asoslari va Python',
    description:'Ma’lumotlar, funksiyalar, xatolar, OOP hamda Git va GitHub bilan ishlash',
    topics:[
      {
        title:'Algoritm turlari va dasturlashga kirish',
        tasks:[
          {title:'Maktabga tayyorlanish',type:'Ketma-ketlikni tartiblash',ordering:'maktabga-tayyorlanish',description:'Maktabga tayyorlanish qadamlarini to‘g‘ri tartibga keltiring.'},
          {title:'Choy tayyorlash algoritmi',type:'Algoritmlash',algorithm:true,description:'Choy tayyorlash bosqichlarini tartib bilan joylashtiring va jarayonni blok-sxema ko‘rinishida tuzing.'},
          {title:'Algoritm turini aniqlash',type:'Javob kiritish',answerForm:'algoritm-turlari',description:'Har bir vaziyat uchun chiziqli, tarmoqlanuvchi yoki takrorlanuvchi algoritm turini yozing.'},
          {title:'Algoritm asoslari testi',type:'Test',test:'algoritm-asoslari',description:'Algoritm tushunchasi va uning turlariga oid variantli savollarga javob bering.'},
          {title:'Birinchi Python dasturi',type:'Python amaliyoti',description:'Ekranga “Salom, dunyo!” matnini chiqaradigan Python dasturini yozing.'},
          {title:'Ikki son yig‘indisi',type:'Kod yozish',codeTask:'ikki-son-yigindisi',description:'Ikki butun sonni o‘qib, ularning yig‘indisini chiqaradigan dastur yozing.'}
        ]
      },
      {
        title:'O‘zgaruvchilar va ma’lumot turlari',
        tasks:[
          {title:'Qiymatlarni o‘zgaruvchiga saqlash',type:'Python amaliyoti',description:'Ism, yosh va shahar qiymatlarini o‘zgaruvchilarga saqlab, ularni ekranga chiqaring.'},
          {title:'Yoshni hisoblash algoritmi',type:'Algoritmlash',algorithm:true,description:'Tug‘ilgan yilni kiritib, taxminiy yoshni hisoblaydigan algoritmni bloklar bilan tuzing.'}
        ]
      },
      {
        title:'Shart operatorlari',
        tasks:[
          {title:'Son musbatmi yoki manfiymi?',type:'Algoritmlash',algorithm:true,description:'Sonni kiritib, uning musbat, manfiy yoki nol ekanini aniqlaydigan algoritm yarating.'},
          {title:'Bahoni aniqlash',type:'Python amaliyoti',description:'Ballga qarab o‘quvchining bahosini shart operatorlari yordamida aniqlang.'}
        ]
      },
      {
        title:'Sikllar va takrorlash',
        tasks:[
          {title:'1 dan N gacha yig‘indi',type:'Algoritmlash',algorithm:true,description:'N sonigacha bo‘lgan natural sonlar yig‘indisini takrorlash orqali toping.'},
          {title:'Ko‘paytirish jadvali',type:'Python amaliyoti',description:'Kiritilgan son uchun 1 dan 10 gacha ko‘paytirish jadvalini chiqaring.'}
        ]
      }
    ]
  },
  {
    title:'Diskret matematika',
    description:'Mantiq, to‘plamlar, sanoq sistemalari, modul arifmetikasi, kombinatorika va rekursiya',
    topics:[
      {title:'Mantiqiy amallar va rostlik jadvallari',tasks:[
        {title:'Mantiqiy ifodaning qiymati',type:'Nazariy savol',description:'VA, YOKI va EMAS amallari uchun rostlik jadvalini tuzing.'},
        {title:'Rostlik jadvalini qurish algoritmi',type:'Algoritmlash',algorithm:true,description:'Ikki mantiqiy qiymat uchun VA amalining natijasini aniqlaydigan blok-sxema tuzing.'}
      ]},
      {title:'To‘plamlar va ular ustida amallar',tasks:[
        {title:'To‘plamlar kesishmasi',type:'Mantiqiy masala',description:'Ikki to‘plamning umumiy elementlarini toping va natijani izohlang.'},
        {title:'To‘plam elementlarini sanash',type:'Algoritmlash',algorithm:true,description:'To‘plamdagi elementlar sonini sanaydigan sodda algoritm tuzing.'}
      ]},
      {title:'Kombinatorika va sanash usullari',tasks:[
        {title:'Parol variantlari soni',type:'Matematik masala',description:'Berilgan belgilar to‘plamidan tuzilishi mumkin bo‘lgan parollar sonini hisoblang.'},
        {title:'Variantlarni sanash',type:'Algoritmlash',algorithm:true,description:'Tanlovlar soniga qarab barcha mumkin bo‘lgan variantlar miqdorini hisoblang.'}
      ]}
    ]
  },
  {
    title:'Algoritmlar va ma’lumotlar tuzilmalari',
    description:'Qidiruv va saralash, murakkablik, ma’lumotlar tuzilmalari va ma’lumotlar bazasi asoslari',
    topics:[
      {title:'Qidirish va saralash algoritmlari',tasks:[
        {title:'Ro‘yxatdan eng katta sonni topish',type:'Algoritmlash',algorithm:true,description:'Sonlar ro‘yxatini ko‘rib chiqib, eng katta qiymatni topadigan algoritm tuzing.'},
        {title:'Saralash usullarini taqqoslash',type:'Nazariy savol',description:'Tanlash orqali saralash va pufakchali saralash usullarining farqini tushuntiring.'}
      ]},
      {title:'Ro‘yxatlar, stek va navbat',tasks:[
        {title:'Navbatdagi birinchi element',type:'Algoritmlash',algorithm:true,description:'Navbatga element qo‘shish va birinchi elementni olish jarayonini ifodalang.'},
        {title:'Stek amallari',type:'Kod tahlili',description:'Stekka element qo‘shish va olish amallaridan keyingi stek holatini aniqlang.'}
      ]},
      {title:'Rekursiya va murakkablikka kirish',tasks:[
        {title:'Faktorialni topish',type:'Algoritmlash',algorithm:true,description:'N sonining faktorialini hisoblash bosqichlarini blok-sxema ko‘rinishida yarating.'},
        {title:'Algoritm qadamlarini taqqoslash',type:'Tahliliy masala',description:'Ikki yechimdan qaysi biri ko‘proq amallar bajarishini kichik misolda aniqlang.'}
      ]}
    ]
  },
  {
    title:'Backend dasturlash va arxitektura',
    description:'HTTP, Django, ORM, autentifikatsiya, REST API, Docker va backend arxitekturasi',
    topics:[
      {title:'HTTP va REST API asoslari',tasks:[
        {title:'So‘rov va javobni tahlil qilish',type:'Nazariy savol',description:'GET va POST so‘rovlarining vazifasini sodda misollar bilan tushuntiring.'},
        {title:'API so‘rovlar oqimi',type:'Algoritmlash',algorithm:true,description:'Foydalanuvchi so‘rovidan server javobigacha bo‘lgan bosqichlarni algoritm sifatida ko‘rsating.'}
      ]},
      {title:'Ma’lumotlar bazasi va SQL',tasks:[
        {title:'Jadvaldan kerakli yozuvni topish',type:'SQL amaliyoti',description:'Shartga mos foydalanuvchilarni tanlaydigan sodda SELECT so‘rovini tuzing.'},
        {title:'Ma’lumotni saqlash jarayoni',type:'Algoritmlash',algorithm:true,description:'Yangi foydalanuvchi ma’lumotini tekshirish va saqlash bosqichlarini blok-sxemada ifodalang.'}
      ]},
      {title:'Server arxitekturasi va xavfsizlik',tasks:[
        {title:'Kirish ma’lumotlarini tekshirish',type:'Algoritmlash',algorithm:true,description:'Foydalanuvchi ma’lumotlarini qabul qilish va tekshirish qadamlarini tuzing.'},
        {title:'Xavfsiz parol qoidalari',type:'Tahliliy savol',description:'Kuchli parol uchun zarur shartlarni sanab, ularning ahamiyatini izohlang.'}
      ]}
    ]
  }
];