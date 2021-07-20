const express = require('express');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const port = 3000;
const session = require('express-session');
const cookie = require('cookie-parser');
const app = express();

app.use(cookie());
app.use(express.static("public"));
app.use(express.static("views"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

const saltRounds = 10;

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'root',
  database : 'db'
});
connection.connect(function(err){
if(!err) {
    console.log("Database is connected");
} else {
    console.log(err);
}
});

const con = connection;

app.get("/", (req, res) => {
  res.render('home');
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/register", (req, res) => {
  const password = req.body.password;
  const encryptedPassword = bcrypt.hash(password, saltRounds);  
  var users={
    "email":req.body.email,
    "username":req.body.name,
    "password":encryptedPassword,
    "address":req.body.address,
    "phone":req.body.phone
    }
  
  connection.query('INSERT INTO users SET ?',users, function (error, results, fields) {
    if (error) {
        console.log(error)
    } else {        
        res.cookie('login', req.body.email);
        res.redirect("/products");
      }
  });
});

app.post("/login", (req, res) => {
  var email= req.body.email;
  var password = req.body.password;
  var encryptedPassword = bcrypt.hash(password, saltRounds);
  connection.query('SELECT * FROM users WHERE email = ?',[email], async function (error, results, fields) {
    if (error) {
      console.log(error);
    }else{
      if(results.length >0){
        if(results[0].password == encryptedPassword){
            res.cookie('login', req.body.email);
            res.redirect("/products")            
        }
        else{
          console.log("Wrong credentials");
        }
      }
      else{
        console.log("Email doesn't exist");
      }
    }
});
});

app.get("/products", (req, res) => {
  con.query("SELECT * FROM products", function (err, result, fields) {
      if (err){
          console.log(err);
      }else{
      res.render('products', {title: 'Shop', products: result});
      }  
  });
});

app.get("/product/:pid", (req, res) => {
  con.query("SELECT * FROM products WHERE pid = ?", [req.params.pid], function (err, result, fields) {
      if (err){
          console.log(err);
      }else{
        res.render('product', {title: 'Product', product: result[0]});
      }  
  });
});

app.get("/viewOrders", (req, res) => {
  con.query("SELECT * FROM orders WHERE email = ?", [req.cookies.login], function (err, results, fields) {
      if (err){
          console.log(err);
      }else{
      console.log(results);
        results.forEach((result) => {
          result.items = result.items.split(',');
        });
        console.log(results);
      }
  });
})

app.get("/addtocart/:pid", (req, res) =>{
  let products = [];
  console.log(req.cookies.cart);
  if(req.cookies.cart){
    products = req.cookies.cart;
  }
  con.query("SELECT * FROM products WHERE pid = ?", [req.params.pid], function (err, result, fields) { 
    if (err) {
      console.log(err)
    }else{
      products.push({
        pid: result[0].pid,
        title: result[0].title,
        name: result[0].category,
        price: result[0].price,
        picture: result[0].picture,
        qnt: 1
      });
  res.cookie('cart', products);
  res.redirect('/products');
    }
  });
  
});

app.get('/cart', function(req, res) {
  let products = [];
  console.log(req.cookies.cart);
  if(req.cookies.cart) {
    res.render('cart', {title: 'Cart', products: req.cookies.cart});
  } else {
    res.render('cart', {title: 'Cart', products: products});
  }
});

app.post('/update-cart', function(req, res) {
  let products = req.cookies.cart;
  products.forEach(function(product, index) {
    product.qnt = req.body.qnt[index];
  });
  res.clearCookie('cart');
  res.cookie('cart', products);
  res.redirect('/cart');
});

app.get('/empty-cart', function(req, res) {
  let products = [];
  res.cookie('cart', products);
  
  res.redirect('/cart');
});

app.get('/remove-from-cart/:pid', function(req, res) {
  let products = req.cookies.cart;
  let index = req.params.pid;
  products.splice(index, 1);
  res.cookie('cart', products, {path:'/'});
  
  res.redirect('/cart');
});

app.get('/checkout', function(req, res) {
  res.render('order', {title: 'Checkout'});
});

app.get('/placeOrder', function(req, res) {
  let items = []
  let products = req.cookies.cart;
  products.forEach((item) => {
    items.push(item.name);
    items.push(item.qnt);
  });
  items = items.toString();
  let order = {
    "email" : req.cookies.login,
    "items" : items
  }
  connection.query('INSERT INTO orders SET ?',order, function (error, results, fields) {
    if (error) {
        console.log(error)
    } else {
        res.redirect("/viewOrders");
      }
  });
});

app.get("/logout", (req, res) => {
  res.clearCookie("login");
  res.clearCookie("cart");
  res.redirect("/");
 });

app.listen(port, () => {
  console.log(`Hosting at http://localhost:${port}`)
});