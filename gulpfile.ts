
import gulpEsbuild from "gulp-esbuild"
const gulp = require("gulp")
const lessCompiler = require("gulp-less")
const changed = require("gulp-changed")
const replace = require("gulp-replace")
const rename = require("gulp-rename")
// const header = require("gulp-header")


/** 源根目录 */
const srcDir = "src/miniprogram"
/** 目标文件夹 */
const distDir = "dist"
/** 需要编译的ts */
const tsList = [`${srcDir}/**/*.ts`]
/** 需要编译的less */
const lessList = [`${srcDir}/**/*.less`]
/** 无需编译，仅复制的文件 */
const srcCopyList = [
    `${srcDir}/**/*.+(js|wxss|json|wxs|wxml)`,
    `${srcDir}/**/*.+(png|gif|jpeg|jpg)`,
]
/**
 * 使用esbuild 编译ts文件
 * @returns 
 */
const esbuild = function(){
    return gulp.src(
            tsList
        )
        .pipe(gulpEsbuild({
            loader: {
                '.ts': 'ts',
            },
            format: 'cjs',
            tsconfig: './tsconfig.json',
        }))
        .pipe(gulp.dest('./dist'))
}
/**
 * 编译less文件
 * @returns 
 */
const less = (): any => {
    return gulp.src(lessList, { base: srcDir, since: gulp.lastRun(less) })
    .pipe(changed(distDir, { extension: ".wxss" }))
    // 引用公共变量
    .pipe(lessCompiler({
        globalVars: {
        },
    }))
    // .pipe(header(`@import (reference) "${srcDir}/styles/weui.wxss";\n`))
    // 改引用路径后缀
    .pipe(replace(/@import\s*['"](.*)\.\s*less\s*['"]\s*;/g, "@import '$1.wxss';"))
    // 改文件后缀
    .pipe(rename({ extname: ".wxss" }))
    .pipe(gulp.dest(distDir))
}

/**
 * 复制静态文件
 * @returns 
 */
const copy = function(){
    return gulp.src(srcCopyList, {
        base: srcDir,
        since: gulp.lastRun(copy)
    })
    .pipe(
        gulp.dest(distDir)
    )
}

exports.test = gulp.series(
    copy,
    esbuild,
    less
)
  