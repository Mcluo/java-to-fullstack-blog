---
title: "知识蒸馏：从入门到前沿——让小模型继承大模型的智慧"
excerpt: "从「师生学习」的直觉出发，由浅入深理解知识蒸馏的原理、变体、工程实践，以及它在 DeepSeek V4 等前沿大模型中的最新应用。"
category: "ai"
tags: ["知识蒸馏", "大模型", "模型压缩", "DeepSeek", "LLM", "入门"]
difficulty: "beginner"
publishedAt: "2026-04-26"
readTime: 22
---

# 知识蒸馏：从入门到前沿——让小模型继承大模型的智慧

> 蒸馏（Distillation），在化学里是用加热让液体变成蒸气、再冷凝提纯的过程。
>
> 在深度学习里，**知识蒸馏（Knowledge Distillation）** 做的事情类似：把一个大模型里的"知识"，提炼出来注入一个小模型。

读完这篇文章，你将理解：

- 知识蒸馏解决了什么问题？
- 它的核心机制是什么？（温度、软标签）
- 有哪些主要变体？（响应蒸馏、特征蒸馏、关系蒸馏）
- 在 LLM 时代，蒸馏是怎么用的？（SFT蒸馏、On-Policy蒸馏）
- DeepSeek V4 的 OPD 具体是怎么回事？

---

## 一、为什么需要知识蒸馏？

### 大模型的困境

2024 年之后，大模型的"规模战争"白热化：

- GPT-4：约 1.8T 参数（估算）
- DeepSeek V4 Pro：1.6T 参数
- Llama 3：约 405B 参数

这些模型能力强大，但有一个致命问题：**太贵了**。

```
推理一次 GPT-4：约 $0.03~0.06
推理一次 7B 小模型：约 $0.0003

成本差距：100 倍
```

企业实际部署时，面临两难：
- 用大模型：效果好，但成本爆炸，延迟高
- 用小模型：成本低，但能力差，用户体验打折

**知识蒸馏就是解决这个矛盾的关键技术**：训练出一个"小而强"的模型，用接近大模型的效果，承担小模型的成本。

### 一个直觉类比

想象一位经验丰富的医学教授（大模型），要把知识传授给医学生（小模型）。

**方式 A（传统训练）**：给医学生发一本教材，让他自己背答案。
- 教材：医学考试题库（ground truth 标注数据）
- 问题：只有"对/错"，没有"为什么"

**方式 B（知识蒸馏）**：让教授亲自带学生，解释每道题"为什么这样判断"。
- 教授不只说"A 是正确答案"，还说"A 的可能性 70%，B 有 20% 可能，C 和 D 基本排除，原因是..."
- 学生从概率分布里学到了更丰富的信息

方式 B 的信息量远大于方式 A。这就是知识蒸馏的本质。

---

## 二、经典知识蒸馏：Hinton 2015

知识蒸馏由 Geoffrey Hinton（深度学习三巨头之一）在 2015 年提出，论文标题就叫 *Distilling the Knowledge in a Neural Network*。

### 2.1 软标签（Soft Labels）

传统训练用**硬标签（Hard Labels）**：

```
图片：一只猫
标签：[猫=1, 狗=0, 汽车=0, 飞机=0]
```

只有 0 和 1，信息量极少。

大模型输出的是**软标签（Soft Labels）**，也叫概率分布：

```
图片：一只猫
教师输出：[猫=0.85, 狗=0.10, 老虎=0.04, 豹=0.01]
```

这个分布里藏着大量"暗知识（Dark Knowledge）"：
- 猫和狗确实有些相似（0.10 不是 0）
- 猫和老虎比猫和汽车更像（0.04 > 0.00）

小模型从这个分布中学习，比只学 0/1 要丰富得多。

### 2.2 温度参数（Temperature）

软标签的"软"程度由**温度 T** 控制。

Softmax 函数（把原始分数变成概率）：

$$p_i = \frac{\exp(z_i / T)}{\sum_j \exp(z_j / T)}$$

| 温度 T | 效果 |
|--------|------|
| T = 1 | 标准 softmax，概率分布比较"尖锐" |
| T > 1 | 分布变"平滑"，小概率类也被放大 |
| T → ∞ | 所有类的概率趋于相等 |
| T → 0 | 退化为硬标签（最大值=1，其他=0）|

**训练时用高温（T=4~20）**，让软标签更平滑，暗知识更丰富。
**推理时用 T=1**，恢复正常概率分布。

用一个例子直观感受：

```python
import numpy as np

logits = np.array([5.0, 3.0, 1.0, 0.5])  # 原始得分

def softmax(logits, T=1.0):
    exp = np.exp(logits / T)
    return exp / exp.sum()

print("T=1:", softmax(logits, T=1))
# → [0.849, 0.115, 0.016, 0.010]  很尖锐

print("T=4:", softmax(logits, T=4))
# → [0.476, 0.305, 0.138, 0.082]  更平滑

print("T=10:", softmax(logits, T=10))
# → [0.346, 0.287, 0.208, 0.160]  非常平滑
```

### 2.3 蒸馏损失函数

学生模型的训练损失由两部分组成：

```
总损失 = α × 蒸馏损失 + (1-α) × 标准交叉熵损失
```

- **蒸馏损失**：学生输出（高温）vs 教师输出（高温）的 KL 散度
- **交叉熵损失**：学生输出 vs 真实标签（硬标签）
- **α**：权衡系数，一般 0.7~0.9

为什么同时保留两项？
- 纯蒸馏：学生只学教师，但教师也可能出错
- 纯监督：回到传统训练，没有暗知识
- 两者结合：互相补充，更鲁棒

---

## 三、知识蒸馏的三大变体

随着研究深入，"知识"的形式从输出层扩展到了模型内部。

### 3.1 响应蒸馏（Response-Based）

这是最基础的形式，也叫**输出层蒸馏**。

```
输入 x
  ↓
教师模型（大）→ 软标签 p_T
  ↓
学生模型（小）→ 软标签 p_S
  ↓
损失 = KL(p_T || p_S)
```

**优点**：简单，不需要访问教师的内部结构
**缺点**：只利用最终输出，中间层的知识全部丢弃

### 3.2 特征蒸馏（Feature-Based）

让学生模型的**中间层表示**（隐藏状态）去模仿教师的中间层。

```
教师：[Layer1] → [Layer2] → ... → [LayerN] → 输出
                    ↕                  ↕
学生：[Layer1] → [Layer2'] → ... → [LayerM] → 输出
                 ↑匹配这里            ↑也匹配这里
```

代表工作：
- **FitNets**（2015）：让学生的中间层特征"模仿"教师特定层的输出
- **PKD**（Patient KD）：让学生"耐心地"从教师的每一层学习

**优点**：传递了更丰富的内部表示
**缺点**：教师和学生维度不同时，需要额外的适配层（Adapter）

### 3.3 关系蒸馏（Relation-Based）

不传递单个样本的知识，而是传递**样本之间的关系**。

```
样本集合：[x1, x2, x3, ...]

教师看到的关系：
  - x1 和 x2 在特征空间里很近（语义相似）
  - x1 和 x3 很远（语义不同）

学生需要学到同样的相对关系
```

代表工作：**RKD**（Relational KD，2019）

**优点**：捕获了数据的结构信息，对小样本场景效果好
**缺点**：计算批内所有样本对的关系，开销大

---

## 四、LLM 时代的蒸馏：三种主要范式

2023 年以后，蒸馏在大语言模型领域发展出了新的形式。

### 4.1 SFT 蒸馏（最简单）

**核心做法**：用大模型生成高质量的（问题，回答）对，然后用这些数据做监督微调。

```
阶段 1：
  问题集合 Q → 教师模型（GPT-4 / Claude）→ 高质量回答集合 A

阶段 2：
  (Q, A) 数据集 → 标准 SFT 训练学生模型
```

这严格来说不是经典蒸馏，但效果实际上很好。

代表案例：
- **Alpaca**（2023）：用 GPT-3.5 生成 52K 条指令数据，微调 LLaMA-7B
- **Vicuna**：用 ChatGPT 对话记录微调 LLaMA-13B

**优点**：简单，不需要同时运行教师模型
**缺点**：
- 学生的上界是教师（学不到教师没输出的东西）
- 分布偏移：学生推理时的错误和训练数据分布不一致

### 4.2 On-Policy 蒸馏（DeepSeek V4 用的）

解决 SFT 蒸馏的分布偏移问题。

**核心思路**：学生实时生成输出，教师实时打分，边生成边学。

```
while training:
    x = 采样输入
    y_student = 学生模型.生成(x)    # 学生自己写答案
    loss = 教师模型.打分(x, y_student)  # 教师评判
    student.update(loss)
```

与 SFT 蒸馏的关键区别：

| 维度 | SFT 蒸馏 | On-Policy 蒸馏 |
|------|---------|----------------|
| 训练数据来源 | 教师预先生成 | 学生实时生成 |
| 分布对齐 | 教师分布 | 学生自身分布 |
| 训练成本 | 低（一次性生成） | 高（教师持续在线） |
| 效果 | 较好 | 更好，特别是长文本 |

On-Policy 蒸馏的损失函数通常是 **Reverse KL 散度**：

```
KL(p_student || p_teacher) = Σ p_student × log(p_student / p_teacher)
```

为什么用 Reverse KL 而不是正向 KL？

- **正向 KL（KL(teacher||student)）**：会让学生"覆盖"教师的所有模式，倾向于输出保守的平均答案
- **反向 KL（KL(student||teacher)）**：让学生专注学自己擅长的部分，生成更"锐利"的输出

在生成任务里，反向 KL 通常效果更好。

### 4.3 RL-Based 蒸馏（强化学习驱动）

结合强化学习，用教师模型作为奖励函数（或奖励模型），学生通过不断生成和得分来优化。

```
学生生成回答 → 教师/奖励模型打分 → RL 优化 → 更新学生策略
```

DeepSeek V4 的后训练管线就融合了 SFT、RL（GRPO 算法）、On-Policy 蒸馏三者。

---

## 五、DeepSeek V4 的 OPD 是什么？

OPD = **On-Policy Distillation**（在线策略蒸馏）

这是 DeepSeek V4 后训练管线的第二阶段，专门用来把多个专家的能力统一进一个模型。

### 背景问题

DeepSeek V4 先训练了多个专家模型（数学、代码、Agent……），每个专家在自己领域表现出色。

但用户不想用多个模型，他们想要一个全能的统一模型。

**直接合并**行吗？不行，参数简单平均会互相干扰，造成"能力稀释"。

### OPD 的解法

```
多个专家模型（Teacher Pool）
    math-expert    code-expert    agent-expert    ...
         ↓               ↓              ↓
         ←——————————————→
                    ↓
            统一模型（学生）
         实时生成回答，对各专家
         计算 Reverse KL 损失
```

具体流程：
1. 统一模型（学生）收到问题 x，生成一个回答序列 y
2. 针对这个问题，从 Teacher Pool 里选择对应领域的专家
3. 计算 `KL(p_student(·|x) || p_teacher(·|x))`
4. 反向传播，更新统一模型

关键技术点：
- **Full-Vocabulary OPD**：损失在整个词表（32K+ tokens）上计算，而不是只看学生生成的 token，信号更密集
- **Efficient Teacher Scheduling**：多个教师模型并行推理，合理调度避免等待
- **FP4 量化推理**：教师模型用 FP4 精度推理，节省显存，让更多教师能同时在线

### OPD 的实际效果

DeepSeek V4 的 OPD 让统一模型在几乎所有领域都接近或达到了对应专家的水平，而不是各领域平均下来的普通水平。

这就是为什么 DeepSeek-V4-Pro-Max 既能做数学推理，又能写代码，还能做 Agent 任务——这背后的秘密就是 OPD。

---

## 六、知识蒸馏的工程实践

### 6.1 教师模型选择

| 场景 | 推荐教师模型 |
|------|------------|
| 开源友好 | LLaMA-3-70B、Qwen2-72B |
| 效果最强 | GPT-4o、Claude Opus 4.5（付费 API） |
| 中文任务 | Qwen2.5-72B、DeepSeek-V3 |

注意：很多大模型的服务协议**禁止用其输出训练其他模型**（OpenAI ToS 明确禁止）。使用前务必检查协议。

### 6.2 一个简单的蒸馏代码示例

用 HuggingFace 做响应蒸馏：

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import torch.nn.functional as F

# 加载教师（大）和学生（小）模型
teacher = AutoModelForCausalLM.from_pretrained("Qwen/Qwen2-7B")
student = AutoModelForCausalLM.from_pretrained("Qwen/Qwen2-1.5B")

tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2-7B")

def distillation_loss(student_logits, teacher_logits, temperature=4.0, alpha=0.7):
    """
    student_logits: 学生模型输出的原始分数 [batch, seq_len, vocab_size]
    teacher_logits: 教师模型输出的原始分数 [batch, seq_len, vocab_size]
    """
    # 用高温软化概率分布
    teacher_probs = F.softmax(teacher_logits / temperature, dim=-1)
    student_log_probs = F.log_softmax(student_logits / temperature, dim=-1)
    
    # KL 散度（蒸馏损失），乘以 T² 是为了梯度尺度稳定
    distill_loss = F.kl_div(
        student_log_probs, 
        teacher_probs, 
        reduction='batchmean'
    ) * (temperature ** 2)
    
    return distill_loss

# 训练循环（简化版）
optimizer = torch.optim.AdamW(student.parameters(), lr=1e-4)

for batch in dataloader:
    input_ids = batch["input_ids"]
    labels = batch["labels"]
    
    # 教师不需要梯度
    with torch.no_grad():
        teacher_out = teacher(input_ids)
    
    # 学生需要梯度
    student_out = student(input_ids, labels=labels)
    
    # 两部分损失
    ce_loss = student_out.loss  # 标准交叉熵
    kd_loss = distillation_loss(
        student_out.logits, 
        teacher_out.logits,
        temperature=4.0
    )
    
    # 加权组合
    loss = 0.7 * kd_loss + 0.3 * ce_loss
    
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()
```

### 6.3 实际效果参考

| 模型对 | 任务 | 蒸馏后学生提升 |
|--------|------|--------------|
| GPT-3.5 → LLaMA-7B | 指令遵循 | +15~25% |
| Qwen-72B → Qwen-7B | 数学推理 | +8~15% |
| DeepSeek-V3 → DeepSeek-7B | 代码生成 | +10~20% |

---

## 七、蒸馏 vs 其他模型压缩技术

知识蒸馏只是模型压缩的一种手段，和其他技术对比：

| 技术 | 原理 | 压缩比 | 精度损失 | 是否需要训练 |
|------|------|--------|---------|------------|
| **知识蒸馏** | 小模型学大模型 | 高（可定制） | 低（结构化知识转移） | 是 |
| **量化** | 降低数字精度（FP32→INT4）| 4~8x | 很低 | 否（PTQ）或少量（QAT） |
| **剪枝** | 删除不重要的权重 | 2~10x | 中等 | 是（微调恢复） |
| **低秩分解** | 大矩阵拆成小矩阵乘积 | 2~4x | 中等 | 是 |

实际工程中常常**组合使用**：

```
大模型（1.6T, FP16）
  ↓ 知识蒸馏
中等模型（7B, FP16）
  ↓ 量化
小而高效模型（7B, INT4）
→ 部署成本降低 100x 以上
```

---

## 八、前沿趋势：蒸馏在 2025~2026 年的新方向

### 8.1 推理蒸馏（Reasoning Distillation）

不只蒸馏最终答案，而是蒸馏**思考过程（Chain of Thought）**。

```
教师：问题 → <think>步骤1... 步骤2... 步骤3...</think> → 答案
                          ↓ 蒸馏
学生：问题 → <think>简化的思考过程</think> → 答案
```

这样学生不只会"给答案"，还会"思考如何到答案"。

### 8.2 Speculative Decoding（投机解码）

严格来说不是蒸馏，但思路相关：用小模型快速生成草稿，大模型验证并纠正。

```
小模型：快速生成 [tok1, tok2, tok3, tok4, tok5]
大模型：验证 [tok1 ✓, tok2 ✓, tok3 ✗] → 从 tok3 重新生成
```

速度可提升 2~4x，同时保持大模型的输出质量。

### 8.3 Agentic Distillation（智能体蒸馏）

把大模型在复杂任务中的**决策轨迹**蒸馏进小模型，让小模型也能做 Agent 任务。

---

## 九、总结：知识蒸馏的本质

> 知识蒸馏的本质，是让学生不只学"答案"，而是学"思考方式"。

经典蒸馏的核心是**软标签 + 温度**，让概率分布中的暗知识传递给小模型。

LLM 时代的蒸馏更加多样：
- **SFT 蒸馏**：最简单，用大模型生成数据做微调
- **On-Policy 蒸馏**：解决分布偏移，学生边生成边学
- **RL + 蒸馏**：奖励驱动，学生主动探索优化

DeepSeek V4 的 OPD（在线策略蒸馏）是这一思路的最新实践：**多个专家的智慧，通过在线蒸馏，统一进一个全能模型**。

这个技术方向会持续发展——毕竟我们永远需要更小、更快、更便宜的模型，去承载越来越强大的智能。

---

## 推荐进一步阅读

| 论文 | 关键贡献 |
|------|---------|
| Hinton et al. (2015) *Distilling the Knowledge in a Neural Network* | 知识蒸馏奠基之作 |
| Romero et al. (2015) *FitNets* | 中间层特征蒸馏 |
| Park et al. (2019) *Relational Knowledge Distillation* | 关系蒸馏 |
| Taori et al. (2023) *Alpaca* | LLM 时代的 SFT 蒸馏 |
| Lu & Lab (2025) *On-Policy Distillation* | OPD 的理论基础 |
| DeepSeek-AI (2026) *DeepSeek V4 Technical Report* | OPD 的最新工程实践 |

---

*本文是「大模型核心技术」系列的第 2 篇。上一篇：[DeepSeek V4 论文精读：大模型小白的入门指南](/articles/ai/deepseek-v4-paper-reading)*
