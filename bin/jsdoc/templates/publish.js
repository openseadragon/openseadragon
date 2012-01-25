/** Called automatically by JsDoc Toolkit. */
function publish(symbolSet) {
	publish.conf = {  // trailing slash expected for dirs
		ext:         ".html",
		outDir:      JSDOC.opt.d || SYS.pwd+"../out/jsdoc/",
		templatesDir: JSDOC.opt.t || SYS.pwd+"../templates/jsdoc/",
		staticDir:   "static/",
		symbolsDir:  "symbols/",
		srcDir:      "symbols/src/",
		cssDir:      "css/",
		fontsDir:    "css/fonts/",
		jsDir:       "javascript/",
		templateName: "Codeview",
		templateVersion: "1.2",
		templateLink: "http://www.thebrightlines.com/2010/05/06/new-template-for-jsdoctoolkit-codeview/"
	};
	
	// is source output is suppressed, just display the links to the source file
	if (JSDOC.opt.s && defined(Link) && Link.prototype._makeSrcLink) {
		Link.prototype._makeSrcLink = function(srcFilePath) {
			return "&lt;"+srcFilePath+"&gt;";
		}
	}
	
	// create the folders and subfolders to hold the output
	IO.mkPath((publish.conf.outDir+publish.conf.cssDir));
	IO.mkPath((publish.conf.outDir+publish.conf.fontsDir));
	IO.mkPath((publish.conf.outDir+publish.conf.jsDir));
	IO.mkPath((publish.conf.outDir+"symbols/src").split("/"));
	
	// used to allow Link to check the details of things being linked to
	Link.symbolSet = symbolSet;

	// create the required templates
	try {
		var classTemplate = new JSDOC.JsPlate(publish.conf.templatesDir+"class.tmpl");
	}
	catch(e) {
		print("Couldn't create the required templates: "+e);
		quit();
	}
	
	// some utility filters
	function hasNoParent($) {return ($.memberOf == "")}
	function isaFile($) {return ($.is("FILE"))}
	function isaClass($) {return (($.is("CONSTRUCTOR") || $.isNamespace) && ($.alias != "_global_" || !JSDOC.opt.D.noGlobal))}
	
	// get an array version of the symbolset, useful for filtering
	var symbols = symbolSet.toArray();
	
	// create the hilited source code files
	var files = JSDOC.opt.srcFiles;
 	for (var i = 0, l = files.length; i < l; i++) {
 		var file = files[i];
 		var srcDir = publish.conf.outDir + publish.conf.srcDir;
		makeSrcFile(file, srcDir);
 	}
 	
 	// get a list of all the classes in the symbolset
 	publish.classes = symbols.filter(isaClass).sort(makeSortby("alias"));
	
	// create a filemap in which outfiles must be to be named uniquely, ignoring case
	if (JSDOC.opt.u) {
		var filemapCounts = {};
		Link.filemap = {};
		for (var i = 0, l = publish.classes.length; i < l; i++) {
			var lcAlias = publish.classes[i].alias.toLowerCase();
			
			if (!filemapCounts[lcAlias]) filemapCounts[lcAlias] = 1;
			else filemapCounts[lcAlias]++;
			
			Link.filemap[publish.classes[i].alias] = 
				(filemapCounts[lcAlias] > 1)?
				lcAlias+"_"+filemapCounts[lcAlias] : lcAlias;
		}
	}
	
	// create each of the class pages
	for (var i = 0, l = publish.classes.length; i < l; i++) {
		var symbol = publish.classes[i];
		
		symbol.events = symbol.getEvents();   // 1 order matters
		symbol.methods = symbol.getMethods(); // 2
		
		var output = "";
		output = classTemplate.process(symbol);
		
		IO.saveFile(publish.conf.outDir+publish.conf.symbolsDir, ((JSDOC.opt.u)? Link.filemap[symbol.alias] : symbol.alias) + publish.conf.ext, output);
	}
	
	// create the class index page
	try {
		var classesindexTemplate = new JSDOC.JsPlate(publish.conf.templatesDir+"allclasses.tmpl");
	}
	catch(e) { print(e.message); quit(); }
	
	var classesIndex = classesindexTemplate.process(publish.classes);
	IO.saveFile(publish.conf.outDir, (JSDOC.opt.D.index=="files"?"allclasses":"index")+publish.conf.ext, classesIndex);
	classesindexTemplate = classesIndex = classes = null;
	
	// create the file index page
	try {
		var fileindexTemplate = new JSDOC.JsPlate(publish.conf.templatesDir+"allfiles.tmpl");
	}
	catch(e) { print(e.message); quit(); }
	
	var documentedFiles = symbols.filter(isaFile); // files that have file-level docs
	var allFiles = []; // not all files have file-level docs, but we need to list every one
	
	for (var i = 0; i < files.length; i++) {
		allFiles.push(new JSDOC.Symbol(files[i], [], "FILE", new JSDOC.DocComment("/** */")));
	}
	
	for (var i = 0; i < documentedFiles.length; i++) {
		var offset = files.indexOf(documentedFiles[i].alias);
		allFiles[offset] = documentedFiles[i];
	}
		
	allFiles = allFiles.sort(makeSortby("name"));

	// output the file index page
	var filesIndex = fileindexTemplate.process(allFiles);
	IO.saveFile(publish.conf.outDir, (JSDOC.opt.D.index=="files"?"index":"files")+publish.conf.ext, filesIndex);
	fileindexTemplate = filesIndex = files = null;
	
	// copy static files
	IO.copyFile(publish.conf.templatesDir+"/"+publish.conf.cssDir+"all.css", publish.conf.outDir+"/"+publish.conf.cssDir);
	IO.copyFile(publish.conf.templatesDir+"/"+publish.conf.cssDir+"screen.css", publish.conf.outDir+"/"+publish.conf.cssDir);
	IO.copyFile(publish.conf.templatesDir+"/"+publish.conf.cssDir+"handheld.css", publish.conf.outDir+"/"+publish.conf.cssDir);
	IO.copyFile(publish.conf.templatesDir+"/"+publish.conf.jsDir+"all.js", publish.conf.outDir+"/"+publish.conf.jsDir);
	IO.copyFile(publish.conf.templatesDir+"/"+publish.conf.jsDir+"html5.js", publish.conf.outDir+"/"+publish.conf.jsDir);
	IO.copyFile(publish.conf.templatesDir+"/"+publish.conf.fontsDir+"mplus-1m-regular-webfont.eot", publish.conf.outDir+"/"+publish.conf.fontsDir);
	IO.copyFile(publish.conf.templatesDir+"/"+publish.conf.fontsDir+"mplus-1m-regular-webfont.svg", publish.conf.outDir+"/"+publish.conf.fontsDir);
	IO.copyFile(publish.conf.templatesDir+"/"+publish.conf.fontsDir+"mplus-1m-regular-webfont.ttf", publish.conf.outDir+"/"+publish.conf.fontsDir);
	IO.copyFile(publish.conf.templatesDir+"/"+publish.conf.fontsDir+"mplus-1m-regular-webfont.woff", publish.conf.outDir+"/"+publish.conf.fontsDir);
	IO.copyFile(publish.conf.templatesDir+"/"+publish.conf.fontsDir+"mplus-1m-bold-webfont.eot", publish.conf.outDir+"/"+publish.conf.fontsDir);
	IO.copyFile(publish.conf.templatesDir+"/"+publish.conf.fontsDir+"mplus-1m-bold-webfont.svg", publish.conf.outDir+"/"+publish.conf.fontsDir);
	IO.copyFile(publish.conf.templatesDir+"/"+publish.conf.fontsDir+"mplus-1m-bold-webfont.ttf", publish.conf.outDir+"/"+publish.conf.fontsDir);
	IO.copyFile(publish.conf.templatesDir+"/"+publish.conf.fontsDir+"mplus-1m-bold-webfont.woff", publish.conf.outDir+"/"+publish.conf.fontsDir);	}

/** Include a sub-template in the current template, specifying a data object */
function subtemplate(template, data) {
	try {
		return new JSDOC.JsPlate(publish.conf.templatesDir+template).process(data);
	}
	catch(e) { print(e.message); quit(); }
}

/** Just the first sentence (up to a full stop). Should not break on dotted variable names. */
function summarize(desc) {
	if (typeof desc != "undefined")
		return desc.match(/([\w\W]+?\.)[^a-z0-9_$]/i)? RegExp.$1 : desc;
}

/** Make a symbol sorter by some attribute. */
function makeSortby(attribute) {
	return function(a, b) {
		if (a[attribute] != undefined && b[attribute] != undefined) {
			a = a[attribute].toLowerCase();
			b = b[attribute].toLowerCase();
			if (a < b) return -1;
			if (a > b) return 1;
			return 0;
		}
	}
}

function wordwrapNamespace(classLink) {
	var classText = classLink.match(/[^<>]+(?=[<])/) + "";
	var classTextNew = classText.replace(/\./g,  "<span class='break'> </span>.<span class='break'> </span>") + "";
	classLink = classLink.replace(/[^<>]+(?=[<])/,  classTextNew);
	return classLink;
}

/** Pull in the contents of an external file at the given path. */
function include(path) {
	var path = publish.conf.templatesDir+path;
	return IO.readFile(path);
}

/** Turn a raw source file into a code-hilited page in the docs. */
function makeSrcFile(path, srcDir, name) {
	if (JSDOC.opt.s) return;
	
	if (!name) {
		name = path.replace(/\.\.?[\\\/]/g, "").replace(/[\\\/]/g, "_");
		name = name.replace(/\:/g, "_");
	}
	
	var src = {path: path, name:name, charset: IO.encoding, hilited: ""};
	
	if (defined(JSDOC.PluginManager)) {
		JSDOC.PluginManager.run("onPublishSrc", src);
	}

	if (src.hilited) {
		IO.saveFile(srcDir, name+publish.conf.ext, src.hilited);
	}
}

/** Build output for displaying function parameters. */
function makeSignature(params) {
	if (!params) return "()";
	var signature = "("
	+
	params.filter(
		function($) {
			return $.name.indexOf(".") == -1; // don't show config params in signature
		}
	).map(
		function($) {
			return $.name;
		}
	).join(", ")
	+
	")";
	return signature;
}

/** Find symbol {@link ...} strings in text and turn into html links */
function resolveLinks(str, from) {
   str = str.replace(/\{@link ([^}]+)\}/gi,
     function(match, symbolName) {
	symbolName = symbolName.trim();
	var index = symbolName.indexOf(' ');
	if (index > 0) {
	   var label = symbolName.substring(index + 1);
	   symbolName = symbolName.substring(0, index);
	   return new Link().toSymbol(symbolName).withText(label);
	} else {
	   return new Link().toSymbol(symbolName);
	}
     }
   );
   return str;
}