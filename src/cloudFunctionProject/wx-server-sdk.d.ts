export * from "@types/wx-server-sdk"

export declare function getWXContext(): {
  OPENID: string;
  APPID: string;
  UNIONID: string;
  // 调用来源方信息，跨账号时有
  FROM_OPENID: string;
  FROM_APPID: string;
  FROM_UNIONID: string;
  ENV: string;
  SOURCE: "wx_devtools" | "wx_client" | "wx_http" | "wx_unknown" | "其他";
}
