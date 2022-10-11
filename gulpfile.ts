
import gulpEsbuild from "gulp-esbuild"
import * as gulp from "gulp"
import path from "path"
const lessCompiler = require("gulp-less")
const LessCleanCss = require("less-plugin-clean-css")
const changed = require("gulp-changed")
const replace = require("gulp-replace")
const rename = require("gulp-rename")
const del = require("del")
// const header = require("gulp-header")

interface WatchOpts extends gulp.WatchOptions {
    /** @types/gulp 没有更新这个属性 */
    events: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir' | 'ready' | 'error' | 'all'
  }


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
const cleanCss = new LessCleanCss()

// --------------------------   下面是任务
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
        plugin: [
            cleanCss
        ],
        globalVars: {
        },
    }))
    // .pipe(header(`@import (reference) "${srcDir}/styles/weui.wxss";\n`))
    // 改引用路径后缀
    .pipe(replace(/@import\s*(?:.*?)['"](.*)\.\s*less\s*['"]\s*;/g, "@import '$1.wxss';"))
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

/** 清空dist，build 的时候执行 */
const clean = (cb: any): any => {
    return del([distDir], cb)
}

exports.clean = clean

/**
 * 监听列表
 * [路径, 任务func, 监听删除 生成后的扩展名(不变 "")(不监听删除 false)]
 */
 const watchMap: Array<[string[], any, string?, any?]> = [
    [tsList, esbuild, "js"],
    [srcCopyList, copy, ""],
    [lessList, less, "wxss"],
]

/**
 * 默认任务
 */
const defaultTask = gulp.series(
    // clean,
    copy,
    esbuild,
    less
)
  
exports.default = defaultTask

const build = gulp.series(
    clean,
    defaultTask
)

exports.build = build

const watch = gulp.series(
    defaultTask,
    function watchAll(): void {
        watchMap.forEach((task) => {
            // 监听文件列表 模糊匹配 src/**/*.js
            const srcStrOrList = task[0]
            // 文件有变化后 触发的流程, 有可能不存在，不存在就使用精细化监听，
            let allChangeRunTask = task[1]
            // 文件删除之后，在dist也需要删除的文件后缀名， 比如 ts 对应的 文件后缀是js
            const extFileName = task[2]
            const watchOptions: WatchOpts = { events: 'all' }
            const watchTask = gulp.watch(srcStrOrList, watchOptions, gulp.series(allChangeRunTask))
            // 注册删除监听 没第三个参数就不用监听
            if (typeof extFileName !== "string") { return }
            watchTask.on("unlink", (filePath: string) => {
                // 适配构建后的文件名
                const renameFilePath = extFileName
                ? filePath.replace(/\..+?$/, "." + extFileName)
                : filePath
                console.log("del file path:", renameFilePath)
                const filePathFromSrc = path.relative(path.resolve(srcDir), renameFilePath)

                const destFilePath = path.resolve(distDir, filePathFromSrc)

                del.sync(destFilePath)
            })
        })
    }
)

exports.watch = watch

const restart = gulp.series(
    clean,
    watch
)

exports.restart = restart