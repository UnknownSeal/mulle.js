const gulp = require('gulp')
const child_process = require('child_process')
const spawn = require('child_process').spawn
const exec = require('gulp-exec');
const texturePacker = require('gulp-free-tex-packer')
const git = require('gulp-git')
const install = require('gulp-install')
const rename = require('gulp-rename')
const sass = require('gulp-sass')
const webpack = require('webpack-stream')

const WebpackDev = require('./webpack.dev.js')
const WebpackProd = require('./webpack.prod.js')

gulp.task('phaser-clone', function (done) {
  git.clone('https://github.com/photonstorm/phaser-ce.git', { args: './phaser-ce' }, function (error) {
    if (error) throw error
    done()
  })
})

gulp.task('phaser-install', function (done) {
  gulp.src('./phaser-ce/package.json').pipe(install({ npm: '-f' }, function () {
    done()
  }))
})

gulp.task('phaser-build', function (done) {
  var exclude = [
    'gamepad',
    // 'rendertexture',
    'bitmaptext',
    'retrofont',
    'rope',
    'tilesprite',
    'flexgrid',
    'ninja',
    'p2',
    'tilemaps',
    'particles',
    'weapon',
    'creature',
    'video'
  ]

  var cmd = [
    'npx',
    'grunt',
    'custom',
    '--gruntfile ./phaser-ce/Gruntfile.js',
    '--exclude=' + exclude.join(','),
    '--uglify',
    '--sourcemap'
  ]

  child_process.exec(cmd.join(' '), function (err, stdout, stderr) {
    console.log('phaser err: ' + err)
    console.log('phaser stdout: ' + stdout)
    console.log('phaser stderr: ' + stderr)

    gulp.src('./phaser-ce/dist/phaser.min.js').pipe(gulp.dest('dist/'))
    gulp.src('./phaser-ce/dist/phaser.map').pipe(gulp.dest('dist/'))
    done()
  })
})

gulp.task('html', function (done) {
  gulp.src('./progress/**').pipe(gulp.dest('dist/progress/'))
  gulp.src('./info/**').pipe(gulp.dest('dist/info/'))
  gulp.src('./src/index.html').pipe(gulp.dest('dist/'))
  done()
})

gulp.task('css', function () {
  return gulp.src('./src/style.scss').pipe(sass({ /* outputStyle: 'compressed' */ }).on('error', sass.logError)).pipe(gulp.dest('dist/'))
})

gulp.task('copy_data', function (done) {
  gulp.src('./loading.png').pipe(gulp.dest('dist/'))
  gulp.src('./data/*.json').pipe(gulp.dest('dist/data/'))

  gulp.src('./ui/*').pipe(gulp.dest('dist/ui/'))

  gulp.src('./topography/topography*').pipe(gulp.dest('dist/assets/topography/'))

  const cursors = {
    109: 'default',
    110: 'grab',
    111: 'left',
    112: 'point',
    113: 'back',
    114: 'right',
    115: 'drag_left',
    116: 'drag_right',
    117: 'drag_forward'
  }

  for (const [number, name] of Object.entries(cursors)) {
    gulp.src(`./cst_out_new/00.CXT/Standalone/${number}.png`).pipe(rename(name + '.png')).pipe(gulp.dest('dist/ui'))
  }
  done()
})

gulp.task('pack_topography', function () {
  return gulp.src('topography/30t*.png')
    .pipe(texturePacker({
      textureName: 'topography',
      removeFileExtension: true,
      prependFolderName: false,
      exporter: 'JsonHash',
      width: 2048,
      height: 2048,
      fixedSize: false,
      padding: 1,
      allowRotation: false,
      allowTrim: true,
      detectIdentical: true,
      packer: 'MaxRectsBin',
      packerMethod: 'BottomLeftRule'
    }))
    .pipe(gulp.dest('topography'))
})

gulp.task('build_topography', function () {
  const process = spawn('python', ['build_scripts/topography.py'])

  process.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`)
  })
  process.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`)
  })

  return process
})

gulp.task('assets-dev', function () {
  console.log('do assets dev')
  return spawn('python', ['assets.py', '0'])
})

gulp.task('assets-prod', function () {
  console.log('do assets prod')
  return spawn('python', ['assets.py', '7'])
})

gulp.task('js-dev', function () {
  return gulp.src('src/index.js').pipe(
    webpack(WebpackDev)
  ).pipe(
    gulp.dest('dist/')
  )
})

gulp.task('js-prod', function () {
  return gulp.src('src/index.js').pipe(
    webpack(WebpackProd)
  ).pipe(
    gulp.dest('dist/')
  )
})

gulp.task('phaser', gulp.series('phaser-clone', 'phaser-install', 'phaser-build'))
gulp.task('data', gulp.series('topography', 'copy_data'))
gulp.task('build-dev', gulp.series( 'phaser', 'js-dev', 'html', 'css' ))
gulp.task('build-dev', gulp.series( 'phaser', 'js-dev', 'html', 'css' ))
gulp.task('build-prod', gulp.series( 'phaser', 'js-prod', 'html', 'css' ))

gulp.task('build-full', gulp.series( 'phaser', 'js-prod', 'html', 'css', 'assets-prod', 'data' ))

gulp.task('default', gulp.series( 'build-dev', 'assets-dev', 'data' ))
