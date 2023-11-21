//서버 express 세팅 
const express =require('express');
const favicon = require('serve-favicon');
const path = require('path');
const app =express();
const PORT = 8001
const bodyParser= require('body-parser')
const methodOverride = require('method-override')
const ObjectId = require('mongodb').ObjectId;
//비밀번호
const bcrypt = require('bcrypt');
const saltRounds = 10;
//로그인실패시
app.use(methodOverride('_method'))
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs')
//nodemailer
const nodemailer = require('nodemailer');
const fs = require('fs');
//서버에 이미지 
app.use(bodyParser.json({ limit: '400mb' }));
app.use(bodyParser.urlencoded({ limit: '400mb', extended: true }));
app.use('/public',express.static('public'));
// Favicon 미들웨어 설정
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//env
require('dotenv').config();
//라우터
app.use('/store', require('./routes/store.js') );
//MONGODB 연결
const MongoClient = require('mongodb').MongoClient;
app.listen('8001', function(){
  console.log('listening on 8001')
});



var db;
MongoClient.connect('mongodb+srv://yogibo:몽고디비연결', function(에러, client){
  if (에러) return console.log(에러);
  db = client.db('todoapp');
})

//주문서 수집 //메일러 기능 추가하기 
app.post('/order', function(req, res) {
      let date = new Date();
      let options = { year: 'numeric', month: '2-digit', day: '2-digit' };
      let formattedDate = date.toLocaleDateString('ko-KR', options).replace(/-/g, '.').slice(0, -1);
      const newOrderId = new ObjectId(req.body._id);
      let orderData = {
          _id: newOrderId,
          날짜: formattedDate,
          판매처: req.body.store,
          판매자: req.body.staff,
          수취인: req.body.receiver,
          연락처: req.body.phoneNumber,
          나이: req.body.age,
          사인: req.body.signa,
          이메일: req.body.email,
          배송지1: req.body.address1,
          배송지2: req.body.address2,
          배송지3: req.body.address3,
          총합계: req.body.totalPrice
      };
      //추가 구성상품관련 counter리스트 작업
      for (let i = 1; i <= 100; i++) {
          if (req.body[`goodsName_${i}`]) {  // 데이터가 입력된 경우에만 추가
              orderData[`상품명${i}`] = req.body[`goodsName_${i}`];
              orderData[`비즈${i}`] = req.body[`goodsBiz_${i}`];
              orderData[`상품컬러${i}`] = req.body[`goodsColor_${i}`];
              orderData[`수량${i}`] = req.body[`goodsCounter_${i}`];
              orderData[`배송비${i}`] = req.body[`goodsDelivery_${i}`];
              orderData[`단가${i}`] = req.body[`goodsPrice_${i}`];
              orderData[`할인${i}`] = req.body[`goodsDiscount_${i}`];
          } else {
              break; // 해당 상품명이 없으면 반복문 종료
          }
      }
      db.collection('storeOrder').insertOne(orderData, function(err, result) {
        if (err) { return console.log(err) }
        res.redirect('/customer/' + newOrderId); 
    });
  });


  
//회원가입 준비

const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session')
const flash = require('express-flash');
app.use(session({secret:'비밀코드',resave :true, saveUninitialized : false}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.get('/login', function (req, res) {
  res.render('login.ejs');
});

app.get('/join', function (req, res) {
  db.collection('storeOrder').find().toArray(function (err, result) {
    res.render('join', {
      isLoggedin: req.isAuthenticated(),
      user: req.user,
      posts: result
    });
  });
});




app.post('/join_register', function (req, res) {
  db.collection('login').findOne({ id: req.body.joinId }, function (err, user) {
    if (err) {
      console.log(err);
      return res.status(500).send('데이터베이스 조회 오류');
    }

    if (user) {
      console.log('조회된 사용자:', user);
      return res.send(
        `
        <script>
            alert('아이디가 존재합니다')
            window.location.href = "/join";  
        </script>
     `
      );
    } else {
      console.log('해당 아이디로 사용자를 찾을 수 없습니다.');
    }
    bcrypt.hash(req.body.joinPw, 10, function (err, hash) {
      if (err) {
        res.send('오류 발생');
        return;
      }
      let joinData = {
        id: req.body.joinId,
        pw: hash,
        근무매장: req.body.joinStore,
        전화번호: req.body.JoinphoneNumber,
        성함: req.body.joinName,
        권한: req.body.mapClass
      }

      db.collection('login').insertOne(joinData, function (err, result) {
        console.log("입력된 아이디:", req.body.joinId);
        console.log(user);
        if (err) {
          console.error("데이터 조회 중 오류:", err);
          return res.status(500).send('데이터베이스 조회 오류');
        }
        res.send(`
        <script>
            alert('회원가입성공 로그인페이지로 이동합니다.')
            window.location.href = "/";  
        </script>
     `);
     
      });
    });
  });
});

passport.use(new LocalStrategy({
  usernameField: 'id',
  passwordField: 'pw',
  session: true,
  passReqToCallback: false,
}, function (입력한아이디, 입력한비번, done) {
  db.collection('login').findOne({ id: 입력한아이디 }, function (err, 결과) {
    if (err) return done(err);

    if (!결과) return done(null, false, { message: '존재하지않는 아이디입니다' });

    bcrypt.compare(입력한비번, 결과.pw, function (err, isMatch) {
      if (isMatch) {
        return done(null, 결과);
      } else {
        return done(null, false, { message: '비번확인하세요' });
      }
    });
  });
}));

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (아이디, done) {
  db.collection('login').findOne({ id: 아이디 }, function (err, result) {
    done(null, result);
  });
});

//비밀번호 변경관련 코드
app.post('/change_password', (req, res) => {
  const userId = req.body.userid; 
  const currentPassword = req.body.currentPassword;
  const newPassword = req.body.newPassword;
  const confirmPassword = req.body.confirmPassword;
  // 현재 비밀번호 검증
  db.collection('login').findOne({ id: userId }, (err, user) => {
    console.log(userId)
    console.log(user)
    if (err) return res.status(500).send("서버 오류");
    if (!user) return 
    bcrypt.compare(currentPassword, user.pw, (err, isMatch) => {
      if (err) return res.status(500).send("비밀번호 검증 오류");
      if (!isMatch) return res.status(400).send(
        `
        <script>
            alert("비밀번호가 일치하지 않습니다.");
            window.location.href = "/mypage";  
        </script>
      `
      );

      if (newPassword !== confirmPassword) {
        return res.status(400).send(`
        <script>
            alert("새비밀번호가 일치하지 않습니다");
            window.location.href = "/mypage";  
        </script> 
       `);
      }
      // 새 비밀번호 암호화 및 저장
      bcrypt.hash(newPassword, 10, (err, hash) => {
        if (err) return res.status(500).send("암호화 오류");

        db.collection('login').updateOne({ id: userId }, { $set: { pw: hash } }, (err, result) => {
          if (err) return res.status(500).send("데이터베이스 업데이트 오류");
          
          res.send(`
          <script>
              alert("비밀번호가 변경되었습니다.");
              window.location.href = "/mypage";  
          </script>
      `);
        });
      });
    });
  });
});


//로그인 실패 시 
app.post('/login', function (req, res, next) {
  passport.authenticate('local', function(err, user, info) {
      if (err) {
          return next(err);
      }
      if (!user) {
          return res.send(`
              <script>
                  alert("로그인 정보를 확인하세요.");
                  window.location.href = "/login";  
              </script>
          `);
      }
      req.logIn(user, function(err) {
          if (err) {
              return next(err);
          }
          return res.redirect('/');  // 로그인 성공시 리다이렉션 페이지
      });
  })(req, res, next);
});

app.post('/logout', function (req, res) {
  req.session.destroy(function (err) {
    res.redirect('/');
  });
});


//프로필 페이지
app.get('/mypage',로그인여부,function(req,res){
  db.collection('storeOrder').find().toArray(function(err, result) {
    res.render('mypage', {
      isLoggedin: req.isAuthenticated(),
      user: req.user, //mypage 로그인부분
      posts: result,
    });
  }); 
})

//매장별 데이터 유무
app.get('/',로그인여부, function (req, res) {
  db.collection('storeOrder').find().sort({ "날짜": -1 }).toArray(function (err, result) {
    res.render('index', {
      isLoggedin: req.isAuthenticated(),
      user: req.user,
      posts: result,
      isManager: req.isManager,
      gocheok :req.gocheok, pyeongchon :req.pyeongchon, hanam :req.hanam, wongsan :req.wongsan, dongtan :req.dongtan, gwanggyo :req.gwanggyo, goyang :req.goyang, busan :req.busan,
      daegu :req.daegu, kiheung :req.kiheung, ansang :req.ansang, gwangbok :req.gwangbok, echeon :req.echeon, mia :req.mia,certified:req.certified
    });
  });
});


//매장별 데이터 유무
function 로그인여부(req,res,next){
  if(req.user){
    var storeInfo = req.user.권한  
    if (storeInfo === "인증전") {
      console.log('인증전')
      req.certified= true; 
    }  
    if (storeInfo === "관리자") {
      console.log('마스터 아이디입니다')
      req.isManager = true; 
    }
    if (storeInfo === "고척점") {
      console.log('gocheok')
      req.gocheok = true; 
    }
    if (storeInfo === "평촌점") {
        console.log('pyeongchon')
        req.pyeongchon = true; 
    }   
    if (storeInfo === "하남점") {
        console.log('hanam')
        req.hanam = true; 
    }     
    if (storeInfo === "용산점") {
        console.log('wongsan')
        req.wongsan = true; 
    }      
    if (storeInfo === "동탄점") {
        console.log('dongtan')
        req.dongtan = true; 
    }   
    if (storeInfo === "광교점") {
        console.log('gwanggyo')
        req.gwanggyo = true; 
    }    
    if (storeInfo === "고양점") {
        console.log('goyang')
        req.goyang = true; 
    }   
    if (storeInfo === "부산점") {
        console.log('busan')
        req.busan = true; 
    }        
    if (storeInfo === "대구점") {
        console.log('daegu')
        req.daegu = true; 
    }   
    if (storeInfo === "기흥점") {
        console.log('kiheung')
        req.kiheung = true; 
    }  
    if (storeInfo === "안산점") {
        console.log('ansang')
        req.ansang = true; 
    } 
    if (storeInfo === "광복점") {
        console.log('gwangbok')
        req.gwangbok = true; 
    }   
    if (storeInfo === "이천점") {
        console.log('echeon')
        req.echeon = true; 
    }   
    if (storeInfo === "미아점") {
        console.log('mia')
        req.mia = true; 
    }   
      
    next()
  }else{
    res.redirect('/login')
  }
}


//마스터별 주문수집 노출방식
app.get('/master',로그인여부,function(req,res){
  let 판매처Query;
    if (req.user.권한 === '인증전') {
    return res.send('게시판의 내용은 현재 사용할 수 없습니다.'); 
    }
    if (req.user.권한 === '안산점') {
      판매처Query = { "판매처": { $regex: "롯데백화점 안산점", $options: 'i' } };
    }
    if (req.user.권한 === '평촌점') {
      판매처Query = { "판매처": { $regex: "롯데백화점 평촌점", $options: 'i' } };
    } 

    if (req.user.권한 === '대구점') {
      판매처Query = { "판매처": { $regex: "신세계백화점 대구점", $options: 'i' } };
    } 

    if (req.user.권한 === '고척점') {
      판매처Query = { "판매처": { $regex: "아이파크몰 고척점", $options: 'i' } };
    } 
    if (req.user.권한 === '부산점') {
      판매처Query = { "판매처": { $regex: "신세계센텀시티몰 부산점", $options: 'i' } };
    } 

    if (req.user.권한 === '광복점') {
      판매처Query = { "판매처": { $regex: "롯데백화점 광복점", $options: 'i' } };
    } 
    if (req.user.권한 === '동탄점') {
      판매처Query = { "판매처": { $regex: "롯데백화점 동탄점", $options: 'i' } };
    } 
    if (req.user.권한 === '평촌점') {
      판매처Query = { "판매처": { $regex: "롯데백화점 평촌점", $options: 'i' } };
    } 
    if (req.user.권한 === '하남점') {
      판매처Query = { "판매처": { $regex: "스타필드 하남점", $options: 'i' } };
    } 
    if (req.user.권한 === '고양점') {
      판매처Query = { "판매처": { $regex: "스타필드 고양점", $options: 'i' } };
    } 
    if (req.user.권한 === '용산점') {
      판매처Query = { "판매처": { $regex: "아이파크몰 용산점", $options: 'i' } };
    } 
    if (req.user.권한 === '이천점') {
      판매처Query = { "판매처": { $regex: "롯데프리미엄아울렛 이천점", $options: 'i' } };
    } 
    if (req.user.권한 === '기흥점') {
      판매처Query = { "판매처": { $regex: "롯데프리미엄아울렛 기흥점", $options: 'i' } };
    } 


    db.collection('storeOrder').find(판매처Query).sort({ "날짜": -1 }).toArray(function(err,result){
      res.render('./order-list/master.ejs',{
        posts:result,
        isLoggedin: req.isAuthenticated(),
        user: req.user
      })
    })
});




//고객에게 노출되는 주문서 확인증 
app.get('/customer', (req, res) => {
  db.collection('storeOrder').find().toArray((err, result) => {
    res.render('./order-list/customer.ejs',{posts:result})
  });
});


//fetch 로 데이터를 따로 불러오기 추가상품관련하여 추가된 코드
app.get('/getData', (req, res) => {
  db.collection('storeOrder').find().toArray((err, result) => {
      if (err) throw err;
      res.json(result);
  });
});



//고객용 주문서 확인관련 링크
app.get('/customer/:id',로그인여부,function(req, res) {
  const orderId = req.params.id; // URL로부터 주문 ID 가져오기
console.log(orderId)
  db.collection('storeOrder').findOne({ _id: ObjectId(orderId) }, function(err, order) {
      if (err) {
          console.error("에러 발생:", err);
          return res.status(500).send('서버 오류 발생');
      }
      if (!order) {
          // 해당 ID에 대한 주문이 없을 경우의 처리
          return res.status(404).send('주문을 찾을 수 없습니다.');
      }
      res.render('board/customerDetails', { order: order });
      
  });
});

//_id 수정페이지 
// 판매자 주문서확인
app.get('/master/:id',로그인여부,function(req, res) {
  const orderId =req.params.id; // URL로부터 주문 ID 가져오기

  db.collection('storeOrder').findOne({ _id: ObjectId(orderId) }, function(err, order) {
      if (err) {
          console.error("에러 발생:", err);
          return res.status(500).send('서버 오류 발생');
      }
      if (!order) {
          // 해당 ID에 대한 주문이 없을 경우의 처리
          return res.status(404).send('주문을 찾을 수 없습니다.');
      }
      res.render('board/masterDetails', { order: order });
  });

});

app.post('/delete_button', function(req, res) {
  const orderId = req.body.order_id;  // 숨겨진 입력 필드에서 _id 값을 가져옵니다.

  db.collection('storeOrder').deleteOne({ _id: ObjectId(orderId) }, function(err, result) {
      if (err) {
          console.error("에러 발생:", err);
          return res.status(500).send('서버 오류 발생');
      }
      if (result.deletedCount === 0) {
          // 삭제할 데이터가 없을 경우의 처리
          return res.status(404).send(req.body.order_id);
      }
      // 정상적으로 삭제된 경우
      res.redirect('/');
  });
});


app.get('/master/edit/:id', function(req, res) {
  const orderId =req.params.id; // URL로부터 주문 ID 가져오기

  db.collection('storeOrder').findOne({ _id: ObjectId(orderId) }, function(err, order) {
      if (err) {
          console.error("에러 발생:", err);
          return res.status(500).send('서버 오류 발생');
      }
      if (!order) {
          // 해당 ID에 대한 주문이 없을 경우의 처리
          return res.status(404).send('주문을 찾을 수 없습니다.');
      }
      res.render('board/edit', { order: order });
  });
});

// 데이터 수정 처리
app.post('/master/edit/:id', function(req, res) {
  const orderId = ObjectId(req.params.id); 

  // 수정할 데이터 가져오기 (예: 이름, 주소 등)
  const updatedData = {
    판매처: req.body.판매처,
    판매자: req.body.판매자,
    수취인: req.body.수취인,
    연락처: req.body.연락처,
    나이: req.body.나이,
    이메일: req.body.이메일,
    배송지1: req.body.배송지1,
    배송지2: req.body.배송지2,
    배송지3: req.body.배송지3,
  };

  db.collection('storeOrder').updateOne({ _id: orderId }, { $set: updatedData }, function(err, result) {
      if (err) {
          console.error("에러 발생:", err);
          return res.status(500).send('데이터 수정 오류');
      }
      res.redirect('/master/' + orderId); // 수정 후 원래 페이지로 리다이렉트
  });
});





//메일 전송및 데이터 전송관련  
app.post('/sendMail', async (req, res) => {
  const customerEmail  = req.body.email;
  const imageData = req.body.imageData.split(';base64,').pop();
  const transporter = nodemailer.createTransport({
      service: 'Naver', 
      host: 'smtp.naver.com',
      port: 465,       
      auth: {
          user:'yogibo@naver.com', 
          pass:'비밀번호',        
      }
  });
  const mailOptions = {
      from:'yogibo@naver.com',
      to: customerEmail,
      subject: '요기코퍼레이션 고객 주문서확인메일',
      text: '요기코퍼레이션 주문서 확인',
      attachments: [{
          filename: 'orders.jpg',
          content: Buffer.from(imageData, 'base64'),
          encoding: 'base64'
      }]
  };
  try {
      let info = await transporter.sendMail(mailOptions);
      console.log("Message sent: %s", info.messageId);
      res.send("메일 보내기에 성공했습니다.");
  } catch (error) {
      res.send("발송실패");
      console.error("Error sending email: ", error);
  }
});


//데이터 가져오기
app.get('/api/top5products', function(req, res) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 7);//최근 7일간의 데이터 
  
  db.collection('posts').find().toArray(function(err, posts) {
      if(err){
          return res.status(500).send({ error: 'Database error' });
      }
      const aggregated = aggregateProducts(posts);
      res.json(aggregated);
  });

  function aggregateProducts(posts) {
        let aggregated = {};
        for (let i = 0; i < posts.length; i++) {
            if (new Date(posts[i].날짜) >= startDate && new Date(posts[i].날짜) <= endDate) {
                for (let j = 1; posts[i]['상품명' + j]; j++) {
                    let productName = posts[i]['상품명' + j];
                    if(!aggregated[productName]) {
                        aggregated[productName] = 0;
                    }
                    aggregated[productName] += Number(posts[i]['수량' + j]);
                }
            }
        }
        return Object.entries(aggregated)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
            }, {});
      }
  });


//전체매장 주간 베스트 관련 fetch 
app.get('/fetchData', function(req, res) {
  db.collection('storeOrder').find().toArray(function(err, result) {
    if (err) {
      res.status(500).json({ message: "메세지 에러" });
      return;
    }
    res.json(result);
  });
});


//서포터즈 추가 삭제 관련 소스
app.get('/member', 로그인여부,function (req, res) {
  db.collection('storeOrder').find().toArray(function (err, result) {
    db.collection('member').find().toArray(function (err, memberResult) {  
        res.render('board/member', {
          isLoggedin: req.isAuthenticated(),
          memberPosts: memberResult, // member 데이터
          user: req.user,
          posts: result,
          isManager: req.isManager,
          gocheok :req.gocheok, pyeongchon :req.pyeongchon, hanam :req.hanam, wongsan :req.wongsan, dongtan :req.dongtan, gwanggyo :req.gwanggyo, goyang :req.goyang, busan :req.busan,
          daegu :req.daegu, kiheung :req.kiheung, ansang :req.ansang, gwangbok :req.gwangbok, echeon :req.echeon, mia :req.mia,certified:req.certified,
        });
      });
    });   
});

app.post('/member_add', function(req, res) {
  const memberName = req.body.member_name; 
  const memberStore = req.body.member_store;

  const memberData = {
    맴버: memberName,
    권한: memberStore
  }

  db.collection('member').insertOne(memberData, function(err, result) {
    if (err) {
      console.error(err);
      return res.status(500).send('서버 오류 발생');
    }
    res.redirect('/member');
  });
});

// 멤버 권한 관련 삭제 
app.post('/member_delete', function (req, res) {
  let selectedMembers = req.body.member_name;

  // 만약 하나의 멤버만 선택했을 경우, 배열로 래핑합니다.
  if (!Array.isArray(selectedMembers)) {
    selectedMembers = [selectedMembers];
  }

  const memberData = {
    맴버: { $in: selectedMembers } // 여러 멤버 삭제를 지원하기 위해 $in 연산자를 사용합니다.
  };

  db.collection('member').deleteMany(memberData, function (err, result) {
    if (err) {
      console.error(err);
      return res.status(500).send('서버 오류 발생');
    }
    res.redirect('/member');
  });
});



//주문서 작성페이지 스탭들 확인용
app.get('/member_info', async (req, res) => {
  try {
    const memberInfo = await db.collection('member').find().toArray();
    res.json(memberInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '데이터를 불러오는 중에 오류가 발생했습니다.' });
  }
});



//404 페이지
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});
