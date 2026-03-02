在语音识别或翻译任务中，当特定的业务词汇（如产品名、专有名词）识别或翻译不准确时，可使用热词功能。通过将这些词汇添加为热词，可以优先处理它们，从而提升最终的识别或翻译准确率。

## 热词简介

热词功能通过提交一个JSON数组格式的词汇列表来提升特定词的识别准确率。数组中的每个对象用于定义一个热词及其属性。

**示例****1**：提升电影名称识别率（适用于 Fun-ASR 和 Paraformer 系列模型）

```
[
    {"text": "赛德克巴莱", "weight": 4, "lang": "zh"},
    {"text": "Seediq Bale", "weight": 4, "lang": "en"},
    {"text": "夏洛特烦恼", "weight": 4, "lang": "zh"},
    {"text": "Goodbye Mr. Loser", "weight": 4, "lang": "en"},
    {"text": "阙里人家", "weight": 4, "lang": "zh"},
    {"text": "Confucius' Family", "weight": 4, "lang": "en"}
]
```

**示例2**：提升电影名称识别和翻译准确率（仅适用于 Gummy 系列模型）

```
[
    {"text": "赛德克巴莱", "weight": 4, "lang": "zh", "target_lang": "en", "translation": "Seediq Bale"},
    {"text": "夏洛特烦恼", "weight": 4, "lang": "zh", "target_lang": "en", "translation": "Goodbye Mr. Loser"},
    {"text": "夏洛特烦恼", "weight": 4, "lang": "zh", "target_lang": "ja", "translation": "夏洛の特別な悩み"}
]
```

**字段说明**：

| **字段** | **类型** | **是否必填** | **说明** |
| --- | --- | --- | --- |
| text | string | 支持  | 热词文本。 热词文本的语言必须在所选模型的支持范围内，不同模型支持的语言各不相同。 热词用于提升识别/翻译的准确率，因此请使用实际词语而非任意字符组合。热词文本长度限制规则如下： - **含非ASCII字符时**：字符串的总字符数（包括汉字、日文假名、韩文谚文、俄文西里尔字母等非ASCII字符以及ASCII字符）不能超过15个。 示例： - ✅ `"厄洛替尼盐酸盐"`（7字符） - ✅ `"EGFR抑制剂"`（7字符，其中“EGFR”是ASCII字符，长度为4） - ✅ `"こんにちは"`（5字符） - ✅ `"Фенибут Белфарм"`（15字符，中间的空格也被计入） - ❌ `"Клофелин Белмедпрепараты"`（24字符） - **纯ASCII字符时**：字符串被空格分割的片段数不能超过7个。每个片段是由空格分隔的连续ASCII字符序列。 示例： - ✅ `"Exothermic reaction"` → 2个片段 - ✅ `"Human immunodeficiency virus type 1"` → 5个片段 - ❌ `"The effect of temperature variations on enzyme activity in biochemical reactions"` → 11个片段 |
| weight | int | 支持  | 热词权重。常用值：4。 取值范围：\\[1, 5\\]。 如果效果不明显可以适当增加权重，但是当权重较大时可能会引起负面效果，导致其他词语识别不准确。 |
| lang | string | 不支持 | 语言代码，支持对ASR模型对应的语种做热词加强。如果无法提前确定语种，可不设置，模型会自动识别语种。 具体语种和语言代码对应关系请参考模型的API详情页。请在调用语音识别服务使用指定同样的语种，如果指定识别语种language\\_hints后其他语种热词会失效。 |
| target\\_lang | string | 仅在使用Gummy系列模型时必填 | 翻译目标语言。仅适用于Gummy系列模型。 具体语种和语言代码对应关系请参见API详情。请在调用语音翻译服务时保证该字段和语音翻译时的翻译目标语言（Java：`translationTargetLanguages`，Python：`translation_target_languages`）一致，如果不一致，则只有和翻译目标语言相同语种的热词才会生效。 如果需要输出多路翻译，需要逐个指定热词翻译目标语种，例如，将中文翻译成英文和日语的热词示例如下： ``` [ {"text": "夏洛特烦恼", "lang": "zh", "target_lang": "en", "translation": "Goodbye Mr. Loser"}, {"text": "夏洛特烦恼", "lang": "zh", "target_lang": "ja", "translation": "夏洛の特別な悩み"} ] ``` |
| translation | string | 仅在使用Gummy系列模型时必填 | 希望热词翻译后的结果内容。仅适用于Gummy系列模型。 例如希望将“夏洛特烦恼”翻译成“Goodbye Mr. Loser”： ``` [{"text": "夏洛特烦恼", "lang": "zh", "target_lang": "en", "translation": "Goodbye Mr. Loser"}] ``` |

## 支持的模型

## 中国内地（北京）

-   **Fun-ASR：**
    
    -   **实时语音识别：**fun-asr-realtime、fun-asr-realtime-2025-11-07、fun-asr-realtime-2025-09-15
        
    -   **录音文件识别：**fun-asr、fun-asr-2025-11-07、fun-asr-2025-08-25、fun-asr-mtl、fun-asr-mtl-2025-08-25
        
-   **Gummy：**
    
    -   **长语音识别/翻译：**gummy-realtime-v1
        
    -   **短语音（一句话）识别/翻译：**gummy-chat-v1
        
-   **Paraformer：**
    
    -   **实时语音识别：**paraformer-realtime-v2、paraformer-realtime-8k-v2
        
    -   **录音文件识别：**paraformer-v2、paraformer-8k-v2
        

## 国际（新加坡）

**Fun-ASR：**

-   **实时语音识别：**fun-asr-realtime、fun-asr-realtime-2025-11-07
    
-   **录音文件识别：**fun-asr、fun-asr-2025-11-07、fun-asr-2025-08-25、fun-asr-mtl、fun-asr-mtl-2025-08-25
    

## 计费说明

热词功能免费。

## **热词数量限制**

1.  每个账号可创建10个热词列表（所有模型共享额度），如需扩容请进行申请
    
2.  每个热词列表最多可添加500个热词
    

## 快速开始：从创建热词到使用

### 工作流程

创建热词列表与使用热词列表进行语音识别是紧密关联的两个独立步骤，遵循“先创建，后使用”的流程：

1.  创建热词列表
    
    调用[创建](#a3c23233a5g29)热词列表接口。**此步骤必须指定**`**target_model**`**（Java中为**`**targetModel**`**），声明创建的热词列表将由哪个语音识别模型使用。**
    
    若已有创建好的热词列表（调用[查询所有](#40d779d9f1r24)热词列表接口查看），可跳过这一步直接进行下一步。
    
2.  使用热词列表进行语音识别。
    
    调用语音识别接口，传入热词列表ID。**此步骤指定的语音识别模型必须和创建热词列表时指定的**`**target_model**`**（Java中为**`**targetModel**`**）一致。**
    

### **准备工作**

1.  **获取API Key**：[获取API Key](https://help.aliyun.com/zh/model-studio/get-api-key)，为安全起见，推荐将API Key配置到环境变量。
    
2.  **安装SDK**：确保已[安装最新版DashScope SDK](https://help.aliyun.com/zh/model-studio/install-sdk)。
    

### **示例代码**

示例中用到的音频为：[asr\_example.wav](https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250210/elouas/asr_example.wav)。

## Python

```
import dashscope
from dashscope.audio.asr import *
import os


# 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
# 若没有配置环境变量，请用百炼API Key将下行替换为：dashscope.api_key = "sk-xxx"
dashscope.api_key = os.environ.get('DASHSCOPE_API_KEY')

# 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：https://dashscope-intl.aliyuncs.com/api/v1
dashscope.base_http_api_url = 'https://dashscope.aliyuncs.com/api/v1'

# 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：wss://dashscope-intl.aliyuncs.com/api-ws/v1/inference
dashscope.base_websocket_api_url='wss://dashscope.aliyuncs.com/api-ws/v1/inference'

prefix = 'testpfx'
target_model = "fun-asr-realtime"

my_vocabulary = [
    {"text": "语音实验室", "weight": 4}
]

service = VocabularyService()
vocabulary_id = service.create_vocabulary(
      prefix=prefix,
      target_model=target_model,
      vocabulary=my_vocabulary)

if service.query_vocabulary(vocabulary_id)['status'] == 'OK':
    recognition = Recognition(model=target_model,
                          format='wav',
                          sample_rate=16000,
                          callback=None,
                          vocabulary_id=vocabulary_id)
    result = recognition.call('asr_example.wav')
    print(result.output)

service.delete_vocabulary(vocabulary_id)
```

## Java

```
import com.alibaba.dashscope.audio.asr.recognition.Recognition;
import com.alibaba.dashscope.audio.asr.recognition.RecognitionParam;
import com.alibaba.dashscope.audio.asr.vocabulary.Vocabulary;
import com.alibaba.dashscope.audio.asr.vocabulary.VocabularyService;
import com.alibaba.dashscope.exception.InputRequiredException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.utils.Constants;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

public class Main {
    // 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    // 若没有配置环境变量，请用百炼API Key将下行替换为：public static String apiKey = "sk-xxx"
    public static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    public static void main(String[] args) throws NoApiKeyException, InputRequiredException {
        // 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：https://dashscope-intl.aliyuncs.com/api/v1
        Constants.baseHttpApiUrl = "https://dashscope.aliyuncs.com/api/v1";
        // 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：wss://dashscope-intl.aliyuncs.com/api-ws/v1/inference
        Constants.baseWebsocketApiUrl = "wss://dashscope.aliyuncs.com/api-ws/v1/inference";

        String targetModel = "fun-asr-realtime";

        JsonArray vocabularyJson = new JsonArray();
        List<Hotword> wordList = new ArrayList<>();
        wordList.add(new Hotword("语音实验室", 4));

        for (Hotword word : wordList) {
            JsonObject jsonObject = new JsonObject();
            jsonObject.addProperty("text", word.text);
            jsonObject.addProperty("weight", word.weight);
            vocabularyJson.add(jsonObject);
        }

        VocabularyService service = new VocabularyService(apiKey);
        Vocabulary vocabulary = service.createVocabulary(targetModel, "testpfx", vocabularyJson);

        if ("OK".equals(service.queryVocabulary(vocabulary.getVocabularyId()).getStatus())) {
            Recognition recognizer = new Recognition();
            // 创建RecognitionParam
            RecognitionParam param =
                    RecognitionParam.builder()
                            .model(targetModel)
                            .apiKey(apiKey)
                            .format("wav")
                            .sampleRate(16000)
                            .build();

            try {
                System.out.println("识别结果：" + recognizer.call(param, new File("asr_example.wav")));
            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                // 任务结束后关闭 WebSocket 连接
                recognizer.getDuplexApi().close(1000, "bye");
            }
        }

        service.deleteVocabulary(vocabulary.getVocabularyId());
        System.exit(0);
    }
}

class Hotword {
    String text;
    int weight;

    public Hotword(String text, int weight) {
        this.text = text;
        this.weight = weight;
    }
}
```

## **API参考**

使用不同API时，请确保使用同一账号进行操作。

### **创建热词列表**

热词列表JSON的格式请参见[热词简介](#41da228156kvm)。

## Python SDK

-   **接口说明**
    
    **重要**
    
    `target_model`：使用热词列表的语音识别模型，须和后续调用语音识别接口时使用的语音识别模型一致
    
    ```
    def create_vocabulary(self, target_model: str, prefix: str, vocabulary: List[dict]) -> str:
        '''
        创建热词列表
        param: target_model 热词列表对应的语音识别模型，必须与后续调用语音识别接口时使用的语音识别模型一致
        param: prefix 热词列表自定义前缀，仅允许数字和小写字母，小于十个字符。
        param: vocabulary 热词列表JSON
        return: 热词列表ID
        '''
    ```
    
-   **示例代码**
    
    ```
    import dashscope
    from dashscope.audio.asr import *
    import os
    
    # 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    # 若没有配置环境变量，请用百炼API Key将下行替换为：dashscope.api_key = "sk-xxx"
    dashscope.api_key = os.environ.get('DASHSCOPE_API_KEY')
    
    # 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：https://dashscope-intl.aliyuncs.com/api/v1
    dashscope.base_http_api_url = 'https://dashscope.aliyuncs.com/api/v1'
    
    prefix = 'testpfx'
    target_model = "fun-asr"
    
    my_vocabulary = [
        {"text": "赛德克巴莱", "weight": 4}
    ]
    
    # 创建热词
    service = VocabularyService()
    vocabulary_id = service.create_vocabulary(
        prefix=prefix,
        target_model=target_model,
        vocabulary=my_vocabulary)
    
    print(f"热词列表ID为：{vocabulary_id}")
    ```
    

## Java SDK

-   **接口说明**
    
    **重要**
    
    `targetModel`：使用热词列表的语音识别模型，须和后续调用语音识别接口时使用的语音识别模型一致
    
    ```
    /**
     * 创建新的热词列表
     *
     * @param targetModel 热词列表对应的语音识别模型，必须与后续调用语音识别接口时使用的语音识别模型一致
     * @param prefix 热词自定义前缀，仅允许数字和小写字母，小于十个字符。
     * @param vocabulary 热词列表JSON
     * @return 热词列表对象
     * @throws NoApiKeyException 如果apikey为空
     * @throws InputRequiredException 如果必须参数为空
     */
    public Vocabulary createVocabulary(String targetModel, String prefix, JsonArray vocabulary)
        throws NoApiKeyException, InputRequiredException 
    ```
    
-   **示例代码**
    
    ```
    import com.alibaba.dashscope.audio.asr.vocabulary.Vocabulary;
    import com.alibaba.dashscope.audio.asr.vocabulary.VocabularyService;
    import com.alibaba.dashscope.exception.InputRequiredException;
    import com.alibaba.dashscope.exception.NoApiKeyException;
    import com.alibaba.dashscope.utils.Constants;
    import com.google.gson.JsonArray;
    import com.google.gson.JsonObject;
    
    import java.util.ArrayList;
    import java.util.List;
    
    public class Main {
        // 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
        // 若没有配置环境变量，请用百炼API Key将下行替换为：public static String apiKey = "sk-xxx"
        public static String apiKey = System.getenv("DASHSCOPE_API_KEY");
    
        public static void main(String[] args) throws NoApiKeyException, InputRequiredException {
            // 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：https://dashscope-intl.aliyuncs.com/api/v1
            Constants.baseHttpApiUrl = "https://dashscope.aliyuncs.com/api/v1";
            String targetModel = "fun-asr";
    
            JsonArray vocabularyJson = new JsonArray();
            List<Hotword> wordList = new ArrayList<>();
            wordList.add(new Hotword("吴贻弓", 4));
            wordList.add(new Hotword("阙里人家", 4));
    
            for (Hotword word : wordList) {
                JsonObject jsonObject = new JsonObject();
                jsonObject.addProperty("text", word.text);
                jsonObject.addProperty("weight", word.weight);
                vocabularyJson.add(jsonObject);
            }
    
            VocabularyService service = new VocabularyService(apiKey);
            Vocabulary vocabulary = service.createVocabulary(targetModel, "testpfx", vocabularyJson);
            System.out.println("热词列表ID：" + vocabulary.getVocabularyId());
        }
    }
    
    class Hotword {
        String text;
        int weight;
        String lang;
    
        public Hotword(String text, int weight) {
            this.text = text;
            this.weight = weight;
        }
    }
    ```
    

## RESTful API

-   **URL**
    
    中国内地（北京）：
    
    ```
    POST https://dashscope.aliyuncs.com/api/v1/services/audio/asr/customization
    ```
    
    国际（新加坡）：
    
    ```
    POST https://dashscope-intl.aliyuncs.com/api/v1/services/audio/asr/customization
    ```
    
-   **请求头**
    
    | **参数** | **类型** | **是否必须** | **说明** |
    | --- | --- | --- | --- |
    | Authorization | string | 支持  | 鉴权令牌，格式为`Bearer <your_api_key>`，使用时，将“`<your_api_key>`”替换为实际的API Key。 |
    | Content-Type | string | 支持  | 请求体中传输的数据的媒体类型。固定为`application/json`。 |
    
-   **消息体**
    
    包含所有请求参数的消息体如下，对于可选字段，在实际业务中可根据需求省略。
    
    **重要**
    
    注意区分如下参数：
    
    -   `model`：定制热词模型，固定为`speech-biasing`
        
    -   `target_model`：使用热词列表的语音识别模型，须和后续调用语音识别接口时使用的语音识别模型一致
        
    
    ```
    {
        "model": "speech-biasing",
        "input": {
            "action": "create_vocabulary",
            "target_model": "fun-asr",
            "prefix": "testpfx",
            "vocabulary": [
              {"text": "赛德克巴莱", "weight": 4, "lang": "zh"}
            ]
        }
    }
    ```
    
-   **请求参数**
    
    | **参数** | **类型** | **默认值** | **是否必须** | **说明** |
    | --- | --- | --- | --- | --- |
    | model | string | \\- | 支持  | 定制热词模型，固定为`speech-biasing`。 |
    | action | string | \\- | 支持  | 操作类型，固定为`create_vocabulary`。 |
    | target\\_model | string | \\- | 支持  | 使用热词列表的语音识别模型。详情请参见[支持的模型](#ec3ff461ecoxz)。 必须与后续调用语音识别接口时使用的语音识别模型一致。 |
    | prefix | string | \\- | 支持  | 为热词列表指定一个便于识别的名称（仅允许数字和小写字母，长度小于十个字符）。 > 该关键字会在热词列表ID中出现，例如关键字为“testpfx”，最终热词列表ID为“vocab-testpfx-51773d05xxxxxx” |
    | vocabulary | array\\[object\\] | \\- | 支持  | 热词列表JSON，详情请参见[热词简介](#41da228156kvm)。 |
    
-   **响应参数**
    
    **点击查看响应示例**
    
    ```
    {
        "output": {
            "vocabulary_id": "vocab-testpfx-5112c3de3705486baxxxxxxx"
        },
        "usage": {
            "count": 1
        },
        "request_id": "aee47022-2352-40fe-acfa-xxxx"
    }
    ```
    
    需关注的参数如下：
    
    | **参数** | **类型** | **说明** |
    | --- | --- | --- |
    | vocabulary\\_id | string | 热词列表ID。 |
    
-   **示例代码**
    
    cURL示例如下（Java和Python示例请参见对应的SDK）。
    
    若未将API Key配置到环境变量，需将示例中的`$DASHSCOPE_API_KEY`替换为实际的API Key。
    
    ```
    # ======= 重要提示 =======
    # 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：https://dashscope-intl.aliyuncs.com/api/v1/services/audio/asr/customization
    # 新加坡地域和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    # === 执行时请删除该注释 ===
    
    curl -X POST https://dashscope.aliyuncs.com/api/v1/services/audio/asr/customization \
    -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "model": "speech-biasing",
        "input": {
            "action": "create_vocabulary",
            "target_model": "fun-asr",
            "prefix": "testpfx",
            "vocabulary": [
              {"text": "赛德克巴莱", "weight": 4}
            ]
        }
    }'
    ```
    

### **查询所有热词列表**

## Python SDK

-   **接口说明**
    
    ```
    def list_vocabularies(self, prefix=None, page_index: int = 0, page_size: int = 10) -> List[dict]:
        '''
        查询已创建的所有热词列表
        param: prefix 自定义前缀，如果设定则只返回指定前缀的热词列表标识符列表。
        param: page_index 查询的页索引
        param: page_size 查询页大小
        return: 热词列表标识符列表
        '''
    ```
    
-   **示例代码**
    
    ```
    import dashscope
    from dashscope.audio.asr import *
    import json
    import os
    
    # 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    # 若没有配置环境变量，请用百炼API Key将下行替换为：dashscope.api_key = "sk-xxx"
    dashscope.api_key = os.environ.get('DASHSCOPE_API_KEY')
    
    # 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：https://dashscope-intl.aliyuncs.com/api/v1
    dashscope.base_http_api_url = 'https://dashscope.aliyuncs.com/api/v1'
    
    service = VocabularyService()
    vocabularies = service.list_vocabularies()
    print(f"热词列表：{json.dumps(vocabularies)}")
    ```
    
-   **响应参数**
    
    **点击查看响应示例**
    
    ```
    [
      {
        "gmt_create": "2025-04-22 14:23:35",
        "vocabulary_id": "vocab-testpfx-5112c3de3705486baxxxxxxx",
        "gmt_modified": "2025-04-22 14:23:35",
        "status": "OK"
      }
    ]
    ```
    
    需关注的参数如下：
    
    | **参数** | **类型** | **说明** |
    | --- | --- | --- |
    | vocabulary\\_id | string | 热词列表ID。 |
    | gmt\\_create | string | 创建热词列表的时间。 |
    | gmt\\_modified | string | 修改热词列表的时间。 |
    | status | string | 状态： - OK：可调用 - UNDEPLOYED：不可调用。 |
    

## Java SDK

-   **接口说明**
    
    ```
    /**
     * 查询已创建的所有热词列表。默认的页索引为0，默认的页大小为10
     *
     * @param prefix 热词自定义前缀
     * @return 热词列表对象数组
     * @throws NoApiKeyException 如果apikey为空
     * @throws InputRequiredException 如果必须参数为空
     */
    public Vocabulary[] listVocabulary(String prefix)
        throws NoApiKeyException, InputRequiredException
    
    /**
     * 查询已创建的所有热词列表
     *
     * @param prefix 热词自定义前缀
     * @param pageIndex 查询的页索引
     * @param pageSize 查询的页大小
     * @return 热词列表对象数组
     * @throws NoApiKeyException 如果apikey为空
     * @throws InputRequiredException 如果必须参数为空
     */
    public Vocabulary[] listVocabulary(String prefix, int pageIndex, int pageSize)
        throws NoApiKeyException, InputRequiredException
    ```
    
-   **示例代码**
    
    ```
    import com.alibaba.dashscope.audio.asr.vocabulary.Vocabulary;
    import com.alibaba.dashscope.audio.asr.vocabulary.VocabularyService;
    import com.alibaba.dashscope.exception.InputRequiredException;
    import com.alibaba.dashscope.exception.NoApiKeyException;
    import com.alibaba.dashscope.utils.Constants;
    import com.google.gson.Gson;
    import com.google.gson.GsonBuilder;
    
    public class Main {
        // 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
        // 若没有配置环境变量，请用百炼API Key将下行替换为：public static String apiKey = "sk-xxx"
        public static String apiKey = System.getenv("DASHSCOPE_API_KEY");
    
        public static void main(String[] args) throws NoApiKeyException, InputRequiredException {
            // 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：https://dashscope-intl.aliyuncs.com/api/v1
            Constants.baseHttpApiUrl = "https://dashscope.aliyuncs.com/api/v1";
    
            VocabularyService service = new VocabularyService(apiKey);
            Vocabulary[] vocabularies = service.listVocabulary("testpfx");
            Gson gson = new GsonBuilder()
                    .setPrettyPrinting()
                    .create();
            System.out.println("热词列表：" + gson.toJson(vocabularies));
        }
    }
    ```
    
-   **点击查看响应示例**
    
    ```
    [
      {
        "gmt_create": "2025-04-22 14:23:35",
        "vocabulary_id": "vocab-testpfx-5112c3de3705486baxxxxxxx",
        "gmt_modified": "2025-04-22 14:23:35",
        "status": "OK"
      }
    ]
    ```
    
    需关注的参数如下：
    
    | **参数** | **类型** | **说明** |
    | --- | --- | --- |
    | vocabulary\\_id | string | 热词列表ID。 |
    | gmt\\_create | string | 创建热词列表的时间。 |
    | gmt\\_modified | string | 修改热词列表的时间。 |
    | status | string | 状态： - OK：可调用 - UNDEPLOYED：不可调用。 |
    

## RESTful API

-   **URL**
    
    中国内地（北京）：
    
    ```
    POST https://dashscope.aliyuncs.com/api/v1/services/audio/asr/customization
    ```
    
    国际（新加坡）：
    
    ```
    POST https://dashscope-intl.aliyuncs.com/api/v1/services/audio/asr/customization
    ```
    
-   **请求头**
    
    | **参数** | **类型** | **是否必须** | **说明** |
    | --- | --- | --- | --- |
    | Authorization | string | 支持  | 鉴权令牌，格式为`Bearer <your_api_key>`，使用时，将“`<your_api_key>`”替换为实际的API Key。 |
    | Content-Type | string | 支持  | 请求体中传输的数据的媒体类型。固定为`application/json`。 |
    
-   **消息体**
    
    包含所有请求参数的消息体如下，对于可选字段，在实际业务中可根据需求省略。
    
    **重要**
    
    `model`：定制热词模型，固定为`speech-biasing`
    
    ```
    {
        "model": "speech-biasing",
        "input": {
            "action": "list_vocabulary",
            "prefix": "testpfx",
            "page_index": 0,
            "page_size": 10
        }
    }
    ```
    
-   **请求参数**
    
    | **参数** | **类型** | **默认值** | **是否必须** | **说明** |
    | --- | --- | --- | --- | --- |
    | model | string | \\- | 支持  | 定制热词模型，固定为`speech-biasing`。 |
    | action | string | \\- | 支持  | 操作类型，固定为`list_vocabulary`。 |
    | prefix | string | \\- | 不支持 | 热词列表自定义前缀，仅允许数字和小写字母，小于十个字符。 |
    | page\\_index | integer | 0   | 不支持 | 页码索引，从0开始计数。 |
    | page\\_size | integer | 10  | 不支持 | 每页包含数据条数。 |
    
-   **响应参数**
    
    **点击查看响应示例**
    
    ```
    {
      "output": {
        "vocabulary_list": [
          {
            "gmt_create": "2025-12-19 11:47:11",
            "gmt_modified": "2025-12-19 11:47:11",
            "status": "OK",
            "vocabulary_id": "vocab-testpfx-xxxxxxxx"
          }
        ]
      },
      "usage": {
        "count": 1
      },
      "request_id": "10e8cde2-b711-4609-b19b-xxxxxx"
    }
    ```
    
    需关注的参数如下：
    
    | **参数** | **类型** | **说明** |
    | --- | --- | --- |
    | vocabulary\\_id | string | 热词列表ID。 |
    | gmt\\_create | string | 创建热词列表的时间。 |
    | gmt\\_modified | string | 修改热词列表的时间。 |
    | status | string | 状态： - OK：可调用 - UNDEPLOYED：不可调用。 |
    
-   **示例代码**
    
    cURL示例如下（Java和Python示例请参见对应的SDK）。
    
    若未将API Key配置到环境变量，需将示例中的`$DASHSCOPE_API_KEY`替换为实际的API Key。
    
    ```
    # ======= 重要提示 =======
    # 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：https://dashscope-intl.aliyuncs.com/api/v1/services/audio/asr/customization
    # 新加坡地域和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    # === 执行时请删除该注释 ===
    
    curl -X POST https://dashscope.aliyuncs.com/api/v1/services/audio/asr/customization \
    -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "model": "speech-biasing",
        "input": {
            "action": "list_vocabulary",
            "prefix": "testpfx",
            "page_index": 0,
            "page_size": 10
        }
    }'
    ```
    

### **查询指定热词列表**

查询指定热词列表时，由于已知热词列表ID，响应中不包含该字段。

## Python SDK

-   **接口说明**
    
    ```
    def query_vocabulary(self, vocabulary_id: str) -> List[dict]:
        '''
        获取热词列表内容
        param: vocabulary_id 热词列表标识符
        return: 热词列表
        '''
    ```
    
-   **示例代码**
    
    ```
    import dashscope
    from dashscope.audio.asr import *
    import json
    import os
    
    # 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    # 若没有配置环境变量，请用百炼API Key将下行替换为：dashscope.api_key = "sk-xxx"
    dashscope.api_key = os.environ.get('DASHSCOPE_API_KEY')
    
    # 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：https://dashscope-intl.aliyuncs.com/api/v1
    dashscope.base_http_api_url = 'https://dashscope.aliyuncs.com/api/v1'
    
    service = VocabularyService()
    # 查询时替换为实际的热词列表ID
    vocabulary = service.query_vocabulary("vocab-testpfx-xxx")
    print(f"热词列表：{json.dumps(vocabulary)}")
    ```
    
-   **响应参数**
    
    **点击查看响应示例**
    
    ```
    {
      "gmt_create": "2025-12-19 11:47:11",
      "gmt_modified": "2025-12-19 11:47:11",
      "status": "OK",
      "target_model": "fun-asr",
      "vocabulary": [
        {
          "lang": "zh",
          "text": "赛德克巴莱",
          "weight": 4
        }
      ]
    }
    ```
    
    需关注的参数如下：
    
    | **参数** | **类型** | **说明** |
    | --- | --- | --- |
    | vocabulary | object\\[\\] | 热词列表字典。各字段含义参见[热词简介](#41da228156kvm)。 |
    | gmt\\_create | string | 创建热词列表的时间。 |
    | gmt\\_modified | string | 修改热词列表的时间。 |
    | target\\_model | string | 使用热词列表的语音识别模型。详情请参见[支持的模型](#ec3ff461ecoxz)。 必须与后续调用语音识别接口时使用的语音识别模型一致。 |
    | status | string | 状态： - OK：可调用 - UNDEPLOYED：不可调用。 |
    

## Java SDK

-   **接口说明**
    
    ```
    /**
     * 查询指定热词列表
     *
     * @param vocabularyId 需要查询的热词列表
     * @return 热词列表对象
     * @throws NoApiKeyException 如果apikey为空
     * @throws InputRequiredException 如果必须参数为空
     */
    public Vocabulary queryVocabulary(String vocabularyId)
        throws NoApiKeyException, InputRequiredException
    ```
    
-   **示例代码**
    
    ```
    import com.alibaba.dashscope.audio.asr.vocabulary.Vocabulary;
    import com.alibaba.dashscope.audio.asr.vocabulary.VocabularyService;
    import com.alibaba.dashscope.exception.InputRequiredException;
    import com.alibaba.dashscope.exception.NoApiKeyException;
    import com.alibaba.dashscope.utils.Constants;
    import com.google.gson.Gson;
    import com.google.gson.GsonBuilder;
    
    public class Main {
        // 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
        // 若没有配置环境变量，请用百炼API Key将下行替换为：public static String apiKey = "sk-xxx"
        public static String apiKey = System.getenv("DASHSCOPE_API_KEY");
    
        public static void main(String[] args) throws NoApiKeyException, InputRequiredException {
            // 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：https://dashscope-intl.aliyuncs.com/api/v1
            Constants.baseHttpApiUrl = "https://dashscope.aliyuncs.com/api/v1";
    
            VocabularyService service = new VocabularyService(apiKey);
            // 查询时替换为实际的热词列表ID
            Vocabulary vocabulary = service.queryVocabulary("vocab-testpfx-xxxx");
            Gson gson = new GsonBuilder()
                    .setPrettyPrinting()
                    .create();
            System.out.println("热词列表：" + gson.toJson(vocabulary.getData()));
        }
    }
    ```
    
-   **响应参数**
    
    **点击查看响应示例**
    
    ```
    {
      "gmt_create": "2025-12-19 11:47:11",
      "gmt_modified": "2025-12-19 11:47:11",
      "status": "OK",
      "target_model": "fun-asr",
      "vocabulary": [
        {
          "lang": "zh",
          "text": "赛德克巴莱",
          "weight": 4
        }
      ]
    }
    ```
    
    需关注的参数如下：
    
    | **参数** | **类型** | **说明** |
    | --- | --- | --- |
    | vocabulary | object\\[\\] | 热词列表字典。各字段含义参见[热词简介](#41da228156kvm)。 |
    | gmt\\_create | string | 创建热词列表的时间。 |
    | gmt\\_modified | string | 修改热词列表的时间。 |
    | target\\_model | string | 使用热词列表的语音识别模型。详情请参见[支持的模型](#ec3ff461ecoxz)。 必须与后续调用语音识别接口时使用的语音识别模型一致。 |
    | status | string | 状态： - OK：可调用 - UNDEPLOYED：不可调用。 |
    

## RESTful API

-   **URL**
    
    中国内地（北京）：
    
    ```
    POST https://dashscope.aliyuncs.com/api/v1/services/audio/asr/customization
    ```
    
    国际（新加坡）：
    
    ```
    POST https://dashscope-intl.aliyuncs.com/api/v1/services/audio/asr/customization
    ```
    
-   **请求头**
    
    | **参数** | **类型** | **是否必须** | **说明** |
    | --- | --- | --- | --- |
    | Authorization | string | 支持  | 鉴权令牌，格式为`Bearer <your_api_key>`，使用时，将“`<your_api_key>`”替换为实际的API Key。 |
    | Content-Type | string | 支持  | 请求体中传输的数据的媒体类型。固定为`application/json`。 |
    
-   **消息体**
    
    包含所有请求参数的消息体如下，对于可选字段，在实际业务中可根据需求省略。
    
    **重要**
    
    `model`：定制热词模型，固定为`speech-biasing`
    
    ```
    {
        "model": "speech-biasing",
        "input": {
            "action": "query_vocabulary",
            "vocabulary_id": "vocab-testpfx-xxxx"
        }
    }
    ```
    
-   **请求参数**
    
    | **参数** | **类型** | **默认值** | **是否必须** | **说明** |
    | --- | --- | --- | --- | --- |
    | model | string | \\- | 支持  | 定制热词模型，固定为`speech-biasing`。 |
    | action | string | \\- | 支持  | 操作类型，固定为`query_vocabulary`。 |
    | vocabulary\\_id | string | \\- | 支持  | 待查询热词列表ID。 |
    
-   **响应参数**
    
    **点击查看响应示例**
    
    ```
    {
      "output": {
        "gmt_create": "2025-12-19 11:47:11",
        "gmt_modified": "2025-12-19 11:47:11",
        "status": "OK",
        "target_model": "fun-asr",
        "vocabulary": [
          {
            "lang": "zh",
            "text": "赛德克巴莱",
            "weight": 4
          }
        ]
      },
      "usage": {
        "count": 1
      },
      "request_id": "3d461d3f-b2c4-4de5-xxxx"
    }
    ```
    
    需关注的参数如下：
    
    | **参数** | **类型** | **说明** |
    | --- | --- | --- |
    | vocabulary | object\\[\\] | 热词列表字典。各字段含义参见[热词简介](#41da228156kvm)。 |
    | gmt\\_create | string | 创建热词列表的时间。 |
    | gmt\\_modified | string | 修改热词列表的时间。 |
    | target\\_model | string | 使用热词列表的语音识别模型。详情请参见[支持的模型](#ec3ff461ecoxz)。 必须与后续调用语音识别接口时使用的语音识别模型一致。 |
    | status | string | 状态： - OK：可调用 - UNDEPLOYED：不可调用。 |
    
-   **示例代码**
    
    cURL示例如下（Java和Python示例请参见对应的SDK）。
    
    若未将API Key配置到环境变量，需将示例中的`$DASHSCOPE_API_KEY`替换为实际的API Key。
    
    ```
    # ======= 重要提示 =======
    # 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：https://dashscope-intl.aliyuncs.com/api/v1/services/audio/asr/customization
    # 新加坡地域和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    # === 执行时请删除该注释 ===
    
    curl -X POST https://dashscope.aliyuncs.com/api/v1/services/audio/asr/customization \
    -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "model": "speech-biasing",
        "input": {
            "action": "query_vocabulary",
            "vocabulary_id": "vocab-testpfx-xxxx"
        }
    }'
    ```
    

### **更新热词列表**

## Python SDK

-   **接口说明**
    
    ```
    def update_vocabulary(self, vocabulary_id: str, vocabulary: List[dict]) -> None:
        '''
        用新的热词列表替换已有热词列表
        param: vocabulary_id 需要替换的热词列表标识符
        param: vocabulary 热词列表
        '''
    ```
    
-   **示例代码**
    
    ```
    import dashscope
    from dashscope.audio.asr import *
    import os
    
    # 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    # 若没有配置环境变量，请用百炼API Key将下行替换为：dashscope.api_key = "sk-xxx"
    dashscope.api_key = os.environ.get('DASHSCOPE_API_KEY')
    
    # 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：https://dashscope-intl.aliyuncs.com/api/v1
    dashscope.base_http_api_url = 'https://dashscope.aliyuncs.com/api/v1'
    
    service = VocabularyService()
    my_vocabulary = [
        {"text": "赛德克巴莱", "weight": 4, "lang": "zh"}
    ]
    # 替换为实际的热词列表ID
    service.update_vocabulary("vocab-testpfx-xxx", my_vocabulary)
    ```
    

## Java SDK

-   **接口说明**
    
    ```
    /**
     * 更新热词列表
     *
     * @param vocabularyId 需要更新的热词列表
     * @param vocabulary 热词列表对象
     * @throws NoApiKeyException 如果apikey为空
     * @throws InputRequiredException 如果必须参数为空
     */
    public void updateVocabulary(String vocabularyId, JsonArray vocabulary)
        throws NoApiKeyException, InputRequiredException
    ```
    
-   **示例代码**
    
    ```
    import com.alibaba.dashscope.audio.asr.vocabulary.VocabularyService;
    import com.alibaba.dashscope.exception.InputRequiredException;
    import com.alibaba.dashscope.exception.NoApiKeyException;
    import com.alibaba.dashscope.utils.Constants;
    import com.google.gson.JsonArray;
    import com.google.gson.JsonObject;
    
    import java.util.ArrayList;
    import java.util.List;
    
    public class Main {
        // 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
        // 若没有配置环境变量，请用百炼API Key将下行替换为：public static String apiKey = "sk-xxx"
        public static String apiKey = System.getenv("DASHSCOPE_API_KEY");
    
        public static void main(String[] args) throws NoApiKeyException, InputRequiredException {
            // 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：https://dashscope-intl.aliyuncs.com/api/v1
            Constants.baseHttpApiUrl = "https://dashscope.aliyuncs.com/api/v1";
    
            JsonArray vocabularyJson = new JsonArray();
            List<Hotword> wordList = new ArrayList<>();
            wordList.add(new Hotword("吴贻弓", 4, "zh"));
            wordList.add(new Hotword("阙里人家", 4, "zh"));
    
            for (Hotword word : wordList) {
                JsonObject jsonObject = new JsonObject();
                jsonObject.addProperty("text", word.text);
                jsonObject.addProperty("weight", word.weight);
                jsonObject.addProperty("lang", word.lang);
                vocabularyJson.add(jsonObject);
            }
    
            VocabularyService service = new VocabularyService(apiKey);
            // 替换为实际的热词列表ID
            service.updateVocabulary("vocab-testpfx-xxx", vocabularyJson);
        }
    }
    
    class Hotword {
        String text;
        int weight;
        String lang;
    
        public Hotword(String text, int weight, String lang) {
            this.text = text;
            this.weight = weight;
            this.lang = lang;
        }
    }
    ```
    

## RESTful API

-   **URL**
    
    中国内地（北京）：
    
    ```
    POST https://dashscope.aliyuncs.com/api/v1/services/audio/asr/customization
    ```
    
    国际（新加坡）：
    
    ```
    POST https://dashscope-intl.aliyuncs.com/api/v1/services/audio/asr/customization
    ```
    
-   **请求头**
    
    | **参数** | **类型** | **是否必须** | **说明** |
    | --- | --- | --- | --- |
    | Authorization | string | 支持  | 鉴权令牌，格式为`Bearer <your_api_key>`，使用时，将“`<your_api_key>`”替换为实际的API Key。 |
    | Content-Type | string | 支持  | 请求体中传输的数据的媒体类型。固定为`application/json`。 |
    
-   **消息体**
    
    包含所有请求参数的消息体如下，对于可选字段，在实际业务中可根据需求省略。
    
    **重要**
    
    `model`：定制热词模型，固定为`speech-biasing`
    
    ```
    {
        "model": "speech-biasing",
        "input": {
            "action": "update_vocabulary",
            "vocabulary_id": "vocab-testpfx-6977ae49f65c4c3db054727cxxxxxxxx",
            "vocabulary": [
              {"text": "赛德克巴莱", "weight": 4, "lang": "zh"}
            ]
        }
    }
    ```
    
-   **请求参数**
    
    | **参数** | **类型** | **默认值** | **是否必须** | **说明** |
    | --- | --- | --- | --- | --- |
    | model | string | \\- | 支持  | 定制热词模型，固定为`speech-biasing`。 |
    | action | string | \\- | 支持  | 操作类型，固定为`update_vocabulary`。 |
    | vocabulary\\_id | string | \\- | 支持  | 待更新热词列表ID。 |
    | vocabulary | object\\[\\] | \\- | 支持  | 更新后的热词列表字典。各字段含义参见[热词简介](#41da228156kvm)。 |
    
-   **响应参数**
    
    **点击查看响应示例**
    
    ```
    {
      "output": {},
      "usage": {
        "count": 1
      },
      "request_id": "aee47022-2352-40fe-acfa-xxxx"
    }
    ```
    
-   **示例代码**
    
    cURL示例如下（Java和Python示例请参见对应的SDK）。
    
    若未将API Key配置到环境变量，需将示例中的`$DASHSCOPE_API_KEY`替换为实际的API Key。
    
    ```
    # ======= 重要提示 =======
    # 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：https://dashscope-intl.aliyuncs.com/api/v1/services/audio/asr/customization
    # 新加坡地域和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    # === 执行时请删除该注释 ===
    
    curl -X POST https://dashscope.aliyuncs.com/api/v1/services/audio/asr/customization \
    -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "model": "speech-biasing",
        "input": {
            "action": "update_vocabulary",
            "vocabulary_id": "vocab-testpfx-xxx",
            "vocabulary": [
              {"text": "赛德克巴莱", "weight": 4, "lang": "zh"}
            ]
        }
    }'
    ```
    

### **删除热词列表**

## Python SDK

-   **接口说明**
    
    ```
    def delete_vocabulary(self, vocabulary_id: str) -> None:
        '''
        删除热词列表
        param: vocabulary_id 需要删除的热词列表标识符
        '''
    ```
    
-   **示例代码**
    
    ```
    import dashscope
    from dashscope.audio.asr import *
    import os
    
    # 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    # 若没有配置环境变量，请用百炼API Key将下行替换为：dashscope.api_key = "sk-xxx"
    dashscope.api_key = os.environ.get('DASHSCOPE_API_KEY')
    
    # 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：https://dashscope-intl.aliyuncs.com/api/v1
    dashscope.base_http_api_url = 'https://dashscope.aliyuncs.com/api/v1'
    
    service = VocabularyService()
    # 替换为实际的热词表ID
    service.delete_vocabulary("vocab-testpfx-xxxx")
    ```
    

## Java SDK

-   **接口说明**
    
    ```
    /**
     * 删除热词列表
     *
     * @param vocabularyId 需要删除的热词列表
     * @throws NoApiKeyException 如果apikey为空
     * @throws InputRequiredException 如果必须参数为空
     */
    public void deleteVocabulary(String vocabularyId)
        throws NoApiKeyException, InputRequiredException
    ```
    
-   **示例代码**
    
    ```
    import com.alibaba.dashscope.audio.asr.vocabulary.VocabularyService;
    import com.alibaba.dashscope.exception.InputRequiredException;
    import com.alibaba.dashscope.exception.NoApiKeyException;
    import com.alibaba.dashscope.utils.Constants;
    
    public class Main {
        // 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
        // 若没有配置环境变量，请用百炼API Key将下行替换为：public static String apiKey = "sk-xxx"
        public static String apiKey = System.getenv("DASHSCOPE_API_KEY");
    
        public static void main(String[] args) throws NoApiKeyException, InputRequiredException {
            // 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：https://dashscope-intl.aliyuncs.com/api/v1
            Constants.baseHttpApiUrl = "https://dashscope.aliyuncs.com/api/v1";
    
            VocabularyService service = new VocabularyService(apiKey);
            // 删除时替换为实际的热词列表ID
            service.deleteVocabulary("vocab-testpfx-xxxx");
        }
    }
    ```
    

## RESTful API

-   **URL**
    
    中国内地（北京）：
    
    ```
    POST https://dashscope.aliyuncs.com/api/v1/services/audio/asr/customization
    ```
    
    国际（新加坡）：
    
    ```
    POST https://dashscope-intl.aliyuncs.com/api/v1/services/audio/asr/customization
    ```
    
-   **请求头**
    
    | **参数** | **类型** | **是否必须** | **说明** |
    | --- | --- | --- | --- |
    | Authorization | string | 支持  | 鉴权令牌，格式为`Bearer <your_api_key>`，使用时，将“`<your_api_key>`”替换为实际的API Key。 |
    | Content-Type | string | 支持  | 请求体中传输的数据的媒体类型。固定为`application/json`。 |
    
-   **消息体**
    
    包含所有请求参数的消息体如下，对于可选字段，在实际业务中可根据需求省略。
    
    **重要**
    
    `model`：定制热词模型，固定为`speech-biasing`
    
    ```
    {
        "model": "speech-biasing",
        "input": {
            "action": "delete_vocabulary",
            "vocabulary_id": "vocab-testpfx-xxx"
        }
    }
    ```
    
-   **请求参数**
    
    | **参数** | **类型** | **默认值** | **是否必须** | **说明** |
    | --- | --- | --- | --- | --- |
    | model | string | \\- | 支持  | 定制热词模型，固定为`speech-biasing`。 |
    | action | string | \\- | 支持  | 操作类型，固定为`delete_vocabulary`。 |
    | vocabulary\\_id | string | \\- | 支持  | 待删除热词列表ID。 |
    
-   **响应参数**
    
    **点击查看响应示例**
    
    ```
    {
      "output": {},
      "usage": {
        "count": 1
      },
      "request_id": "aee47022-2352-40fe-acfa-xxxx"
    }
    ```
    
-   **示例代码**
    
    cURL示例如下（Java和Python示例请参见对应的SDK）。
    
    若未将API Key配置到环境变量，需将示例中的`$DASHSCOPE_API_KEY`替换为实际的API Key。
    
    ```
    # ======= 重要提示 =======
    # 以下为北京地域url，若使用新加坡地域的模型，需将url替换为：https://dashscope-intl.aliyuncs.com/api/v1/services/audio/asr/customization
    # 新加坡地域和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
    # === 执行时请删除该注释 ===
    
    curl -X POST https://dashscope.aliyuncs.com/api/v1/services/audio/asr/customization \
    -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
        "model": "speech-biasing",
        "input": {
            "action": "delete_vocabulary",
            "vocabulary_id": "vocab-testpfx-xxx"
        }
    }'
    ```
    

## **错误码说明**

如遇报错问题，请参见[错误信息](https://help.aliyun.com/zh/model-studio/error-code)进行排查。

 span.aliyun-docs-icon { color: transparent !important; font-size: 0 !important; } span.aliyun-docs-icon:before { color: black; font-size: 16px; } span.aliyun-docs-icon.icon-size-20:before { font-size: 20px; } span.aliyun-docs-icon.icon-size-22:before { font-size: 22px; } span.aliyun-docs-icon.icon-size-24:before { font-size: 24px; } span.aliyun-docs-icon.icon-size-26:before { font-size: 26px; } span.aliyun-docs-icon.icon-size-28:before { font-size: 28px; }