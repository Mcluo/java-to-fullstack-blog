---
title: "DQC 表行数波动异常排查实战"
excerpt: "排查 gba_keyword_engine_inc_d 表行数波动 DQC 红色异常，从单日告警定位到系统性链路故障的完整过程。涵盖 Chrome MCP 内网页面提取、odpscmd 多维度 SQL 分析、排查方法论总结。"
category: "troubleshooting"
tags: ["DQC", "ODPS", "数据质量", "向量化", "关键词引擎", "odpscmd", "Chrome MCP"]
publishedAt: "2026-04-06"
readTime: 12
---

## 1. 问题背景

DataWorks 数据质量（DQC）监控告警：表 `gba_keyword_engine_inc_d`（关键词引擎增量表）在业务日期 `ds=20260402` 触发**红色异常**，规则为"表行数波动监控"，波动率超过阈值 1.3（即 130%）。

### 告警信息摘要

| 项目 | 值 |
|---|---|
| Quality Job ID | 3676486 |
| 规则名称 | 表行数波动监控 |
| 规则类型 | 弱规则 / 表级 |
| 对比逻辑 | 当前周期 vs 前一天 (bizdate=-1) |
| 红色阈值 | 波动率 > 1.3 |
| 采样值 | 154,780 |
| 业务日期 | 2026-04-02 |
| 运行时间 | 2026-04-06 20:17:00 |

另一条规则"表行数跌 0"（固定值检查）通过，说明数据不为空，但量级异常。

---

## 2. 排查过程

### Step 1: 读取 DQC 页面信息

**工具**: Chrome MCP (chrome_navigate + chrome_get_web_content + chrome_javascript)

由于 DQC 是阿里内网系统，需要登录认证，无法用 WebFetch 直接获取。通过 Chrome MCP 操控已登录的浏览器 Tab，读取页面内容：

```
chrome_navigate → 导航到 DQC 页面
chrome_get_web_content → 获取页面文本
chrome_javascript → document.body.innerText 提取结构化信息
```

**收获**: 确认告警详情 — 规则配置、采样值、AI 分析建议。

### Step 2: 历史数据量趋势分析

**工具**: odpscmd (ODPS 命令行工具)

**SQL 1 — 近 10 天行数趋势**:

```sql
SELECT ds, COUNT(1) as cnt
FROM cbu_op_platform.gba_keyword_engine_inc_d
WHERE ds >= '20260328' AND ds <= '20260406'
GROUP BY ds ORDER BY ds;
```

**发现**: 数据量在几千到百万级之间剧烈波动，且 4/03、4/05、4/06 分区完全缺失。

**SQL 2 — 拉长到 3 周看全貌**:

```sql
SELECT ds, COUNT(1) as cnt
FROM gba_keyword_engine_inc_d
WHERE ds >= '20260315' AND ds <= '20260406'
GROUP BY ds ORDER BY ds;
```

**发现**: 3/16-3/20 日均 200 万+，3/21 起断崖下跌，之后持续不稳定。问题不是 4/02 单日异常，而是**系统性故障持续两周以上**。

### Step 3: 分区完整性检查

**工具**: odpscmd

```sql
SHOW PARTITIONS gba_keyword_engine_inc_d;
```

**发现**: 确认 `ds=20260403`、`ds=20260405`、`ds=20260406` 分区不存在，说明调度任务间歇性失败或未运行。

### Step 4: 表结构分析

**工具**: odpscmd

```sql
DESC gba_keyword_engine_inc_d;
```

**发现**: 这是一张**关键词向量索引表**，包含以下字段：

| 字段 | 说明 |
|---|---|
| `embedding` | 默认维度向量 |
| `embedding_2048` | 2048 维向量 |
| `embedding_4096` | 4096 维向量 |
| `sparse_indices` / `sparse_values` | 稀疏向量 |
| `key` | 主键 |
| `type` | 类型 (keyword / cate) |
| `keyword` | 关键词 |
| `country` | 国家 |
| `platform` | 平台 |

表元信息：Lifecycle = 30 天，LastDDLTime = 2026-03-10（3/10 有过 DDL 变更）。

### Step 5: 多维度数据拆解 — 定位波动源

**工具**: odpscmd

**SQL — 按 type/country/platform 拆分**:

```sql
SELECT ds,
  SUM(CASE WHEN type='keyword' AND country='CN' AND platform='taobao'
      THEN 1 ELSE 0 END) as cn_taobao_keyword,
  SUM(CASE WHEN NOT (type='keyword' AND country='CN' AND platform='taobao')
      THEN 1 ELSE 0 END) as other_data,
  COUNT(1) as total
FROM gba_keyword_engine_inc_d
WHERE ds >= '20260315'
GROUP BY ds ORDER BY ds;
```

**关键发现**:

| 日期 | CN taobao keyword | 其他数据 | CN 占比 |
|---|---:|---:|---|
| 20260401 | 7,359 | 816 | 90.0% |
| 20260402 | 154,083 | 697 | 99.5% |
| 20260404 | 1,064,783 | 719 | 99.9% |

- **其他数据（Amazon/TikTok 各国）每天稳定在 600-960 条，几乎恒定**
- **所有波动 100% 来自 CN/taobao/keyword**
- 这一步是整个排查的**关键转折点** — 将问题从"整张表异常"精确定位到"淘宝关键词向量化链路不稳定"

### Step 6: 数据质量校验

**工具**: odpscmd

**SQL — 检查重复和空值**:

```sql
SELECT 'total' as metric, COUNT(1) as val
  FROM gba_keyword_engine_inc_d WHERE ds = '20260402'
UNION ALL
SELECT 'distinct_keys', COUNT(DISTINCT key)
  FROM gba_keyword_engine_inc_d WHERE ds = '20260402'
UNION ALL
SELECT 'null_embedding', SUM(CASE WHEN embedding IS NULL OR embedding = '' THEN 1 ELSE 0 END)
  FROM gba_keyword_engine_inc_d WHERE ds = '20260402';
```

| 指标 | 值 | 判断 |
|---|---|---|
| 总行数 | 154,780 | — |
| 去重 key 数 | 154,780 | 无重复 |
| 空 embedding | 5,659 (3.66%) | 部分向量计算失败 |

**SQL — 各分区 embedding 空值率对比**:

```sql
SELECT ds, COUNT(1) as total,
  SUM(CASE WHEN embedding IS NULL OR embedding = '' THEN 1 ELSE 0 END) as null_emb,
  ROUND(SUM(CASE WHEN embedding IS NULL OR embedding = '' THEN 1 ELSE 0 END) * 100.0 / COUNT(1), 2) as null_pct
FROM gba_keyword_engine_inc_d
WHERE ds >= '20260328'
GROUP BY ds ORDER BY ds;
```

空值率在 1.1% ~ 20% 之间波动，数据量越少时空值率反而越高，可能与向量服务的 batch 处理有关。

---

## 3. 使用的技术与工具

### 3.1 [Chrome MCP](/articles/tools-and-tips/claude-code-browser-automation-guide) — 内网页面数据提取

当目标页面需要内网登录认证时，WebFetch 无法访问。Chrome MCP 可以操控用户**已登录的浏览器**，实现：

- `chrome_navigate` — 导航到目标 URL
- `chrome_get_web_content` — 提取页面可见文本（自动转 Markdown）
- `chrome_javascript` — 执行 JS 获取 `document.body.innerText`
- `chrome_screenshot` — 截图保存现场

**适用场景**: DataWorks、Aone、内部看板等需要登录的内网系统。

### 3.2 odpscmd — ODPS/MaxCompute 命令行查询

本地安装的 ODPS 命令行工具，通过 NCS 免 AK 认证连接内部 ODPS 集群。

```bash
# 基本用法
odpscmd -e "use project_name; SELECT ... ;"

# 查看分区
odpscmd -e "SHOW PARTITIONS table_name;"

# 查看表结构
odpscmd -e "DESC table_name;"
```

**优势**: 无需配置 ODPS Access Key，NCS 自动认证，可在 Claude Code 中直接调用。

### 3.3 SQL 分析方法论

本次排查使用的 SQL 分析策略：

| 阶段 | 方法 | 目的 |
|---|---|---|
| 宏观趋势 | `GROUP BY ds + COUNT` | 发现整体波动模式 |
| 分区完整性 | `SHOW PARTITIONS` | 发现缺失分区 |
| 多维拆解 | `CASE WHEN + SUM` | 精确定位波动维度 |
| 数据校验 | `COUNT DISTINCT / NULL 检查` | 排除数据质量问题（重复、空值） |
| 空值分析 | `NULL 率跨分区对比` | 发现向量计算稳定性问题 |

**核心思路**: **先看整体，再分维度，逐步缩小范围**。本案中从"整表波动"→"CN/taobao/keyword 单一维度波动"是排查效率的关键。

---

## 4. 分析结论

### 根因

`gba_keyword_engine_inc_d` 表的行数波动**并非 4/02 单日异常，而是从 3/21 起持续存在的淘宝关键词向量化链路系统性不稳定**。

具体表现：
1. Amazon/TikTok 各国数据产出稳定（日均 600-960 条），说明基础框架正常
2. CN/taobao/keyword 数据从日均百万级骤降至几千，且日间波动巨大
3. 多个分区完全缺失（4/03、4/05、4/06），调度任务间歇性未运行
4. embedding 字段存在 3-20% 的空值率，向量计算服务可能有限流或异常

### 可能触发因素

- 3/10 有 DDL 变更（`LastDDLTime: 2026-03-10`），可能影响了上游写入逻辑
- 3/21 起 CN 数据断崖，可能与淘宝关键词源数据供给变化或上游调度配置变更有关

---

## 5. 建议措施

| 优先级 | 措施 |
|---|---|
| P0 | 在运维中心排查上游 CN/taobao 关键词处理节点的调度状态 |
| P0 | 确认 4/03、4/05、4/06 分区缺失原因 |
| P1 | 排查 3/10 DDL 变更和 3/21 数据断崖的关联 |
| P1 | 检查向量计算服务（embedding 空值）是否有容量问题 |
| P2 | 优化 DQC 规则：改为"分区存在 + 行数 > 0 + embedding 空值率 < 10%"三重检测 |

---

## 6. 排查方法论总结

```
DQC 告警
  ↓
1. 读取告警详情（Chrome MCP 访问内网页面）
  ↓
2. 宏观趋势分析（COUNT + GROUP BY ds，拉长时间窗口）
  ↓
3. 分区完整性检查（SHOW PARTITIONS，发现缺失）
  ↓
4. 表结构理解（DESC，理解业务含义）
  ↓
5. 多维度拆解（CASE WHEN 按 type/country/platform 分组）
  → 关键转折：定位到单一维度是波动源
  ↓
6. 数据质量校验（去重、空值检查）
  ↓
7. 形成结论：单日告警 → 系统性链路问题
```

<img src="/images/dqc/dqc-troubleshooting-flow.svg" alt="DQC 异常排查方法论流程" style="max-width:100%;margin:1em 0;" />

核心经验：**不要被单日告警限制视野，拉长时间窗口 + 多维度拆解才能看到真正的问题模式。**
