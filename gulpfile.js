'use strict';

// node modules
const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const browserSync = require('browser-sync');
const del = require('del');
const eventStream = require('event-stream');
const runSequence = require('run-sequence');

// gulp modules
const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const sourcemaps = require('gulp-sourcemaps');
const handlebars = require('gulp-compile-handlebars');
const rename = require('gulp-rename');
const spritesmith = require('gulp.spritesmith');
const md5 = require('gulp-md5-plus');
const gulpif = require('gulp-if');
const plumber = require('gulp-plumber');
const cleanCSS = require('gulp-clean-css');
const gulpSort = require('gulp-sort');
const data = require('gulp-data');

// notification
const notify = require("gulp-notify");

// postcss
const autoprefixer = require('autoprefixer');
const urlRebase = require('postcss-url');

var paths = {
	html_path: 'src',
	sprite_src: 'src/sprite/',
	sprite_dest: 'src/img/sprite/',
	css_src: 'src/scss/',
	css_dest: 'src/css/',
	img_dest: 'src/img/',
};

var config = {
	browserSync: true,
	notify: true,
	urlRebase: true,
	urlRebaseOption: {
		basePath: paths.img_dest,
		defaultUrl: '../img/',
		urlList: {
			'sprite/': '../img/sprite/',
		},
	},
	md5: true,
	sprite_ratio: {
		png: 1
	},
	autoprefixer: {
		// browsers: ["Android > 0","iOS > 0","FirefoxAndroid > 0"] //모바일옵션
		browsers: ['last 2 versions', "Edge > 0", "ie >= 8"] //PC옵션
	}
}

function getFolders(dir) {
	var result;
	
	try {
		result = fs.readdirSync(dir).filter(function (file) {			
			return fs.statSync(path.join(dir, file)).isDirectory();
		});
	} catch (err) {
		if (err.code === 'ENOENT') {
			console.log('\x1b[31m',dir + "이란 폴더가 없습니다.");
		} else {
			throw err;
		}
	}
		
	return result;	
};

var globalOptions = {
	notify: !config.notify ? {} : {
		errorHandler: notify.onError({
			title: '<%= error.relativePath %>',
			message: '<%= error.line %> line - <%= error.messageOriginal %>',
			sound: "Pop",
		})
	}
}

gulp.task('default', ['watch', 'browserSync']);
gulp.task('dev', function(cb) {
	runSequence(['sprite'], 'sass', cb);
});
gulp.task('build', ['sass-build','sprite','md5-sprite']);
gulp.task('watch', ['dev'], function () {
	var options = {};
	gulp.watch([path.join(paths.css_src, '/**/*')], ['sass']);
	gulp.watch([path.join(paths.sprite_src, '/**/*')], ['sprite']);
});

gulp.task('sprite',['makeSpriteMap']);

gulp.task('makeSprite', function () {
	var stream_arr = [];
	var folders = getFolders(paths.sprite_src);
	var options = {
		spritesmith: function(folder) {
			return {
				imgPath: path.posix.relative(paths.css_dest, path.posix.join(paths.sprite_dest, 'sp_' + folder + '.png')),
				imgName: 'sp_' + folder + '.png',
				cssName: '_sp_' + folder + '.scss',
				cssFormat: 'scss',
				padding: 4,
				cssTemplate: './gulpconf/sprite_template.hbs',
				cssSpritesheetName: 'sp_' + folder,
				cssHandlebarsHelpers: {
					sprite_ratio: config.sprite_ratio.png
				}
			}
		},
	};
	
	if (folders) {
		folders.map(function(folder) {
			var spriteData = gulp.src(path.join(paths.sprite_src, folder, '*.png'))
				.pipe(plumber(globalOptions.notify))
				.pipe(gulpSort())
				.pipe(spritesmith(options.spritesmith(folder)));
			stream_arr.push(new Promise(function(resolve) {
				spriteData.img
					.pipe(gulp.dest(paths.sprite_dest))
					.on('end',resolve);
			}));
			stream_arr.push(new Promise(function(resolve) {
				spriteData.css
					.pipe(gulp.dest(path.join(paths.css_src, 'sprite')))
					.on('end', resolve);
			}));
		});
	}
	
	return Promise.all(stream_arr);
});

gulp.task('makeSpriteMap', ['makeSprite'], function() {
	var folders = getFolders(paths.sprite_src);	
	if (!folders) return;

	var options = {
		maps: {
			handlebars: {
				prefix: 'sp_',
				path: path.posix.relative(path.posix.join(paths.css_src, 'import'),path.posix.join(paths.css_src, 'sprite')),
				import: folders,
			}
		},
	};

	return gulp.src('gulpconf/sprite_maps_template.hbs')
		.pipe(plumber(globalOptions.notify))
		.pipe(handlebars(options.maps.handlebars))
		.pipe(rename('_sprite_maps.scss'))
		.pipe(gulp.dest(path.join(paths.css_src, 'import')));
});

gulp.task('sass', function() {
	let gulpPipe = gulp.src(path.join(paths.css_src, '**/*.scss'))
		.pipe(plumber(globalOptions.notify))
		.pipe(sourcemaps.init());
	
	gulpPipe = sassPipe(gulpPipe);
	
	return gulpPipe
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest(paths.css_dest))
		.pipe(gulpif(config.browserSync, browserSync.stream({match:'**/*.css'})));
});

gulp.task('sass-build', ['sprite','md5-sprite'], function() {		
	return Promise.all([
		del(path.join(paths.css_dest,'**/*.css.map')),
		new Promise(function(resolve) {
			let gulpPipe = gulp.src(path.join(paths.css_src, '**/*.scss'))
				.pipe(plumber(globalOptions.notify));
				
			gulpPipe = sassPipe(gulpPipe, true);
				
			gulpPipe
				.pipe(gulp.dest(paths.css_dest))
				.on('end',resolve);
		})
	]);
});

gulp.task('minify', [], function() {
	var options = {
		cleanCSS: {
			'advanced' : false,           // 속성 병합 false
			'aggressiveMerging': false,   // 속성 병합 false
			'restructuring': false,       // 선택자의 순서 변경 false
			'mediaMerging': false,        // media query 병합 false
			'compatibility': 'ie7,ie8,*', // IE 핵 남김
		}
	};
	return gulp.src(path.join(paths.css_dest, '*.css'))
		.pipe(cleanCSS(options.cleanCSS))
		.pipe(gulp.dest(paths.css_dest));
});

gulp.task('browserSync', function() {
	var options = {
		browserSync: {
			server: {
				baseDir: paths.html_path,
				directory: true
			},
			open: 'external',
		},
	};

	if(config.browserSync) {
		browserSync.init(options.browserSync);
		gulp.watch(paths.html_path+'/*.html').on('change',browserSync.reload);
	}
});

gulp.task('md5-sprite', ['makeSprite'], function() {
	var options = {
		md5: {
			cssSrc: path.join(paths.css_src,'sprite/*.scss'), //이름 변경 대상 css(scss) 파일
			srcDel: false, // sprite 이름 변경전 파일 삭제 여부
			logDel: true, // 이전 생성된 md5 sprite 삭제 여부
		}
	}

	if(config.md5) {
		var del_sprite = [];
		var sprite_list = getFolders(paths.sprite_src);
		if (!sprite_list) return;
		
		for(var i=0,imax=sprite_list.length;i < imax;i++) {
			del_sprite.push(path.join(paths.sprite_dest,'sp_' + sprite_list[i] + '_????????.png'));
			sprite_list[i] = path.join(paths.sprite_dest,'sp_' + sprite_list[i] + '.png');
		}

		return del(del_sprite)
		.then(function() {
			return new Promise(function(resolve) {
				gulp.src(sprite_list)
					.pipe(plumber(globalOptions.notify))
					.pipe(md5(8,options.md5.cssSrc))
					.pipe(gulp.dest(paths.sprite_dest))
					.on('end',resolve);
			});
		}).then(function() {
			if(options.md5.srcDel) {
				return del(sprite_list);
			}
		});
	}
});

function sassPipe(gulpPipe, build) {
	var options = {
		sass : {
			outputStyle: 'expanded',
			indentType: 'tab',
			indentWidth: 1
		},
		autoprefixer: {
			browsers: config.autoprefixer.browsers
		}
	};

	options.postcss = [
		autoprefixer(options.autoprefixer),
	];

	if(build && config.urlRebase) {
		options.postcss.push(urlRebase({
			basePath: path.relative(paths.css_dest,config.urlRebaseOption.basePath),
			url: function (asset) {
				var rebasedUrl = asset.url;
				var basePath = path.posix.relative(paths.css_dest,config.urlRebaseOption.basePath);
				if(asset.url.indexOf(basePath) == 0) {
					rebasedUrl = config.urlRebaseOption.defaultUrl + path.posix.relative(basePath, asset.url);
				}
				for (var name in config.urlRebaseOption.urlList) {
					if (config.urlRebaseOption.urlList.hasOwnProperty(name)) {
						var basePath = path.posix.join(basePath, name);
						if(asset.url.indexOf(basePath) == 0) {
							rebasedUrl = config.urlRebaseOption.urlList[name] + path.posix.relative(basePath, asset.url);
						}
					}
				}
				return rebasedUrl;
			},
		}));
	}

	gulpPipe = gulpPipe.pipe(sass(options.sass));
	if (build) {
		gulpPipe = gulpPipe.pipe(postcss(options.postcss));
	}

    return gulpPipe;
}