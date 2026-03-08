NexusDB: High-Availability Distributed Key-Value Store 🛡️💾
📌 Overview
NexusDB is a distributed, strongly consistent key-value store designed to handle high-availability requirements in modern cloud infrastructures. At its core, NexusDB implements the Raft Consensus Algorithm to ensure that data remains synchronized across multiple nodes, even in the event of partial network failures or server crashes.

This project serves as a comprehensive study of Distributed Systems, focusing on state machine replication and fault-tolerant architecture.

⚙️ Distributed Architecture
NexusDB guarantees safety and consistency through a rigorous implementation of the Raft protocol:

1. Leader Election

Nodes operate in one of three states: Follower, Candidate, or Leader. If a Follower fails to receive a heartbeat within a randomized timeout, it transitions to a Candidate state and initiates a new election term.

2. Log Replication

All state changes flow through the Leader. Once an entry is appended to the Leader's log, it is replicated to all Followers.

3. Strong Consistency (Quorum)

NexusDB adheres to the majority rule. A write operation is only considered Committed once it is safely stored on a majority of nodes:

Q=⌊n/2⌋+1
This ensures that even if ⌊n/2⌋ nodes fail, the system remains operational and consistent.

🛠 Features
Interactive Cluster Monitor: Real-time visualization of the node topology and current roles (using the Raft Overseer dashboard).

Chaos Engineering Suite: * Node Termination: Manually crash the leader or followers to observe self-healing capabilities.

Network Partitioning: Simulate "Split Brain" scenarios and watch the Quorum logic in action.

Visual Log Stream: Monitor how SET and DELETE operations propagate through the distributed log indices.

Performance Telemetry: Real-time metrics on election terms, commit indices, and replication latency.

🚀 Tech Stack
Frontend: React, TypeScript.

Styling: Tailwind CSS (Enterprise Dark Theme).

Animations: Framer Motion (for node communication and state transitions).

Infrastructure: GitHub CI/CD & Vercel.

👨‍💻 Author
Rafael Ibayev

Computer Science Student @ ELTE University, Budapest.

International STEM Olympiad Gold Medalist.

Passionate about Distributed Systems, AI Safety, and Robotics.

📄 License
MIT License
