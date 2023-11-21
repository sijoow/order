var router = require('express').Router();



function 로그인했니(요청, 응답, next) {
    if (요청.user) { 
      next();
    } else { 
      응답.send(`
        <p>본페이지는 어드민 페이지입니다 로그인후 이용해주세요</p>
        <script>
          setTimeout(function () {
            window.location.href = "/login";
          }, 2000);
        </script>
      `);
    }
  }


module.exports = router;