# 生成预签名 URL

最近更新时间：2025-05-21

## 简介

Node.js SDK 提供获取对象 URL、获取请求预签名 URL 接口。

建议使用**临时密钥**生成预签名，通过临时授权方式提升安全性。申请临时密钥时应遵循**最小权限原则**，避免泄露桶或对象之外的资源。申请临时密钥时 action 需要包含：

\`name/cos:GetObject\`

如果必须使用永久密钥生成预签名，建议仅授予上传或下载权限以降低风险。

使用预签名 URL 上传时，最大支持 **5GB 文件**。

---

## 注意事项

- **2024-01-01 之后创建的桶**不支持使用默认域名在浏览器预览文件，建议配置**自定义域名**。
- 获取签名 / 预签名函数默认会签入 Header \`Host\`。
- 可以选择不签入 \`Host\`，但可能导致请求失败或安全漏洞。
- 预签名 URL 支持使用**永久密钥**或**临时密钥**生成。

### 前期准备

确保已经完成 **SDK 初始化**。

---

# 获取请求预签名 URL（推荐）

## 获取不带签名 Object URL

\`\`\`javascript
var url = cos.getObjectUrl({
  Bucket: 'examplebucket-1250000000',
  Region: 'COS_REGION',
  Key: '1.jpg',
  Sign: false,
});
\`\`\`

---

## 获取带签名 Object URL

\`\`\`javascript
var url = cos.getObjectUrl({
  Bucket: 'examplebucket-1250000000',
  Region: 'COS_REGION',
  Key: '头像.jpg',
});
\`\`\`

---

## 通过 callback 获取带签名 URL

如果签名过程需要异步获取（例如通过 \`getAuthorization\` 获取临时密钥），需要使用 callback。

\`\`\`javascript
cos.getObjectUrl(
  {
    Bucket: 'examplebucket-1250000000',
    Region: 'COS_REGION',
    Key: '头像.jpg',
  },
  function (err, data) {
    console.log(err || data.Url);
  }
);
\`\`\`

---

## 指定链接有效时间

\`\`\`javascript
cos.getObjectUrl(
  {
    Bucket: 'examplebucket-1250000000',
    Region: 'COS_REGION',
    Key: '头像.jpg',
    Sign: true,
    Expires: 3600,
  },
  function (err, data) {
    console.log(err || data.Url);
  }
);
\`\`\`

---

## 获取文件 URL 并下载文件

\`\`\`javascript
var axios = require('axios');
var fs = require('fs');

cos.getObjectUrl(
  {
    Bucket: 'examplebucket-1250000000',
    Region: 'COS_REGION',
    Key: '头像.jpg',
    Sign: true,
  },
  function (err, data) {
    if (err) return console.log(err);

    function download(url, retryTimes) {
      axios({
        method: 'get',
        url: url,
        responseType: 'stream',
      })
        .then((res) => {
          var writeStream = fs.createWriteStream(__dirname + '/头像.jpg');
          res.data.pipe(writeStream);
        })
        .catch((err) => {
          if (Math.floor(err.response.status / 100) === 5 && retryTimes === 0) {
            retryTimes++;
            download(url, retryTimes);
          } else {
            console.log('下载失败');
          }
        });
    }

    download(data.Url, 0);
  }
);
\`\`\`

---

## 生成预签名 URL（带 Query 和 Header）

\`\`\`javascript
cos.getObjectUrl(
  {
    Bucket: 'examplebucket-1250000000',
    Region: 'COS_REGION',
    Key: '头像.jpg',
    Sign: true,
    Query: {
      'imageMogr2/thumbnail/200x/': '',
    },
    Headers: {
      host: 'xxx',
    },
  },
  function (err, data) {
    console.log(err || data.Url);
  }
);
\`\`\`

---

## 获取预签名 Put Object 上传 URL

\`\`\`javascript
const axios = require('axios');
const fs = require('fs');

cos.getObjectUrl(
  {
    Bucket: 'examplebucket-1250000000',
    Region: 'COS_REGION',
    Key: '头像.jpg',
    Method: 'PUT',
    Sign: true,
  },
  function (err, data) {
    if (err) return console.log(err);

    function upload(url, retryTimes) {
      const fileStream = fs.createReadStream(__dirname + '/1.jpg');

      axios({
        method: 'PUT',
        url: url,
        data: fileStream,
      })
        .then((data) => {
          console.log('上传成功', data);
        })
        .catch((err) => {
          if (Math.floor(err.response.status / 100) === 5 && retryTimes === 0) {
            retryTimes++;
            upload(url, retryTimes);
          } else {
            console.log('上传失败');
          }
        });
    }

    upload(data.Url, 0);
  }
);
\`\`\`

---

# 参数说明

## 入参

| 参数 | 描述 | 类型 | 必填 |
|---|---|---|---|
| Bucket | 存储桶名称，格式：BucketName-APPID | String | 是 |
| Region | 存储桶地域 | String | 是 |
| Key | 对象键（文件名） | String | 是 |
| Sign | 是否返回带签名 URL，默认 true | Boolean | 否 |
| Protocol | \`http:\` 或 \`https:\` | String | 否 |
| Domain | 自定义访问域名 | String | 否 |
| Method | HTTP 方法，如 get / post / delete / head | String | 否 |
| Query | 签名中需要包含的 Query | Object | 否 |
| Headers | 签名中需要包含的 Header | Object | 否 |
| Expires | 签名过期时间（秒），默认 900 | Number | 否 |

注意：

如果使用临时密钥生成预签名 URL，其有效期取 **临时密钥有效期与签名有效期中的较短值**。

---

## 返回值

返回一个字符串 URL：

1. 如果签名可以同步计算（例如实例化时提供 SecretId 和 SecretKey），则返回**带签名 URL**。
2. 否则返回**不带签名 URL**。

---

## 回调函数

\`\`\`javascript
function(err, data) {}
\`\`\`

| 参数 | 描述 |
|---|---|
| err | 错误对象 |
| data | 返回数据对象 |

data 结构：

| 字段 | 描述 |
|---|---|
| Url | 计算得到的 URL |

---

# 生成签名后拼接预签名 URL

COS XML API 私有资源访问需要 **Authorization 鉴权凭证**。

使用方式：

1. 放在 Header：\`authorization\`
2. 放在 URL：\`sign\`

\`COS.getAuthorization\` 用于生成 Authorization。

⚠️ 仅建议用于**前端调试**，生产环境不建议在前端生成签名，以免暴露密钥。

---

## 使用案例

\`\`\`javascript
var COS = require('cos-nodejs-sdk-v5');

var Authorization = COS.getAuthorization({
  SecretId: process.env.SecretId,
  SecretKey: process.env.SecretKey,
  Method: 'get',
  Key: 'a.jpg',
  Expires: 60,
  Query: {},
  Headers: {},
});
\`\`\`

---

# 参数说明

| 参数 | 描述 | 类型 | 必填 |
|---|---|---|---|
| SecretId | 用户 SecretId | String | 是 |
| SecretKey | 用户 SecretKey | String | 是 |
| Method | HTTP 方法 | String | 是 |
| Key | 对象键 | String | 否 |
| Query | Query 参数 | Object | 否 |
| Headers | Header 参数 | Object | 否 |
| Expires | 过期时间（秒） | Number | 否 |

---

## 返回值

返回字符串：

\`authorization\`