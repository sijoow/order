var router = require('express').Router();


    //주문서 수집
   router.get('/order', function(요청, 응답){
   응답.render('./store/order.ejs')
   });
  

 module.exports = router;


 