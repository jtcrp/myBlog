
//Necessary requirements express and handlebar and mysql
const express = require('express');  //express framework module
const multer  = require('multer') // multer module for file uploading
const moment =  require('moment');
const mysql = require('mysql'); //mysql for database operations module
const path = require('path');
var fs = require('fs'); //delete files module
const session = require('express-session');
const { engine } = require ('express-handlebars'); //handlebar module
const { nanoid } = require('nanoid'); //nano id module for random file name generation
const app = express();


//mysql connection
const connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'blog'
}); 

//initializing session modules
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));
app.use('/images', express.static(process.cwd() + '/images')); //making images folder easir to be reached


//defining the handlebar extension as .hbs
app.engine( "hbs", engine({
    defaultLayout: 'main',
    extname: '.hbs', //change the handlebar extension
	helpers: {
		truncate: function(str) {
			if (str.length > 100)
			  return str.substring(0,100) + '...';
			return str;
		  },
		bar: function () { return 'BAR!'; }
	  }
}));

app.set('view engine', 'hbs');
//setting bootstrap as the css framework
//app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use(express.static(path.join(__dirname, '/public')));


//Function to get logged in user
function getUser(request){

	console.log(request.session.loggedin);
	// If the user is loggedin
	if (request.session.loggedin) {
		// Output username
		console.log('Welcome back, ' + request.session.username + '!');

		//array with user info for the session
		let userData = [

			{

				name: request.session.name,
				username : request.session.username,
				userID: request.session.userId
	
			}

		];

		return userData;


	} else {
		// Not logged in
		console.log('Please login to view this page!');
		return false;
	}

}

//node getting and requesting the home page
app.get('/home',
 function(req,res){

	//Select blog post query
	connection.query("SELECT *  FROM post", function (err, result, fields) {
		if (err) throw err;
		console.log(result);

		res.render('home', {
			title: 'Home',
			homeView: result,
			user:  getUser(req) //user data
			});


	});
	
		 
});

//login post
app.post('/auth', function(request, response) {
	// Capture the input fields
	let username = request.body.username;
	let password = request.body.password;
	// Ensure the input fields exists and are not empty
	if (username && password) {
		// Execute SQL query that'll select the account from the database based on the specified username and password
		connection.query('SELECT * FROM accounts WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			// If there is an issue with the query, output the error
			if (error) throw error;
			// If the account exists
			if (results.length > 0) {
				// Authenticate the user
				request.session.loggedin = true;
				request.session.username = username;
				request.session.name = results[0].name;
				request.session.userId = results[0].id;
				// Redirect to home page
				response.redirect('/home');
				
			} else {


				swal("Incorrect Username and/or Password!");
				response.redirect('/home');
			}			
			response.end();
		});
	} else {
		swal("Please enter Username and Password!");
		response.redirect('/home');
		response.end();
	}
});

//logout
app.get('/logout',(req,res) => {
    req.session.destroy();

	swal("Good Bye!");
    res.redirect('/');
});

//file storage for image upload
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './images')
    },
    filename: function (req, file, cb) {
      cb(null, nanoid(10) +  '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
    }
})
var upload = multer({ storage: storage })

//blog post create
app.post('/create', upload.single('image-file'), function (req, res, next) {

	//form input data
	let blogPost = req.body;
	let userData = getUser(req);

	//post date formatting to MYSQL DateTime 
	let date =  moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
	
	//Insert into DB
	var sql = "INSERT INTO post (authorId, title, published, publishedAt, content, image) VALUES ("+userData[0].userID+", '"+ blogPost.title +"', 1, '"+date+"', '"+ blogPost.text +"', '"+ req.file.filename +"' )";
	connection.query(sql, function (err, result) {
    if (err) throw err;
    console.log("1 record inserted");
	let results=JSON.parse(JSON.stringify(result))

	res.redirect('/view/' + results.insertId);

  });
  }); 

  //comment post
  app.post('/comment', function (req, res, next) {

	//form input data
	let commentData = req.body;
	//user data
	let userData = getUser(req);
	

	//post date formatting to MYSQL DateTime 
	let date =  moment(new Date()).format("YYYY-MM-DD HH:mm:ss");
	
	//Insert into DB
	var sql = "INSERT INTO comments (author_id, date, post_id, comment_text, likes, dislikes) VALUES ('"+userData[0].userID+"', '"+date+"', '"+ commentData.postId +"', '"+commentData.text+"',0,0 )";
	connection.query(sql, function (err, result) {
    if (err) throw err;
    console.log("1 record inserted");

	res.redirect('/view/' + commentData.postId);

  });
  });

//node getting and requesting the edit page
app.get('/edit/:id',
 function(req,res){

	//Select blog post query
	connection.query("SELECT * FROM post WHERE id = " + req.params.id, function (err, result, fields) {
		if (err) throw err;
		console.log(result);

		res.render('blogEdit', {
			title: 'Edit Blog Post',
			user:  getUser(req),
			blogEdit: result
	
			});


	});
	
});

//UPDATE method for edit page

//blog post create
app.post('/edit/post/:id', upload.single('image-file'), function (req, res, next) {

	//form input data
	let blogPost = req.body;

	let userData = getUser(req);

	console.log(userData);
	console.log(userData[0].name);
	console.log(JSON.stringify(req.file));
	

	//Update values
	if (req.file){

		var sql = "UPDATE post SET title = '"+blogPost.title+"', content = '"+blogPost.text+"', image ="+ req.file.filename + " WHERE id = " + req.params.id;

	}else{

		var sql = "UPDATE post SET title = '"+blogPost.title+"', content = '"+blogPost.text+"' WHERE id = " + req.params.id;

	}
	
	connection.query(sql, function (err, result) {
    if (err) throw err;
    console.log("1 record inserted");

	res.redirect('/view/' + req.params.id);

  });
  });

//blog delete
app.get('/delete/:id', function(req, res, next) {
	  var id= req.params.id;

	  //query to delete image from files
	  connection.query("SELECT image FROM post WHERE id = " + req.params.id, function (err, result, fields) {

		fs.unlinkSync('images/'+ result[0].image);
	 });

	 //query to delete blog post records on database
	  var sql = 'DELETE FROM post WHERE id = ?';
	  connection.query(sql, [id], function (err, data) {
	  if (err) throw err;
	  console.log(data.affectedRows + " record(s) updated");
	});
	res.redirect('/dashboard/');
	
});


//node getting and requesting the login page
app.get('/login',
 function(req,res){
	res.render('login', {
		title: 'Login',
		});
});

//node getting and requesting the new post page
app.get('/view/:id',
 function(req,res){

	//Select blog post query
	connection.query("SELECT * FROM post WHERE id = " + req.params.id, function (err, Postresult, fields) {
		if (err) throw err;
		//console.log(Postresult);
 
		//select author name from accounts
		connection.query("SELECT name FROM accounts WHERE id = " + Postresult[0].authorId, function (err, result, fields) {
			if (err) throw err;

			//select all the comments on this post
			connection.query("SELECT * FROM comments WHERE post_id = " + req.params.id, function (err, commentsResult, fields) {
				if (err) throw err;

					res.render('postView', {
						title: 'Edit Blog Post',
						user:  getUser(req),
						postView: Postresult,
						author: result[0].name,
						postId:  req.params.id,
						commentsData: commentsResult
				
						});

			});

		});


	});
		
});


//node getting and requesting the new post page
app.get('/newpost',
 function(req,res){
	res.render('blogPost', {
		title: 'New Blog post',
		user:  getUser(req)
		});
});

//node getting and requesting the dashboard page
app.get('/dashboard',
 function(req,res){

	//Selecting all posts
	connection.query("SELECT * FROM post", function (err, result, fields) {
		if (err) throw err;

		console.log(result);

		res.render('dashboard', {
				title: 'Dashboard',
				user:  getUser(req),
				blogPosts: result
				});


	});

	
});

//node getting and requesting the about us page
app.get('/lastposts',
 function(req,res){
	res.render('lastposts', {
		title: 'Last Posts',
		user:  getUser(req)
		});
});

app.get('/',function (req, res) {

	//Select blog post query
	connection.query("SELECT *  FROM post", function (err, result, fields) {
		if (err) throw err;
		console.log(result);

		res.render('home', {
			title: 'Home',
			homeView: result,
			user:  getUser(req) //user data
	
			});


	});
});

//Server starter
app.listen(9000);                            