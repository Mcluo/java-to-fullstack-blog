---
title: "MDP 与动态规划：强化学习的数学骨架"
excerpt: "MDP 是强化学习的问题建模框架，动态规划是求解该框架的算法思想。理解 Bellman 方程，读懂整个 RL 脉络。"
category: "ai"
tags: ["reinforcement-learning", "dynamic-programming", "MDP", "Bellman方程", "算法"]
difficulty: "intermediate"
publishedAt: "2026-05-13"
readTime: 15
---

# MDP 与动态规划：强化学习的数学骨架

## 引言

很多人第一次接触强化学习时会感到困惑：RL 和"动态规划"有什么关系？DP 不是算法课上解背包问题用的吗？

这两者的关系比你想的更深。**MDP 是问题的建模框架，动态规划是求解该框架的算法思想**。理解这层关系，是真正理解强化学习数学基础的关键。

---

## 一、MDP 是什么

MDP（Markov Decision Process，马尔可夫决策过程）是一个五元组：

$$\mathcal{M} = (S, A, P, R, \gamma)$$

| 符号 | 含义 |
|------|------|
| $S$ | 状态空间（State space） |
| $A$ | 动作空间（Action space） |
| $P(s' \mid s, a)$ | 状态转移概率 |
| $R(s, a, s')$ | 奖励函数 |
| $\gamma \in [0, 1)$ | 折扣因子 |

**马尔可夫性质**是核心假设：下一个状态只依赖当前状态和动作，与历史无关：

$$P(s_{t+1} \mid s_t, a_t, s_{t-1}, a_{t-1}, \ldots) = P(s_{t+1} \mid s_t, a_t)$$

这个假设让"未来可预测"——只要知道现在，就够了。

---

## 二、我们要优化什么

智能体的目标是找到一个**策略** $\pi(a \mid s)$，使得长期累积奖励最大：

$$G_t = R_{t+1} + \gamma R_{t+2} + \gamma^2 R_{t+3} + \cdots = \sum_{k=0}^{\infty} \gamma^k R_{t+k+1}$$

为了评估一个策略的好坏，引入两个核心函数：

**状态价值函数**（State Value Function）：

$$V^\pi(s) = \mathbb{E}_\pi\left[G_t \mid s_t = s\right]$$

**动作价值函数**（Action Value Function / Q 函数）：

$$Q^\pi(s, a) = \mathbb{E}_\pi\left[G_t \mid s_t = s, a_t = a\right]$$

---

## 三、Bellman 方程：DP 的切入点

这里是最关键的一步。**Bellman 方程**将当前时刻的价值，分解为"即时奖励 + 下一状态的价值"：

$$V^\pi(s) = \sum_a \pi(a \mid s) \sum_{s'} P(s' \mid s, a) \left[R(s, a, s') + \gamma V^\pi(s')\right]$$

你是否看出来了？这就是**递归结构**！

$V^\pi(s)$ 依赖于 $V^\pi(s')$，而 $s'$ 是下一个状态。**动态规划正是利用这个递归关系，自底向上（或迭代）地求解整个状态空间的价值**。

这与你在 LeetCode 里写 DP 时的核心思想完全一致：
- **子问题重叠**：不同路径可能到达同一个状态 $s$
- **最优子结构**：最优策略的子策略也是最优的（Bellman 最优原理）

---

## 四、用 DP 求解 MDP 的三种算法

### 4.1 策略评估（Policy Evaluation）

**问题**：给定策略 $\pi$，计算 $V^\pi$。

**方法**：反复迭代 Bellman 方程直到收敛：

```python
def policy_evaluation(pi, P, R, gamma, theta=1e-6):
    V = {s: 0 for s in states}
    while True:
        delta = 0
        for s in states:
            v = V[s]
            # Bellman 期望方程
            V[s] = sum(
                pi[s][a] * sum(
                    P[s][a][s_] * (R[s][a][s_] + gamma * V[s_])
                    for s_ in states
                )
                for a in actions
            )
            delta = max(delta, abs(v - V[s]))
        if delta < theta:
            break
    return V
```

这就是 DP 中的**值更新**：用已知的邻居值来更新当前值。

---

### 4.2 策略迭代（Policy Iteration）

**思路**：评估 → 改进 → 评估 → 改进，循环直到稳定。

```
初始化随机策略 π

loop:
    1. 策略评估：计算 V^π
    2. 策略改进：
       对每个状态 s，选择使 Q(s,a) 最大的动作：
       π'(s) = argmax_a Σ P(s'|s,a)[R + γV^π(s')]

    if π' == π: 收敛，返回最优策略
```

**保证**：每次改进后策略不会变差（单调改进），有限状态下必然收敛。

---

### 4.3 值迭代（Value Iteration）

**思路**：跳过显式的策略评估，直接用 Bellman **最优**方程迭代：

$$V^*(s) = \max_a \sum_{s'} P(s' \mid s, a)\left[R(s, a, s') + \gamma V^*(s')\right]$$

```python
def value_iteration(P, R, gamma, theta=1e-6):
    V = {s: 0 for s in states}
    while True:
        delta = 0
        for s in states:
            v = V[s]
            # 注意这里是 max，而非 sum over policy
            V[s] = max(
                sum(P[s][a][s_] * (R[s][a][s_] + gamma * V[s_])
                    for s_ in states)
                for a in actions
            )
            delta = max(delta, abs(v - V[s]))
        if delta < theta:
            break
    # 从 V* 中提取最优策略
    pi = {s: argmax_a(s, V, P, R, gamma) for s in states}
    return V, pi
```

值迭代通常比策略迭代更简洁，但每次迭代做了不完整的策略评估。

---

## 五、对比三种算法

| | 策略评估 | 策略迭代 | 值迭代 |
|---|---|---|---|
| 目标 | 给定 π，算 V | 找最优 π | 找最优 V |
| Bellman 方程类型 | 期望方程 | 期望 + 最优 | 最优方程 |
| 收敛速度 | 慢 | 快（少数迭代） | 中等 |
| 每次迭代代价 | 低 | 高（含评估） | 低 |
| 适用场景 | 评估子任务 | 小状态空间 | 大多数场景 |

---

## 六、一个直观的例子

想象一个 $4 \times 4$ 的网格世界：

```
S  .  .  .
.  X  .  .
.  .  X  .
.  .  .  G
```

- `S` = 起点，`G` = 终点（奖励 +1），`X` = 障碍（奖励 -1）
- 每步奖励 -0.01（鼓励尽快到达）
- $\gamma = 0.9$

**DP 的工作方式**：
1. 初始化所有格子价值为 0
2. 从 `G` 开始，其价值 = 1
3. `G` 的邻居价值 = $-0.01 + 0.9 \times 1 = 0.89$
4. 继续向外传播，每次迭代价值信息扩散一步
5. 最终 `S` 的价值反映了到达 `G` 的最优期望收益

这个"**价值从目标向外扩散**"的过程，就是动态规划在 MDP 上的直观体现。

---

## 七、DP 的局限性 → 引出现代 RL

基于 DP 的方法有一个致命缺陷：**需要完整的模型**，即 $P(s' \mid s, a)$ 和 $R(s, a, s')$ 必须已知。

现实中：
- 围棋的状态转移概率？无法枚举
- 机器人手臂的物理模型？难以精确建模
- 复杂游戏环境？状态空间巨大

这催生了**无模型（Model-free）强化学习**：

```
DP（需要模型）
    ↓ 用采样代替期望
蒙特卡洛（MC）方法
    ↓ 结合 DP 的自举（bootstrapping）
TD 学习（Temporal Difference）
    ↓ 扩展到动作价值
Q-Learning / SARSA
    ↓ 用神经网络近似 Q 函数
Deep Q-Network（DQN）
```

Bellman 方程从未消失——它始终是所有 RL 算法的核心更新目标，只是从精确计算变成了采样近似。

---

## 总结

```
MDP 提供了「问题建模的语言」
    → 状态、动作、转移、奖励、折扣

Bellman 方程是「问题结构的揭示」
    → 当前价值 = 即时奖励 + 折扣后的未来价值

动态规划是「利用该结构的算法思想」
    → 消除重复计算，迭代传播价值

现代 RL 是「当模型未知时的近似解法」
    → 用采样近似期望，用网络近似函数
```

MDP 不是强化学习的一个话题，而是它的数学基础。动态规划不是解题技巧，而是这套数学框架的自然求解思路。读懂了 Bellman 方程，你就读懂了整个强化学习的脉络。

---

*参考资料：Sutton & Barto《Reinforcement Learning: An Introduction》（第二版），Chapter 3-4*
