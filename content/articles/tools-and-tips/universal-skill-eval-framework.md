---
title: "AI Skill 怎么测？从零构建一套通用测评框架"
excerpt: "你写了一堆 Claude Code Skill，但它们好不好用、稳不稳定、能不能回归——没有人知道。本文手把手讲清楚：为什么需要 Skill 测评、评什么、怎么评，以及一套可以直接复用的框架设计。"
category: "tools-and-tips"
tags: ["claude-code", "ai-engineering", "skill", "eval", "llm-judge", "prompt-engineering", "testing"]
publishedAt: "2026-04-28"
readTime: 18
---

> 适合读者：写过 Prompt / Skill，但没认真想过怎么测的工程师

---

## 写在前面

你写了一个 Claude Code Skill，跑了几次，感觉还行，于是上线了。

一周后，有人说它返回的格式不对。两周后，有人说它偶尔会崩。三周后，你想升级它，但不确定改完之后有没有破坏原来的行为。

这是目前几乎所有 AI Skill 项目的真实处境：**靠人肉感知质量，没有任何测评体系**。

本文要讲的，就是怎么给 AI Skill 建一套测评框架。不是高大上的论文方法论，而是一套你明天就能开始动手的工程方案。

---

## 一、先把问题想清楚

### Skill 测评和传统单测有什么不一样？

写过 Java、Python 的同学对单元测试非常熟悉：给函数一个输入，断言输出是否等于期望值。

但 AI Skill 不行。原因有三：

**1. 输出天然不确定**

同样的 prompt，每次运行可能返回不同措辞、不同格式，甚至不同结论。你无法用 `assertEqual` 来验证。

**2. "对"的标准很模糊**

"帮我找一款蓝牙耳机" 返回了 3 个商品，这算对还是错？取决于业务场景，不是简单的布尔判断。

**3. 没有孤立的函数**

Skill 通常要调用外部 API、读取环境、联网搜索——它是一个有副作用的系统，不是纯函数。

所以 Skill 测评本质上更接近**集成测试 + 质量评估**的结合体，需要专门设计。

---

### 我们到底要测什么？

拆解一下，Skill 的质量可以从 4 个维度衡量：

```
┌─────────────────────────────────────────────────────┐
│                   Skill 质量四象限                    │
│                                                      │
│   结构正确性          语义质量                         │
│   ─────────          ────────                        │
│   · 不崩溃           · 结果真的有用吗？                │
│   · 字段完整         · 推荐的是用户要的东西吗？          │
│   · 格式符合约定      · 有没有明显的幻觉？              │
│                                                      │
│   稳定性              性能                            │
│   ────               ────                            │
│   · 多次运行一致吗？   · 响应时间可接受吗？              │
│   · 升级后没有回归？   · token 消耗合理吗？             │
└─────────────────────────────────────────────────────┘
```

这四个维度，决定了我们需要什么类型的验证器。

---

## 二、框架整体设计

先看全景，再逐层拆解：

```
skill-eval/
├── core/
│   ├── runner.py        ← 负责"调用" Skill
│   ├── validators.py    ← 负责"判断"输出好不好
│   ├── llm_judge.py     ← 用 AI 评 AI
│   └── reporter.py      ← 出报告
├── cases/
│   └── {skill-name}/
│       └── eval.yaml    ← 每个 Skill 的测试用例
└── run_eval.py          ← 一条命令跑起来
```

核心理念：**框架只写一次，用例配置每个 Skill 各自维护**。

---

## 三、用例配置：用 YAML 描述"怎么测"

这是框架最关键的设计决策。我们不把测试逻辑写死在代码里，而是用 YAML 配置文件描述每个 Skill 的测评方式。

```yaml
# cases/1688-ai-selection/eval.yaml

skill: 1688-ai-selection
version: "1.0"
timeout: 60  # 超时秒数

# 运行这个 Skill 需要哪些环境变量
env_required:
  - ALIBABA_API_KEY

cases:
  # 用例1：正常路径
  - id: "C001"
    desc: "基础商品搜索——最典型的使用场景"
    input:
      message: "找一个爆款手机壳，价格20元以内"
    validators:
      - type: not_empty          # 不能返回空
      - type: json_field_exists  # 必须有这些字段
        fields: [products, reason]
      - type: llm_judge          # AI 裁判评估质量
        criteria: "是否返回了手机壳商品，且价格符合要求"
        threshold: 0.8
    tags: [happy_path]

  # 用例2：边界情况
  - id: "C002"
    desc: "空输入——Skill 不应该崩溃"
    input:
      message: ""
    validators:
      - type: not_error           # 不报错、不抛异常
      - type: contains_keywords
        keywords: [请输入, 需要, 什么]  # 应该引导用户补充信息
    tags: [edge_case]

  # 用例3：稳定性测试
  - id: "C003"
    desc: "幂等性——同一个问题，多次回答应该一致"
    input:
      message: "推荐一款降噪蓝牙耳机"
    repeat: 3
    validators:
      - type: semantic_consistency
        threshold: 0.85  # 3次输出的语义相似度
    tags: [stability]
```

这个设计的好处：
- 非开发同学也能读懂用例在测什么
- 新增 Skill 时只需加一个 yaml，不改框架代码
- CI/CD 里跑 `run_eval.py --all` 全量测评

---

## 四、验证器体系：从"确定"到"模糊"

这是框架最有意思的部分。我们把验证器设计成 5 个层次，越往后越"软"：

```python
class ValidatorType(Enum):

    # L1: 结构验证（100% 确定，直接断言）
    NOT_EMPTY              = "not_empty"
    NOT_ERROR              = "not_error"
    JSON_FIELD_EXISTS      = "json_field_exists"
    JSON_SCHEMA            = "json_schema"       # 用 jsonschema 验证结构
    REGEX_MATCH            = "regex_match"
    CONTAINS_KEYWORDS      = "contains_keywords"

    # L2: 语义验证（用 AI 做裁判）
    LLM_JUDGE              = "llm_judge"          # 单次质量打分
    SEMANTIC_CONSISTENCY   = "semantic_consistency" # 多次一致性比较

    # L3: 回归验证（和历史对比）
    GOLDEN_DIFF            = "golden_diff"        # 对比黄金标准答案
    REGRESSION             = "regression"          # 对比上一个版本的输出

    # L4: 性能验证
    LATENCY_UNDER          = "latency_under"      # 延迟不超过 N 毫秒
    TOKEN_UNDER            = "token_under"        # token 消耗不超过 N

    # L5: 副作用验证（高级场景）
    SIDE_EFFECT_CHECK      = "side_effect_check"  # 有没有误调外部接口
```

**为什么要分层？**

实际经验是：L1 的结构验证能挡住 70% 的问题，成本极低。L2 的 AI 裁判覆盖语义问题，但开销大，不必每个用例都用。L3-L5 用于有明确历史基线的成熟 Skill。

---

## 五、LLM 裁判：用 AI 评 AI

这是整个框架最反直觉的部分——**用 Claude 来评估 Claude Skill 的输出质量**。

有人会问：这不是自己评自己吗？

这个质疑是对的，但实践中效果出人意料地好。原因是：裁判 Claude 和被测 Skill 运行的 Prompt 完全不同，裁判只负责"这个输出有没有回答用户需求"，和生成输出的 Skill 是两个独立的角色。

```python
LLM_JUDGE_PROMPT = """
你是一个严格的 AI Skill 质量评审员。你的职责是客观评估输出是否满足用户需求，不偏向于任何特定的表达方式。

【Skill 的功能描述】
{skill_description}

【用户的原始输入】
{user_input}

【Skill 的实际输出】
{skill_output}

【本次评估标准】
{criteria}

请从以下 4 个维度独立打分（每项 0.0 ~ 1.0）：
- 相关性：输出是否回应了用户的真实需求
- 完整性：关键信息是否缺失
- 准确性：内容是否存在明显错误或幻觉
- 可用性：格式和结构是否便于下游使用

最后给出综合得分和简短理由。

输出 JSON（不要输出其他内容）:
{
  "relevance": 0.9,
  "completeness": 0.8,
  "accuracy": 0.95,
  "usability": 1.0,
  "overall": 0.91,
  "reason": "返回了3款手机壳，均在20元以内，价格和品类符合要求，但缺少销量数据"
}
"""
```

**实践建议**：
- `overall` 低于 0.75 算失败
- 把裁判的 `temperature` 固定为 0，减少评分飘移
- 对同一个输出跑 2 次裁判取平均，提高稳定性

---

## 六、Runner：怎么"调用"一个 Skill

这是框架的核心引擎，也是实现时最需要权衡的地方。

调用 Skill 有两种主流方案：

**方案 A：Claude API 注入 Skill 定义**

把 Skill 的 Markdown 内容注入为 system prompt，然后发送用户输入，收集输出。

```python
class SkillRunner:
    def __init__(self, skill_name: str):
        skill_path = f"~/.claude/skills/{skill_name}/prompt.md"
        self.skill_prompt = Path(skill_path).read_text()

    def invoke(self, user_input: str) -> RunResult:
        start = time.time()

        response = anthropic_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=self.skill_prompt,   # Skill 定义作为 system prompt
            messages=[{"role": "user", "content": user_input}]
        )

        return RunResult(
            output=response.content[0].text,
            latency_ms=(time.time() - start) * 1000,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        )
```

优点：完全可控，速度快，不依赖 Claude Code 环境。
缺点：Skill 里依赖工具调用（bash、文件读写）的部分无法复现。

**方案 B：subprocess 调用 Claude Code CLI**

```python
def invoke_via_cli(self, user_input: str) -> RunResult:
    result = subprocess.run(
        ["claude", "--skill", self.skill_name, "--print", user_input],
        capture_output=True, text=True, timeout=self.timeout
    )
    return RunResult(output=result.stdout, error=result.stderr)
```

优点：真实复现完整 Skill 执行环境。
缺点：速度慢，依赖本地 Claude Code 安装，无法并行跑。

**推荐策略**：先用方案 A 跑语义质量测试，用方案 B 跑端到端冒烟测试。

---

## 七、报告：让结果一眼看懂

```
╔══════════════════════════════════════════════════════╗
║            Skill 测评报告  2026-04-28 10:00          ║
║            1688-ai-selection  v1.0                   ║
╚══════════════════════════════════════════════════════╝

总览
────────────────────────────────────
 通过率       8 / 10   (80.0%)
 平均延迟     2340 ms
 P95 延迟     4100 ms
 LLM 得分     0.84 / 1.00
 Token 均值   1240 tokens/次

用例明细
────────────────────────────────────
 ✅ C001  基础商品搜索      2100ms  score=0.91
 ✅ C002  空输入边界        340ms   结构验证通过
 ❌ C003  幂等性测试        3次    consistency=0.62

失败分析
────────────────────────────────────
 ❌ C003: semantic_consistency=0.62 < threshold=0.85
    第1次: 推荐了 Sony WH-1000XM5
    第2次: 推荐了 Bose QC45 和 Apple AirPods Pro（完全不同品类）
    第3次: 推荐了 Sony WH-1000XM5

    建议: 检查 Skill 是否依赖高随机性采样，考虑在 Skill prompt
          中明确约束"每次推荐相同价格区间内的标杆产品"
```

---

## 八、接入 CI：让测评自动跑起来

```yaml
# .github/workflows/skill-eval.yml
name: Skill Eval

on:
  pull_request:
    paths:
      - '.claude/skills/**'

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Skill Eval
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          pip install -r eval/requirements.txt
          python eval/run_eval.py --all --ci --fail-fast

      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: eval-report
          path: results/
```

效果：任何人改了 Skill，PR 里自动跑测评，失败了 merge 不了。

---

## 九、一些容易踩的坑

**坑1：LLM 裁判结果不稳定**

裁判 Claude 自己也有随机性，你可能发现同一个输出，有时打 0.9，有时打 0.75。

解决：对裁判设置 `temperature=0`，且跑 2 次取平均。如果两次差距 > 0.15，标记为"需要人工复核"。

**坑2：第一次跑没有基线**

Regression 验证需要有"上一版本的输出"做对比，但第一次跑没有历史。

解决：先跑一次，把输出存到 `cases/{skill}/golden/` 目录，作为初始黄金标准。后续每次升级前手动确认黄金标准是否需要更新。

**坑3：有副作用的 Skill 在测评时误操作**

比如一个"下单 Skill"，测评时真的发了订单。

解决：在测评环境里 mock 所有外部 API 调用，或者在 `eval.yaml` 里声明 `mock_mode: true`，Skill 内部读到这个标志就走 mock 路径。

**坑4：多轮对话 Skill 无法用单次调用测**

有些 Skill 需要和用户来回几轮才能完成（比如"帮我创建一个项目"可能需要先问项目名、再问技术栈）。

解决：在 `eval.yaml` 里支持 `turns` 配置，描述多轮对话的完整脚本：

```yaml
cases:
  - id: "C010"
    desc: "多轮项目创建"
    turns:
      - role: user
        content: "帮我创建一个项目"
      - role: assistant
        match: "项目名|叫什么"  # 期望 Skill 在这一轮问项目名
      - role: user
        content: "叫 my-app"
      - role: assistant
        validators:
          - type: contains_keywords
            keywords: [my-app, 创建成功]
```

---

## 十、完整路线图

如果你现在手头有 Skill 想开始测评，推荐按这个顺序来：

```
第一周：基础跑通
  └── 给 1 个 Skill 写 3-5 个 eval.yaml 用例
  └── 只用 L1 结构验证（not_empty, json_field_exists）
  └── 把框架跑起来，输出第一份报告

第二周：加入 AI 裁判
  └── 接入 LLM Judge，给核心 happy_path 用例打分
  └── 建立黄金标准输出（golden/）

第三周：扩展覆盖
  └── 补充边界用例、稳定性用例
  └── 接入 CI，每次改 Skill 自动触发

第四周及以后：
  └── 历史趋势分析（每次发布后得分有没有下降？）
  └── 自动生成测试用例（让 Claude 生成边界 case）
```

---

## 总结

Skill 测评框架的核心思路就一句话：

> **结构验证兜底，AI 裁判评质量，YAML 配置降门槛，CI 接入保回归**

最难的不是技术，是第一次为你的 Skill 写下那 3 个测试用例。

从那一刻起，你的 Skill 就从"凭感觉好用"变成了"有数据支撑的工程产品"。

---

*写于 2026-04-28 | 本文配套框架代码将在后续整理后开源*
