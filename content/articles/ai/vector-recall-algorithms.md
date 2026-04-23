---
title: "向量召回算法全解析：从 HNSW 到混合检索，一篇搞懂 RAG 的底层引擎"
excerpt: "HNSW、IVF、PQ、BM25…向量数据库底层到底在做什么？本文从原理到工程，配 5 张架构图，带你彻底搞懂向量召回体系，以及如何在 RAG 中落地混合检索。"
category: "ai"
tags: ["向量检索", "HNSW", "RAG", "Faiss", "向量数据库", "BM25", "混合召回", "ANN"]
publishedAt: "2026-04-23"
readTime: 25
---

> 当你在用 ChatGPT、Notion AI、或者公司内部 RAG 系统提问时，系统在毫秒之内从数百万篇文档里找到最相关的几段——这背后的核心引擎，就是**向量召回**。
> 
> 本文从算法原理出发，结合实际工程经验，完整梳理向量召回的技术体系。配有 5 张 draw.io 架构图，适合想深入理解 RAG 底层的工程师。

---

## 一、为什么需要向量召回？

传统搜索（BM25/TF-IDF）是基于**关键词匹配**的：用户搜"苹果手机"，系统就去找包含"苹果""手机"这两个词的文档。

这带来一个致命问题：**语义鸿沟**。

- 用户问"如何提升代码质量"，文档里写的是"clean code 实践"——关键词没有交集，传统搜索找不到。
- 用户搜"头疼"，但文档里的关键词是"偏头痛"——同义词问题。

**向量检索**的思路是：把文本转化为高维向量（embedding），在向量空间里，语义相近的内容距离更近。用户的查询和文档都变成向量，问题转化为**在高维空间里找最近邻**。

```
"如何提升代码质量" → [0.12, 0.87, 0.34, ...]
"clean code 实践"   → [0.14, 0.85, 0.31, ...]  ← 距离很近！

"今天天气真好"      → [0.91, 0.02, 0.76, ...]  ← 距离很远
```

但问题来了：**向量维度通常是 768~4096 维，数据量可能是几百万甚至十亿条**。暴力计算所有向量的距离，每次查询都是 O(n·d) 的计算量，根本无法满足实时要求。

这就催生了一整套**近似最近邻（ANN，Approximate Nearest Neighbor）算法**。

---

## 二、算法全景图

> 📊 **图1：向量召回算法全景图**  
> [vector-recall-algorithms.drawio](./vector-recall-algorithms.drawio) → 打开 `01-算法全景图`

向量召回算法可以分为五大流派：

| 类别 | 代表算法 | 核心思想 |
|------|----------|----------|
| 精确搜索 | Flat (暴力) | 无索引，遍历计算 |
| **图索引** | **HNSW, DiskANN** | 分层图结构，贪心跳跃 |
| 树索引 | KD-Tree, Annoy | 空间划分，递归搜索 |
| 哈希索引 | LSH | 相似向量碰撞到同一桶 |
| **向量量化** | **IVF, PQ, IVF+PQ** | 压缩向量，缩小搜索空间 |

> ⚠️ **维度诅咒（Curse of Dimensionality）**：树类算法在低维（<20维）效果好，但随着维度升高，空间划分的效果急剧退化，几乎退化成暴力搜索。高维场景下，图索引和量化方法是主流。

---

## 三、精确搜索：Flat

最简单，最慢，但最准。

**原理**：对每个查询向量，计算它与数据库中所有向量的距离，返回距离最小的 Top-K 个。

```python
import numpy as np

def flat_search(query, database, k=10):
    # query: (d,) 查询向量
    # database: (n, d) 数据库向量
    distances = np.linalg.norm(database - query, axis=1)  # 计算L2距离
    indices = np.argsort(distances)[:k]
    return indices, distances[indices]
```

**适用场景**：
- 数据量 < 100 万
- 对精度要求 100%（如金融合规检索）
- 作为其他算法的精度基准

---

## 四、图索引：HNSW（重点）

> 📊 **图2：HNSW 分层图结构**  
> [vector-recall-algorithms.drawio](./vector-recall-algorithms.drawio) → 打开 `02-HNSW分层结构`

**HNSW（Hierarchical Navigable Small World）** 是目前工业界最主流的向量索引算法，Milvus、Weaviate、Qdrant、OpenSearch 都以它为默认索引。

### 4.1 核心思想

HNSW 受到**跳表（Skip List）**的启发，但将其推广到了无序的高维空间：

- **跳表**：有序链表的多层加速，高层稀疏做长跳，低层密集做精确搜索
- **HNSW**：用"近邻图"替代"有序链表"，在高维空间构建分层导航结构

```
跳表（1D有序）:
Layer 2: 1 ──────── 5 ──────── 9
Layer 1: 1 ── 3 ── 5 ── 7 ── 9
Layer 0: 1-2-3-4-5-6-7-8-9

HNSW（高维空间）:
Layer 2: A ─────────────── E ─────────── J   （3个节点，长距离跳跃）
Layer 1: A ──── C ──── E ──── G ──── J        （6个节点，中等密度）
Layer 0: A─B─C─D─E─F─G─H─I─J                  （全量节点，精确近邻）
```

### 4.2 关键参数

| 参数 | 含义 | 典型值 | 影响 |
|------|------|--------|------|
| `M` | 每个节点的最大连接数 | 16~64 | 越大精度越高，内存越大 |
| `ef_construction` | 构建时的候选池大小 | 100~500 | 越大索引质量越好，构建越慢 |
| `ef_search` | 查询时的候选池大小 | 50~200 | 越大精度越高，查询越慢 |
| `M_max0` | 底层最大连接数 | 2×M | 固定为M的两倍 |

### 4.3 搜索过程

```
1. 从 Layer 2 的入口点 A 出发
2. 在当前层，贪心地跳向与目标向量最近的邻居节点
3. 到达局部最优后，下降到下一层（同一物理节点）
4. 重复步骤 2-3，直到 Layer 0
5. 在 Layer 0 精确找到 Top-K 近邻
```

**时间复杂度**：O(log N) 的层数 × 每层 O(M) 的近邻遍历

### 4.4 代码示例（hnswlib）

```python
import hnswlib
import numpy as np

# 建索引
dim = 768
num_elements = 1000000

index = hnswlib.Index(space='cosine', dim=dim)
index.init_index(max_elements=num_elements, ef_construction=200, M=32)

# 添加向量
vectors = np.random.random((num_elements, dim)).astype('float32')
index.add_items(vectors)

# 查询
index.set_ef(100)  # ef_search
query = np.random.random((1, dim)).astype('float32')
labels, distances = index.knn_query(query, k=10)
print(f"Top-10 neighbors: {labels[0]}")
```

### 4.5 优缺点

✅ **优点**：精度最高（接近暴力搜索）、支持动态增删、查询速度快  
❌ **缺点**：内存消耗大（每个节点存储 M 条边）、不适合内存受限场景

---

## 五、图索引进阶：NSG 与 DiskANN

### NSG（Navigating Spreading-out Graph）

NSG 对 HNSW 的图构建策略做了优化，目标是在保持召回率的同时减少边的数量：

- 每个节点的出度更少（更省内存）
- 但图构建时间更长，工程复杂度更高
- 适合内存敏感、对离线建索引时间不敏感的场景

### DiskANN（微软出品）

**DiskANN 解决的核心问题**：HNSW 要求全量索引在内存中，十亿规模下内存成本不可接受。

**核心设计**：
1. 索引文件存在 SSD 上，而非内存
2. 查询时按需从 SSD 读取节点邻居列表（充分利用 SSD 随机读性能）
3. 结合 PQ 压缩，用少量内存缓存近似距离，减少 SSD 访问次数

```
传统 HNSW（10亿向量，768维）：内存需求 ~3 TB
DiskANN：内存 ~32 GB（PQ缓存）+ SSD ~1.5 TB（全量索引）
```

适合场景：十亿级别、内存受限、对延迟有一定容忍的离线/准实时场景。

---

## 六、树索引：KD-Tree、Ball-Tree、Annoy

### KD-Tree

经典算法，通过递归地在某个维度上对空间进行二分来构建树：

```
维度0         维度1
     ┌──────────────┐
     │    5.1       │  按维度0的中位数5.1分割
     └──────────────┘
  左子树          右子树
```

**致命缺陷**：维度诅咒。在高维空间（>20维），几乎所有点之间的距离都趋于相等，KD-Tree 的剪枝失效，退化为暴力搜索。

**适合场景**：地理坐标（2D/3D）、低维特征检索。

### Annoy（Spotify）

随机投影树（Random Projection Tree）的工程实现：

1. 随机选择两个点，作垂直平分面切割空间
2. 重复多次，构建多棵随机树
3. 查询时在多棵树中投票，合并候选集

**优点**：构建快，内存效率好，支持 mmap 共享  
**缺点**：不支持动态插入，构建完索引不可更改，精度一般

---

## 七、哈希索引：LSH

**LSH（Locality Sensitive Hashing，局部敏感哈希）** 的思想：设计一种哈希函数，使得**相似的向量以高概率碰撞到同一个桶**。

```
设计哈希函数 h(x) = sign(w · x)（随机超平面投影）

向量A = [0.1, 0.9, 0.2]  → h(A) = [1, 0, 1, 1, 0]
向量B = [0.2, 0.8, 0.3]  → h(B) = [1, 0, 1, 1, 0]  ← 碰撞（相似）
向量C = [0.9, 0.1, 0.8]  → h(C) = [0, 1, 0, 0, 1]  ← 不碰撞（不相似）
```

查询时，只搜索与查询向量碰撞的桶，大幅减少比较次数。

**现状**：LSH 在工业界已基本被 HNSW 替代，精度/速度权衡不如图索引，但概念上很优雅，仍有学术价值。

---

## 八、向量量化：PQ（乘积量化）

> 📊 **图3：PQ 乘积量化原理**  
> [vector-recall-algorithms.drawio](./vector-recall-algorithms.drawio) → 打开 `04-乘积量化PQ`

**向量量化的核心目标：压缩向量，用更少内存存更多数据。**

### 8.1 标量量化（SQ）

最简单的量化：每个浮点数（float32，4 bytes）量化为整数（uint8，1 byte）。

```
原始：[0.12, 0.87, 0.34]  (float32 × 3 = 12 bytes)
量化：[  31,  222,   87]  (uint8  × 3 =  3 bytes)  → 压缩 4 倍
```

### 8.2 乘积量化（PQ）

PQ 的压缩比更激进。核心思想：

**Step 1**：将高维向量切分为 M 段子向量（每段 d/M 维）

**Step 2**：对每段子向量独立做 K-Means（通常 K=256），得到 M 个码本

**Step 3**：每个子向量用其最近的码本中心的编号（0-255）替代，1 byte 就能表示

```
原始向量（128维，float32）= 512 bytes

切分为8段，每段16维：
段1: [0.12, 0.87, ...16个] → 量化为 42   (uint8)
段2: [0.34, 0.56, ...16个] → 量化为 17   (uint8)
...
段8: [0.91, 0.23, ...16个] → 量化为 147  (uint8)

压缩后：[42, 17, 253, 8, 199, 66, 31, 147] = 8 bytes

压缩比：512 / 8 = 64:1 🎉
```

### 8.3 内存对比（1亿向量，128维）

| 方法 | 内存 | 说明 |
|------|------|------|
| 原始 float32 | **51.2 GB** | 不可接受 |
| SQ（uint8） | 12.8 GB | 压缩 4× |
| PQ（M=8） | **0.8 GB** | 压缩 64× |

### 8.4 距离计算加速

PQ 还有一个隐藏优势：**非对称距离计算（ADC）**。

查询前预计算查询向量与所有码本中心的距离，形成距离查找表（Look-Up Table）。之后对每条 PQ 编码的向量，只需 M 次表查找就能估算距离，而不需要 M×(d/M) 次浮点运算。

```
预计算：query 对所有码本中心的距离 → 距离表 DTable[m][k]

查询时：
distance(query, vec_i) ≈ Σ DTable[m][code_i[m]]
                         m=0 to M-1
= M次内存查找（极快！）
```

---

## 九、倒排文件索引：IVF

> 📊 **图4：IVF 倒排索引原理**  
> [vector-recall-algorithms.drawio](./vector-recall-algorithms.drawio) → 打开 `03-IVF倒排索引`

**IVF（Inverted File Index）** 的核心思想：先粗粒度聚类，查询时只搜相关的簇。

### 9.1 建索引（离线）

1. 对全量向量做 K-Means，得到 N_list 个聚类中心（簇）
2. 每个向量归属到最近的簇
3. 建立"簇 → 向量列表"的倒排表

### 9.2 查询（在线）

```
1. 计算查询向量 q 与所有 N_list 个簇中心的距离
2. 取距离最近的 nprobe 个簇
3. 仅在这 nprobe 个簇内的向量列表里搜索
4. 返回 Top-K 结果
```

**效果**：搜索空间从 N 缩减到约 N/N_list × nprobe。

**关键参数**：
- `nlist`：簇的数量，越大精度越高，建索引越慢（推荐：`4 × sqrt(N)`）
- `nprobe`：查询时搜索的簇数量，越大精度越高，越慢（一般 nprobe ≪ nlist）

### 9.3 IVF + PQ：工业界最常用组合

```python
import faiss
import numpy as np

d = 128      # 向量维度
n = 1000000  # 向量数量
M = 8        # PQ子向量段数
nlist = 1000 # 簇数量

# 创建 IVF+PQ 索引
quantizer = faiss.IndexFlatL2(d)  # 粗量化器（簇中心搜索用暴力）
index = faiss.IndexIVFPQ(quantizer, d, nlist, M, 8)  # 8 = 每段8位

# 训练（需要足够的训练数据）
training_data = np.random.random((100000, d)).astype('float32')
index.train(training_data)

# 添加向量
database = np.random.random((n, d)).astype('float32')
index.add(database)

# 查询
index.nprobe = 32  # 搜索32个簇
query = np.random.random((1, d)).astype('float32')
distances, indices = index.search(query, k=10)
print(f"Top-10: {indices[0]}")
```

---

## 十、距离度量的选择

向量召回算法是通用的，但要选对距离度量：

| 距离度量 | 公式 | 适用场景 |
|----------|------|----------|
| **余弦相似度** | cos θ = (a·b) / (‖a‖‖b‖) | 文本语义（最常用），与向量长度无关 |
| **内积（IP）** | a·b | 向量已归一化时等价余弦，推荐系统 |
| **L2 欧氏距离** | √Σ(aᵢ-bᵢ)² | 图像、坐标类任务 |
| **Hamming 距离** | 不同位的数量 | 二值向量（如感知哈希） |

> 💡 **实践建议**：
> - 用 text-embedding 模型时，输出向量通常已归一化，余弦和内积等价，选内积（更快）
> - 自己训练的 embedding 没有归一化时，先 L2 归一化再用内积

---

## 十一、混合召回：BM25 + 向量（RAG 最佳实践）

> 📊 **图5：RAG 混合召回架构**  
> [vector-recall-algorithms.drawio](./vector-recall-algorithms.drawio) → 打开 `05-混合召回RAG流程`

纯向量检索有一个弱点：**对专有名词、术语、数字不敏感**。

例如，用户问"CVE-2024-3400 是什么漏洞"，HNSW 可能召回一堆语义相关的安全文档，但就是找不到那篇专门描述 CVE-2024-3400 的文章。这时候 BM25 的精确关键词匹配就非常关键。

**混合召回 = BM25 并行 + HNSW，再用 RRF 融合**。

### 11.1 RRF 融合（Reciprocal Rank Fusion）

```python
def rrf_merge(bm25_results, vector_results, k=60):
    """
    bm25_results: [(doc_id, rank), ...] BM25排名列表
    vector_results: [(doc_id, rank), ...] 向量检索排名列表
    k: 平滑参数，防止排名靠前的文档得分过高
    """
    scores = {}
    for doc_id, rank in bm25_results:
        scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank)
    for doc_id, rank in vector_results:
        scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank)
    
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)
```

RRF 的优点：不需要归一化两路分数（BM25分数和余弦相似度量纲不同），直接用排名做融合，简单有效。

### 11.2 LangChain 集成示例

```python
from langchain.retrievers import BM25Retriever, EnsembleRetriever
from langchain_community.vectorstores import Milvus
from langchain_community.embeddings import HuggingFaceEmbeddings

# 向量召回
embeddings = HuggingFaceEmbeddings(model_name="Qwen/Qwen3-Embedding")
vectorstore = Milvus.from_documents(docs, embeddings)
vector_retriever = vectorstore.as_retriever(search_kwargs={"k": 20})

# BM25召回
bm25_retriever = BM25Retriever.from_documents(docs)
bm25_retriever.k = 20

# 混合（各占50%权重）
ensemble_retriever = EnsembleRetriever(
    retrievers=[bm25_retriever, vector_retriever],
    weights=[0.5, 0.5]
)

# 查询
results = ensemble_retriever.invoke("什么是向量数据库？")
```

---

## 十二、算法选型指南

### 按数据规模

```
数据量 < 100万
  └─ HNSW (hnswlib / Faiss IndexHNSWFlat)

数据量 100万 ~ 1亿  
  └─ IVF + HNSW 或 IVF + PQ (Faiss)

数据量 > 1亿（十亿级）
  └─ DiskANN 或 IVF + PQ + GPU (Faiss with GPU)

RAG / 混合场景
  └─ HNSW + BM25 + RRF（Milvus / Weaviate 原生支持）
```

### 按核心约束

| 约束 | 推荐方案 |
|------|----------|
| 精度优先 | HNSW (高ef_search) |
| 速度优先 | IVF+PQ (低nprobe) |
| 内存受限 | DiskANN 或 IVF+PQ |
| 需要过滤（按字段筛选） | Milvus / Weaviate（支持 ANNS + 标量过滤） |
| 实时插入 | HNSW（支持动态添加） |
| 只读场景 | Annoy 或 Faiss IndexIVFFlat |

### 主流向量数据库对比

| 数据库 | 默认索引 | 特点 |
|--------|----------|------|
| **Milvus** | HNSW / IVF | 云原生，支持混合搜索，生产首选 |
| **Weaviate** | HNSW | 内置 BM25+向量混合，GraphQL API |
| **Qdrant** | HNSW | Rust 实现，极低延迟，支持 payload 过滤 |
| **Chroma** | HNSW | 轻量，本地开发友好 |
| **Pinecone** | 自研 | 全托管，无运维负担 |
| **OpenSearch** | HNSW | 与 ES 生态兼容，已有 ES 集群可直接升级 |

---

## 十三、性能基准

以下数据来自 [ann-benchmarks.com](http://ann-benchmarks.com)（SIFT-1M 数据集，768维，100万向量）：

| 算法 | Recall@10 | QPS | 内存 |
|------|-----------|-----|------|
| HNSW (M=32, ef=200) | **99.2%** | 8,500 | ~6 GB |
| IVF+PQ (nlist=4096, nprobe=128) | 95.1% | **45,000** | 0.2 GB |
| Annoy (n_trees=100) | 93.5% | 3,200 | 5 GB |
| Flat (暴力) | 100% | 120 | 4 GB |
| LSH | 89.3% | 6,000 | 3 GB |

> 💡 **关键洞察**：HNSW 在精度和速度之间取得了最好的平衡；IVF+PQ 内存极省，QPS 极高，但精度有所牺牲。

---

## 十四、总结

```
向量召回 = 找高维空间中的近邻问题

┌─ 精确搜索（Flat）→ 100%精度，小数据用
├─ 图索引（HNSW）→ 工业首选，精度速度双高
│    └─ DiskANN → 十亿级，SSD存储
├─ 树索引（KD/Ball/Annoy）→ 低维场景
├─ 哈希（LSH）→ 已过时
└─ 量化（PQ/SQ）→ 压缩利器，配合IVF使用

最佳实践（RAG）：HNSW + BM25 混合召回 + RRF融合
```

**技术发展趋势**：

1. **GPU 加速向量检索**：Faiss GPU 版本在大规模批量查询中比 CPU 快 10~100 倍
2. **向量 + 图数据库融合**：如 NebulaGraph + 向量，支持基于图关系的语义检索
3. **学习式索引**：用神经网络替代传统索引结构，自适应数据分布
4. **多模态统一向量空间**：文本、图片、视频统一到同一向量空间（CLIP、BLIP-2 等）

---

## 参考资料

- [Faiss 官方文档](https://faiss.ai/)
- [HNSW 论文：Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs](https://arxiv.org/abs/1603.09320)
- [DiskANN 论文：DiskANN: Fast Accurate Billion-point Nearest Neighbor Search on a Single Node](https://proceedings.neurips.cc/paper/2019/file/09853c7fb1d3f8ee67a61b6bf4a7f8e6-Paper.pdf)
- [ANN Benchmarks](http://ann-benchmarks.com/)
- [Milvus 文档](https://milvus.io/docs)

---

*如果这篇文章对你有帮助，欢迎分享给更多需要理解 RAG 底层的工程师 🙌*
