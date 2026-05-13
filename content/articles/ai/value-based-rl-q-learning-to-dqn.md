---
title: "基于价值的强化学习：从 Q-learning 到 Deep Q-Network"
excerpt: "不直接学策略，而是学「每个状态/动作有多值钱」。从表格 Q-learning 出发，理解 DQN 的两大关键创新，以及 Double DQN、Dueling DQN 等后续改进。"
category: "ai"
tags: ["reinforcement-learning", "Q-learning", "DQN", "deep-learning", "Bellman方程"]
difficulty: "intermediate"
publishedAt: "2026-05-13"
readTime: 18
---

# 基于价值的强化学习：从 Q-learning 到 Deep Q-Network

## 一、核心思路：先学"估值"，再做决策

基于价值的方法（Value-based）的核心逻辑是：

> **不直接学策略，而是学"每个状态/动作有多值钱"，再从价值中推出策略。**

就像下棋的棋手：不需要记住每种局面该走哪步，只要能评估"当前局面对我有多有利"，自然就能选出最好的动作。

---

## 二、两个价值函数

**状态价值函数 $V^\pi(s)$**：在状态 $s$ 下，遵循策略 $\pi$ 能拿到的期望累积回报。

$$V^\pi(s) = \mathbb{E}_\pi[G_t \mid S_t = s]$$

**动作价值函数 $Q^\pi(s, a)$**：在状态 $s$ 下，先执行动作 $a$，再遵循策略 $\pi$ 能拿到的期望回报。

$$Q^\pi(s, a) = \mathbb{E}_\pi[G_t \mid S_t = s, A_t = a]$$

两者关系：

$$V^\pi(s) = \sum_a \pi(a \mid s) \cdot Q^\pi(s, a)$$

**为什么 Q 函数比 V 函数更有用？**

有了 $Q(s, a)$，提取策略是平凡的：

$$\pi^*(s) = \arg\max_a Q^*(s, a)$$

而 V 函数单独无法推出动作，还需要知道环境模型 $P(s' \mid s, a)$。

---

## 三、Bellman 最优方程

最优 Q 函数满足递推关系：

$$Q^*(s, a) = \mathbb{E}_{s'}\left[R(s,a,s') + \gamma \max_{a'} Q^*(s', a')\right]$$

读法：**当前动作的价值 = 即时奖励 + 下一步能取到的最大价值（折扣后）**

这个方程是 Q-learning 的数学根基。

---

## 四、Q-learning：表格时代

### 4.1 算法核心

Q-learning 用一张表 $Q[s][a]$ 存储所有状态-动作对的估值，然后用 TD 误差（Temporal Difference Error）迭代更新：

$$Q(s_t, a_t) \leftarrow Q(s_t, a_t) + \alpha \underbrace{\left[r_{t+1} + \gamma \max_{a'} Q(s_{t+1}, a') - Q(s_t, a_t)\right]}_{\text{TD 误差 }\delta_t}$$

| 符号 | 含义 |
|------|------|
| $\alpha$ | 学习率（更新步长） |
| $r_{t+1} + \gamma \max_{a'} Q(s_{t+1}, a')$ | TD 目标（我认为这一步应该值多少） |
| $Q(s_t, a_t)$ | 当前估值（我现在认为它值多少） |
| $\delta_t$ | 两者之差，误差越大更新越猛 |

### 4.2 完整算法

```python
# 初始化 Q 表为全 0
Q = defaultdict(lambda: defaultdict(float))

for episode in range(num_episodes):
    s = env.reset()

    while not done:
        # ε-greedy 策略：以 ε 概率探索，1-ε 概率利用
        if random.random() < epsilon:
            a = env.action_space.sample()       # 随机探索
        else:
            a = max(Q[s], key=Q[s].get)         # 贪婪选最优

        s_next, r, done, _ = env.step(a)

        # TD 更新
        td_target = r + gamma * max(Q[s_next].values(), default=0)
        td_error  = td_target - Q[s][a]
        Q[s][a]  += alpha * td_error

        s = s_next
```

### 4.3 ε-greedy：探索与利用的平衡

纯贪婪策略（总选当前最优）会陷入局部最优。ε-greedy 以概率 $\epsilon$ 随机探索：

```
ε = 1.0 → 0.01  (随训练进行线性衰减)
```

- 训练早期：多探索，发现更多可能
- 训练后期：多利用，收获已学到的知识

### 4.4 Q-learning 的特点：Off-policy

**Off-policy**：更新用的是 $\max_{a'} Q(s', a')$（贪婪），而不是实际执行的动作。这意味着收集数据的策略（行为策略）和被优化的策略（目标策略）可以不同——经验可以复用。

**对比 SARSA（On-policy）**：

```
Q-learning: Q(s,a) ← r + γ · max_{a'} Q(s', a')   ← 假设下一步贪婪
SARSA:      Q(s,a) ← r + γ · Q(s', a')             ← 用实际执行的 a'
```

Q-learning 更激进，SARSA 更保守（因为考虑了探索的代价）。

---

## 五、Q-learning 的致命局限

表格 Q-learning 只能处理**离散、小状态空间**。

| 问题 | 原因 |
|------|------|
| Atari 游戏（$84 \times 84$ 像素 RGB 图） | 状态空间 $\approx 256^{84 \times 84 \times 3}$，表格存不下 |
| 连续状态空间（如机器人关节角度） | 无限状态，无法枚举 |
| 泛化能力 | 相似状态 $(s_1, s_2)$ 的 Q 值完全独立，没有泛化 |

**解决思路**：用函数近似代替查表：

$$Q(s, a) \approx Q(s, a; \theta)$$

其中 $\theta$ 是参数。最强大的函数近似器——神经网络，由此引出 DQN。

---

## 六、Deep Q-Network（DQN）

2013 年 DeepMind 提出 DQN，首次让 RL 智能体直接从原始像素学会玩 Atari 游戏，并在多个游戏中超越人类水平。

### 6.1 网络结构

输入：最近 4 帧游戏画面（$84 \times 84 \times 4$）
输出：每个动作对应的 Q 值（同时输出所有动作）

```
输入帧 → Conv2D → Conv2D → Conv2D → Flatten → FC → FC → [Q(s,a1), Q(s,a2), ..., Q(s,an)]
```

一次前向传播得到所有动作的 Q 值，选最大的执行。

### 6.2 训练目标

最小化 TD 误差（均方损失）：

$$\mathcal{L}(\theta) = \mathbb{E}\left[\left(\underbrace{r + \gamma \max_{a'} Q(s', a'; \theta^-)}_{\text{TD 目标}} - Q(s, a; \theta)\right)^2\right]$$

注意 $\theta^-$ 和 $\theta$ 的区别——这是 DQN 的两大关键创新之一。

---

## 七、DQN 的两大关键技术

### 7.1 经验回放（Experience Replay）

**问题**：直接用时序数据训练神经网络，相邻样本高度相关，导致训练不稳定（违反 i.i.d. 假设）。

**解法**：维护一个回放缓冲区（Replay Buffer），将所有经历存储为 $(s, a, r, s')$ 元组，训练时**随机采样 mini-batch**：

```python
class ReplayBuffer:
    def __init__(self, capacity=100000):
        self.buffer = deque(maxlen=capacity)

    def push(self, s, a, r, s_next, done):
        self.buffer.append((s, a, r, s_next, done))

    def sample(self, batch_size):
        return random.sample(self.buffer, batch_size)
```

**两个好处**：
1. 打破时序相关性，样本接近 i.i.d.
2. 同一条经验可以被多次复用（数据效率↑）

### 7.2 目标网络（Target Network）

**问题**：TD 目标 $r + \gamma \max_{a'} Q(s', a'; \theta)$ 和预测值 $Q(s, a; \theta)$ 用同一套参数 $\theta$，目标在随参数一起移动——**追一个移动的靶子**，训练极不稳定。

**解法**：维护两套网络：
- **在线网络** $Q(s,a;\theta)$：实时更新，用于选动作
- **目标网络** $Q(s,a;\theta^-)$：冻结参数，用于计算 TD 目标，每 $C$ 步才从在线网络复制一次

```python
# 每 C 步同步一次
if step % C == 0:
    target_net.load_state_dict(online_net.state_dict())
```

靶子固定了，训练就稳了。

### 7.3 完整 DQN 训练循环

```python
replay_buffer = ReplayBuffer(100000)
online_net = DQN()
target_net = DQN()
target_net.load_state_dict(online_net.state_dict())
optimizer = Adam(online_net.parameters(), lr=1e-4)

for step in range(total_steps):
    # 1. 与环境交互，收集经验
    a = epsilon_greedy(online_net, s, epsilon)
    s_next, r, done, _ = env.step(a)
    replay_buffer.push(s, a, r, s_next, done)
    s = s_next if not done else env.reset()

    if len(replay_buffer) < batch_size:
        continue

    # 2. 随机采样 mini-batch
    batch = replay_buffer.sample(batch_size)
    s_b, a_b, r_b, s_next_b, done_b = zip(*batch)

    # 3. 计算 TD 目标（用目标网络）
    with torch.no_grad():
        td_target = r_b + gamma * target_net(s_next_b).max(1).values * (1 - done_b)

    # 4. 计算当前 Q 值，反向传播
    q_values = online_net(s_b).gather(1, a_b)
    loss = F.mse_loss(q_values, td_target)
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

    # 5. 定期更新目标网络
    if step % C == 0:
        target_net.load_state_dict(online_net.state_dict())
```

---

## 八、DQN 的后续改进

DQN 之后，研究者发现了几个明显缺陷并给出了改进：

| 问题 | 现象 | 改进方案 |
|------|------|---------|
| Q 值高估 | $\max$ 操作对噪声敏感，系统性高估 | **Double DQN**：用在线网络选动作，目标网络算价值 |
| 所有动作同等对待 | 某些状态下动作好坏差别不大，但仍浪费算力区分 | **Dueling DQN**：分别学 $V(s)$ 和优势函数 $A(s,a)$ |
| 均匀采样浪费 | 重要的稀有经验和无意义的经验同等概率被采样 | **优先经验回放（PER）**：按 TD 误差大小采样 |
| 单步回报偏差高 | 单步 TD 方差低但偏差高 | **Multi-step DQN**：用 n 步回报 $G_t^{(n)}$ 训练 |

**Double DQN** 的核心改动（一行代码）：

```python
# 原始 DQN
td_target = r + gamma * target_net(s_next).max(1).values

# Double DQN：动作选择和价值估计解耦
best_actions = online_net(s_next).argmax(1)
td_target = r + gamma * target_net(s_next).gather(1, best_actions.unsqueeze(1)).squeeze()
```

**Dueling DQN** 的网络结构：

$$Q(s, a; \theta) = V(s; \theta_v) + \left(A(s, a; \theta_a) - \frac{1}{|\mathcal{A}|}\sum_{a'} A(s, a'; \theta_a)\right)$$

```
                      ┌→ V(s; θ_v)    ─────────┐
特征提取层 →                                      → Q(s, a)
                      └→ A(s,a; θ_a) ─────────┘
```

将 Q 值分解为"这个状态本身值多少"和"这个动作比平均好多少"，让网络学得更稳、更快。

---

## 九、演进脉络总结

```
Q-learning（表格）
    ↓ 状态空间爆炸，需要函数近似
DQN（2013）
    = Q-learning + 神经网络 + 经验回放 + 目标网络
    ↓ Q 值高估
Double DQN（2015）
    ↓ 价值和优势分开学
Dueling DQN（2015）
    ↓ 重要经验该多学
优先经验回放 PER（2015）
    ↓ 以上全合并
Rainbow DQN（2017）
    = Double + Dueling + PER + Multi-step + NoisyNet + Distributional
```

Rainbow 把当时所有改进全部集成，在 Atari 57 个游戏的中位数得分上达到了人类水平的 223%。

---

## 十、核心认知小结

| | Q-learning | DQN |
|--|--|--|
| Q 函数表示 | 查表 | 神经网络 |
| 状态输入 | 离散、低维 | 任意（图像、连续） |
| 泛化能力 | 无 | 有（神经网络插值） |
| 训练稳定性 | 较好 | 需要经验回放 + 目标网络 |
| 适用场景 | 小型格子世界 | Atari、复杂游戏 |

**一句话**：DQN 做的事就是把"查表"换成"用神经网络估值"，然后用两个工程技巧（经验回放 + 目标网络）让训练不爆炸。算法思想从未变过，变的是函数近似的能力。

---

*参考资料：*
- *Mnih et al. 《Playing Atari with Deep Reinforcement Learning》（2013）*
- *Mnih et al. 《Human-level control through deep reinforcement learning》Nature（2015）*
- *van Hasselt et al. 《Deep Reinforcement Learning with Double Q-learning》（2015）*
- *Wang et al. 《Dueling Network Architectures for Deep Reinforcement Learning》（2015）*
- *Sutton & Barto《Reinforcement Learning: An Introduction》（第二版）Chapter 6*
