# 海关业务运行监控中心

静态网站，无需安装依赖或构建。

## 文件结构

```text
index.html                                    首页：10 个驾驶舱方案
界面布局方案.html                             旧入口，跳转至首页
业务运行监控中心_方案7_三列全局滚动条.html      四合一成品页
v3-assets/                                    四合一成品页所需资源
  dash-base.css
  overview-cockpit.css
  dash-core.js
.nojekyll                                     直接发布静态文件
README.md                                     本说明
```

首页已内联样式、脚本与地图，不依赖开发目录。左侧“四类业务，一屏摘要”下的“查看四合一成品”会打开独立成品页。

## 上传

将本文件夹内的文件及 `v3-assets` 目录放在 `qpalzm811.github.io` 仓库根目录，不要在仓库内再套一层同名文件夹。

GitHub Pages 使用你上传的分支及根目录发布。发布完成后，访问 `https://qpalzm811.github.io/` 即为方案首页。

开发脚本、截图与旧版本已另存至旁边的 `qpalzm811.github.io_开发备份_20261117` 文件夹，无需上传。
