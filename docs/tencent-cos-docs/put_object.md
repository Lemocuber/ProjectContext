# PUT Object

最近更新时间：2026-03-03

## 功能描述

\`PUT Object\` 接口用于将本地对象（Object）上传至指定存储桶。调用者需要对存储桶具有写入权限。若无权限，请先配置访问权限。若需要通过 HTML 表单上传，请使用 \`POST Object\` 接口。

---

## 注意事项

- 单个 \`PUT Object\` 请求最大支持上传 **5GB 文件**。  
- 如果需要上传超过 5GB 的文件，需要使用 **分块上传（Multipart Upload）**。  
- 如果请求头 \`Content-Length\` 小于实际请求体长度，COS 仍会成功创建对象，但只会保存 \`Content-Length\` 指定的大小，其余数据会被丢弃。  
- COS 中没有真实的目录结构，通过 \`/\` 来模拟路径。
  - 例如：\`doc/picture.png\` 表示对象 \`picture.png\` 位于 \`doc\` 目录。
  - 例如：\`doc/\` 表示创建一个名为 \`doc\` 的目录占位对象。  
- 上传同名对象会覆盖旧对象。如果不希望覆盖，需要开启 **版本控制**。

---

# 授权说明

在 CAM 策略中需要授予如下权限：

\`\`\`json
{
  "version": "2.0",
  "statement": [
    {
      "action": [
        "name/cos:PutObject"
      ],
      "effect": "allow",
      "resource": [
        "qcs::cos:ap-beijing:uid/1250000000:examplebucket-1250000000/doc/*"
      ]
    }
  ]
}
\`\`\`

---

# 请求

## 请求语法

\`\`\`http
PUT /<ObjectKey> HTTP/1.1
Host: <BucketName-APPID>.cos.<Region>.myqcloud.com
Date: GMT Date
Content-Type: Content Type
Content-Length: Content Length
Content-MD5: MD5
Authorization: Auth String

[Object Content]
\`\`\`

说明：

- \`Host\`：格式  
  \`<BucketName-APPID>.cos.<Region>.myqcloud.com\`
- \`BucketName-APPID\`：带 APPID 的存储桶名称  
- \`Region\`：存储桶所在地域  
- \`Authorization\`：请求签名

---

## 请求参数

该接口 **无 Query 参数**。

---

# 请求头

除公共请求头外，还支持以下请求头。

## 常规请求头

| 名称 | 描述 | 必选 |
|---|---|---|
| Cache-Control | RFC2616 缓存控制，将作为对象元数据 | 否 |
| Content-Disposition | 下载方式，例如 \`inline\` 或 \`attachment\` | 否 |
| Content-Encoding | 编码格式 | 否 |
| Content-Type | MIME 类型，例如 \`image/jpeg\` | 是 |
| Expires | 缓存过期时间 | 否 |
| Transfer-Encoding | 传输编码，例如 \`chunked\` | 否 |

---

## 自定义元数据请求头

| 名称 | 描述 |
|---|---|
| x-cos-meta-[suffix] | 自定义元数据 |

示例：

\`\`\`
x-cos-meta-test: test metadata
\`\`\`

限制：

- 单条最大 **2KB**
- 总大小最大 **4KB**
- 仅支持 \`-\`、数字、字母

---

## 存储类型

| Header | 描述 |
|---|---|
| x-cos-storage-class | 指定对象存储类型 |

支持值：

- \`STANDARD\`
- \`STANDARD_IA\`
- \`ARCHIVE\`
- \`DEEP_ARCHIVE\`
- \`MAZ_STANDARD\`
- \`MAZ_STANDARD_IA\`
- \`MAZ_ARCHIVE\`
- \`INTELLIGENT_TIERING\`
- \`MAZ_INTELLIGENT_TIERING\`

---

## 流量控制

| Header | 描述 |
|---|---|
| x-cos-traffic-limit | 限速值（bit/s） |

范围：

\`\`\`
819200 – 838860800
(800Kb/s – 800Mb/s)
\`\`\`

---

## 对象标签

| Header | 描述 |
|---|---|
| x-cos-tagging | 设置对象标签 |

示例：

\`\`\`
Key1=Value1&Key2=Value2
\`\`\`

最多 **10 个标签**。

---

## 防覆盖上传

| Header | 描述 |
|---|---|
| x-cos-forbid-overwrite | 是否禁止覆盖 |

值：

- \`true\`
- \`false\`

---

## ACL 请求头

| Header | 描述 |
|---|---|
| x-cos-acl | 对象 ACL |

值：

- \`default\`
- \`private\`
- \`public-read\`

授权示例：

\`\`\`
x-cos-grant-read: id="100000000001"
\`\`\`

---

## 服务端加密

上传对象时可以指定服务端加密。

示例：

\`\`\`
x-cos-server-side-encryption: AES256
\`\`\`

---

# 请求体

请求体为 **对象内容（文件数据）**。

---

# 响应

## 响应头

### 版本控制

| Header | 描述 |
|---|---|
| x-cos-version-id | 对象版本 ID |

仅在开启版本控制时返回。

---

### SSE 相关头

若启用服务端加密，会返回对应 SSE Header。

---

## 响应体

响应体为空。

---

# 使用案例

## 示例一：简单上传

### 请求

\`\`\`http
PUT /exampleobject HTTP/1.1
Host: examplebucket-1250000000.cos.ap-beijing.myqcloud.com
Date: Fri, 10 Apr 2020 09:35:05 GMT
Content-Type: image/jpeg
Content-Length: 16
Content-MD5: 7o3pGNBWQBRbGPcPTDqmAg==
Authorization: q-sign-algorithm=sha1&q-ak=...&q-signature=...

[Object Content]
\`\`\`

### 响应

\`\`\`http
HTTP/1.1 200 OK
Content-Length: 0
ETag: "ee8de918d05640145b18f70f4c3aa602"
Server: tencent-cos
x-cos-hash-crc64ecma: 16749565679157681890
\`\`\`

---

## 示例二：上传并设置元数据与 ACL

### 请求

\`\`\`http
PUT /exampleobject HTTP/1.1
Host: examplebucket-1250000000.cos.ap-beijing.myqcloud.com
Content-Type: image/jpeg
Cache-Control: max-age=86400
Content-Disposition: attachment; filename=example.jpg
x-cos-meta-example-field: example-value
x-cos-acl: public-read
Content-Length: 16
Authorization: q-sign-algorithm=sha1&...

[Object Content]
\`\`\`

---

## 示例三：使用 SSE-COS

\`\`\`http
x-cos-server-side-encryption: AES256
\`\`\`

---

## 示例四：使用 SSE-KMS

\`\`\`http
x-cos-server-side-encryption: cos/kms
x-cos-server-side-encryption-cos-kms-key-id: <kms-key-id>
\`\`\`

---

## 示例五：使用 SSE-C

\`\`\`http
x-cos-server-side-encryption-customer-algorithm: AES256
x-cos-server-side-encryption-customer-key: <base64-key>
x-cos-server-side-encryption-customer-key-MD5: <md5>
\`\`\`

---

## 示例六：启用版本控制

响应中会返回：

\`\`\`
x-cos-version-id: <version-id>
\`\`\`

---

## 示例七：暂停版本控制

不会返回 \`x-cos-version-id\`。

---

## 示例八：Chunked 上传

\`\`\`http
Transfer-Encoding: chunked
\`\`\`

请求体以 chunked 方式分块传输。

---

## 示例九：防止覆盖

\`\`\`http
x-cos-forbid-overwrite: true
\`\`\`

若对象存在，返回：

\`\`\`
HTTP/1.1 409 Conflict
Code: FileAlreadyExists
\`\`\`

---

# 错误码

接口遵循 COS 统一错误码规范。