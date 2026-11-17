window.OrderingTasks={
  'maktabga-tayyorlanish':{
    title:'Maktabga tayyorlanish',
    instruction:'Maktabga tayyorlanish qadamlarini to‘g‘ri tartibga keltiring:',
    steps:[
      {id:'wake',text:'Uyg‘onish.'},
      {id:'wash-dress',text:'Yuvinish va kiyinish.'},
      {id:'breakfast',text:'Nonushta qilish.'},
      {id:'get-bag',text:'Maktab sumkasini olish.'},
      {id:'leave',text:'Maktabga yo‘l olish.'}
    ],
    initialOrder:['get-bag','wake','leave','wash-dress','breakfast']
  }
};
