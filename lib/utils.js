var path = require('path');
var fs = require('fs');
var MarkdownIt = require('markdown-it');
var md = new MarkdownIt({
	html:true,
	langPrefix:"code-",
})

var swig = require('swig');
swig.setDefaults({cache:false});
var rd = require('rd');

function stripExtname(name){
	var i = 0-path.extname(name).length;
	if(i===0)i=name.length;
	return name.slice(0,i);
}

function markdownToHTML(content){
	return md.render(content||'');
}

function parseSourceContent(data){
	var split = '---\n';
	var i =data.indexOf(split);
	var info = {};
	if(i!==-1){
		var j =data.indexOf(split,i+split.length)
		if(j!==-1){
			var str = data.slice(i+split.length,j).trim();
			data = data.slice(j+split.length);
			str.split('\n').forEach(function(line){
				var i = line.indexOf(':');
				var name = line.slice(0,i).trim();
				var value = line.slice(i+1).trim();
				info[name] = value;
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

function eachSourceFile(sourceDir,callback){
	rd.eachFileFilterSync(sourceDir,/\.md$/,callback);
}

function renderPost(dir,file){
	var content = fs.readFileSync(file).toString();
	var post = parseSourceContent(content.toString());
	post.content = markdownToHTML(post.source);
	post.layout = post.layout||"post";
	var config = loadConfig(dir);
	var layout = path.resolve(dir,'_layout',post.layout+".html");
	var html = renderFile(layout,{
		config:config,
		post:post
	});
	return html;
}

function renderIndex(dir){
	var list=[];
	var sourceDir = path.resolve(dir,'_posts');
	eachSourceFile(sourceDir,function(f,s){
		var source = fs.readFileSync(f).toString();
		var post = parseSourceContent(source);
		post.timestamp = new Date(post.date);
		post.url = '/posts/'+stripExtname(f.slice(sourceDir.length+1))+'.html';
		list.push(post);
	})
	list.sort(function(a,b){
		return b.timestamp -a.timestamp;
	});
	var config = loadConfig(dir);
	var layout = path.resolve(dir,'_layout','index.html');
	var html = renderFile(layout,{
		config:config,
		posts:list
	});
	return html;
}

function loadConfig(dir){
	var content = fs.readFileSync(path.resolve(dir,'config.json')).toString();
	var data = JSON.parse(content);
	return data;
}

exports.loadConfig = loadConfig;
exports.renderPost = renderPost;
exports.renderIndex = renderIndex;
exports.stripExtname = stripExtname;
exports.eachSourceFile = eachSourceFile;