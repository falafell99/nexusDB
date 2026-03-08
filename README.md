# 🛡️ NexusDB: Distributed Key-Value Store & Raft Overseer

> **High-availability storage engine engineered for strong consistency and fault tolerance.**

---

### 🚀 Quick Links
| 🌐 Live Demo | 📂 Repository | 🛠 Build Status |
| :--- | :--- | :--- |
| [**Open on Vercel**]([https://YOUR-VERCEL-LINK-HERE.vercel.app/](https://raft-overseer.vercel.app)) | [**Source Code**](https://github.com/rafael-ibayev/rafael-ibayev-portfolio) | ![Stable](https://img.shields.io/badge/Status-Stable-22c55e) |

---

## 📖 Overview
**NexusDB** is not just a database; it is a laboratory for **Distributed Systems**. In a world where servers fail and networks partition, NexusDB maintains a single source of truth using the **Raft Consensus Algorithm**. 

The system features **Raft Overseer** — a high-density monitoring dashboard that provides real-time visibility into the cluster's internal state machine.

---

## ⚙️ Core Engineering Pillars

### 1️⃣ Leader Election (Self-Healing)
The cluster automatically detects node failures. If a leader goes offline, the followers initiate an election term using **Randomized Timeouts** to prevent split-vote scenarios.
* **States:** `Follower` ➔ `Candidate` ➔ `Leader`
* **Heartbeats:** Automated RPC pulses to maintain authority.

### 2️⃣ Log Replication (Consistency)
Every write operation (SET/DELETE) is first recorded in the Leader's log and then synchronized across all Followers. Data is only finalized once it reaches a **Quorum**.

### 3️⃣ Safety & Quorum Logic
NexusDB guarantees that committed data survives even if nearly half the cluster disappears. The safety rule is governed by the majority formula:
$$Q = \lfloor n/2 \rfloor + 1$$

---

## 🛠 Advanced Features

### ⚡ Chaos Engineering Suite
Testing systems when they work is easy; testing them when they break is engineering. 
* **Node Termination:** Kill any node (including the leader) to trigger sub-second recovery.
* **Network Partitioning:** Simulate "Split-Brain" scenarios to see how the minority cluster pauses operations for safety.

### 📊 Real-Time Telemetry
* **Visual Pulse Mapping:** Watch heartbeat RPCs move across the network.
* **Logical Clock tracking:** Monitor the progression of **Raft Terms** and **Commit Indices**.
* **Cluster Health:** Dynamic gauges for throughput and replication latency.

---

## 💻 Tech Stack
* **Frontend:** React 18 & TypeScript (Type-safe architecture).
* **UI/UX:** Tailwind CSS + Shadcn UI (Industrial Enterprise aesthetic).
* **Logic:** Framed with **Framer Motion** for smooth state transitions.
* **Deployment:** CI/CD via GitHub Actions & Vercel.

---

## 👨‍💻 About the Author
**Rafael Ibayev**
* **Education:** Computer Science at **ELTE University**, Budapest.
* **Background:** International STEM Olympiad Gold Medalist.
* **Focus:** Distributed Systems, Robotics, and High-Performance Backend Engineering.

---

## 📄 License
This project is licensed under the **MIT License**.
