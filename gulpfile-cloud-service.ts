
import gulp from "gulp"
const path = require("path")
const tsCompiler = require("gulp-typescript")
const del = require("del")
const changed = require("gulp-changed")
import { wxCloudApiService } from "./script/gen-wx-cloud-service"

// 云环境项目目录
const cloudFunctionProjectDir = "./src/cloudFunctionProject"
const cloudFunctionDistDir = `${cloudFunctionProjectDir}/cloudfunctions`
const cloudFunctionSrcDir = `${cloudFunctionProjectDir}/src`
const cloudFunctionTsSrc = `${cloudFunctionSrcDir}/**/*.ts`
// 环境
const env = process.env.NODE_ENV || "dev"
console.log("env", env, env === 'cloudService' ?
`${cloudFunctionProjectDir}/tsconfig.wxCloudService.json` :
`${cloudFunctionProjectDir}/tsconfig.json`);

// 
const cloudFunctionTsProject = tsCompiler.createProject(
    path.join(__dirname, env === 'cloudService' ?
    `${cloudFunctionProjectDir}/tsconfig.wxCloudService.json` :
    `${cloudFunctionProjectDir}/tsconfig.json`)
)
  
  const cleanCloudFunction = (cb: any): any => del(cloudFunctionDistDir, cb)
  
  const cloudFunctionTs = (): any => {
    return gulp.src("src/cloudFunctionProject/src/**/*.ts")
      .pipe(cloudFunctionTsProject())
      .pipe(gulp.dest("src/cloudFunctionProject/cloudfunctions"))
  }
  
  const cloudFunctionJson = (): any => {
    return gulp.src(`${cloudFunctionProjectDir}/src/**/*.+(json)`)
      .pipe(gulp.dest(cloudFunctionDistDir))
  }

const cloudBase = gulp.series(
    cleanCloudFunction,
    cloudFunctionTs,
    cloudFunctionJson,
)



const cloudMini = gulp.series(
    cloudBase,
    wxCloudApiService,
)
  
exports.cloudMini = cloudMini