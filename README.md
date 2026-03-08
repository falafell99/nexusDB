🛡️ NexusDB: Fault-Tolerant Distributed Key-Value Store

Project Codename: Raft Overseer

Architecture: Distributed / Strongly Consistent

Protocol: Raft Consensus Algorithm

Environment: Linux / Dockerized Cluster

Status: v1.0-stable

NexusDB is a high-availability distributed storage system designed to maintain data integrity across unstable network environments. Built on the Raft Consensus Algorithm, it ensures strict linearizability and fault tolerance by synchronizing state machines across a multi-node cluster.

🏗 System Architecture
The core of NexusDB is based on State Machine Replication (SMR). Each node acts as an independent agent that transitions through specific states (Follower, Candidate, Leader) to maintain a synchronized log.

1. Leader Election

The system utilizes randomized heartbeat timeouts to trigger elections, ensuring a single, stable leader within any given term.

Election Safety: Guarantees that at most one leader can be elected in a single term.

Heartbeat Telemetry: Real-time monitoring of leader-to-follower health pings.

2. Log Replication

All state-changing operations are processed by the Leader, which appends the command to its log and replicates it to all Followers.

3. Safety (Quorum)

To guarantee consistency, a write is only considered Committed once it has been acknowledged by a majority of nodes:

Quorum=⌊n/2⌋+1
where n is the total number of active nodes in the cluster.

⚡ Engineering Features
Raft Core: Full implementation of Leader Election, Log Replication, and Safety protocols.

Chaos Engineering Console: A mission-control interface to stress-test the cluster:

Node Kill: Force-stop any node process to trigger re-elections.

Network Partition: Simulate network splits to test split-brain prevention.

Visual Telemetry: Real-time dashboard tracking:

Current Terms & Vote Counts.

Log Index synchronization status.

Logical Clock (Lamport) progression.

Persistence Layer: Write-ahead logging (WAL) for state recovery after crash-faults.

🛠 Tech Stack
Languages: Python (Logic/Prototyping), C++ (Core Performance)

Networking: gRPC / Protocol Buffers (Protobuf) for inter-node RPC calls.

Visualization: Custom CLI / Streamlit-based telemetry dashboard.

Testing: Distributed trace analysis and pytest for consensus validation.

🚀 Deployment & Operations
Initialize Cluster

Spin up a local 5-node cluster with automated port mapping:

Bash
python cluster_manager.py --nodes 5 --port_start 5000
Chaos Simulation

Trigger a network partition to observe the system's ability to maintain consistency:

Bash
# Isolate node 1 and 2 from the rest of the cluster
python chaos_console.py --partition 1,2 3,4,5
📊 Performance Metrics
Consensus Latency: < 12ms (Internal LAN).

Fault Tolerance: System remains operational with up to (n−1)/2 node failures.

Consistency Level: Strict Linearizability (CP in CAP Theorem).

Lead Engineer: Rafael Ibaev

ELTE University, Budapest
