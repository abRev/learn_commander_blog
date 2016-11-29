var rd = require('rd');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var fs = require('fs');
var MarkdownIt = require('markdown-it');
var swig = require('swig');
swig.setDefaults({cache:false});

var md = new MarkdownIt({
	html:true,
	langPrefix:'code-',
})

module.exports = function(dir){
	dir = dir || '.';
	var app = express();
	var router = express.Router();
	app.use('/assets',serveStatic(path.resolve(dir,'assets')));
	app.use(router);
	
	//渲染文章
	router.get('/posts/*',function(req,res,next){
		var name = stripExtname(req.params[0]);
		var file = path.resolve(dir,'_posts',name+'.md');
		
		fs.readFile(file,function(err,content){
			if(err) return next(err);
			var post = parseSourceContent(content.toString());
			post.content = markdownToHTML(post.source);
			post.layout = post.layout||'post';
			var html = renderFile(path.resolve(dir,'_layout',post.layout+'.html'),{post:post});
			res.end(html);
		});
	});

	//渲染列表
	router.get('/',function(req,res,next){
		var list=[];
		var sourceDir = path.resolve(dir,'_posts');
		rd.eachFileFilterSync(sourceDir,/\.md$/,function(f,s){
			var source = fs.readFileSync(f).toString();
			var post = parseSourceContent(source);
			post.timestamp = new Date(post.date);
			post.url = '/posts/'+stripExtname(f.slice(sourceDir.length+1))+'.html';
			list.push(post);
		})
		list.sort(function(a,b){
			return b.timestamp -a.timestamp;
		});
		var html = renderFile(path.resolve(dir,"_layout",'index.html'),{
			posts:list
		});
		res.end(html);
	})
	app.listen(3000);
}

//去掉文件名中的扩展名
function stripExtname(name){
	var i = 0-path.extname(name).length;
	if(i===0) i = name.length;
	return name.slice(0,i);
}

function markdownToHTML(content){
	return md.render(content|| '');	
}

function parseSourceContent(data){
	var split='---\n';
	var i = data.indexOf(split);
	var info = {};
	if(i!==-1){
		var j = data.indexOf(split,i+split.length);
		if(j!==-1){
			var str = data.slice(i+split.length,j).trim();
			data = data.slice(j+split.length);
			str.split('\n').forEach(function(line){
				var i = line.indexOf(':');
				if(i!==-1){
					var name = line.slice(0,i).trim();
					var value = line.slice(i+1).trim();
					info[name] = value;
				}
			})
		}
	}
	info.source = data;
	return info;
}

function renderFile(file,data){
	return swig.render(fs.readFileSync(file).toString(),{
		filename:file,
		autoescape:false,
		locals:data
	})
}


