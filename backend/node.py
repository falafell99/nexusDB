"""
NexusDB - Raft Consensus Node
A minimal but real implementation of the Raft consensus algorithm.
"""

import threading
import time
import random
import requests
import logging
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(message)s')
logger = logging.getLogger(__name__)


class State(Enum):
    FOLLOWER = "follower"
    CANDIDATE = "candidate"
    LEADER = "leader"


@dataclass
class LogEntry:
    term: int
    key: str
    value: Optional[str]
    operation: str  # "SET" or "DELETE"


class RaftNode:
    def __init__(self, node_id: str, port: int, peers: list[str]):
        self.node_id = node_id
        self.port = port
        self.peers = peers  # list of peer URLs e.g. ["http://localhost:5001"]

        # --- Raft persistent state ---
        self.current_term = 0
        self.voted_for: Optional[str] = None
        self.log: list[LogEntry] = []

        # --- Raft volatile state ---
        self.commit_index = -1
        self.last_applied = -1
        self.state = State.FOLLOWER
        self.leader_id: Optional[str] = None
        self.votes_received = 0

        # --- Key-value store ---
        self.store: dict[str, str] = {}

        # --- Timers ---
        self.election_timeout = random.uniform(1.5, 3.0)
        self.last_heartbeat = time.time()
        self.lock = threading.Lock()

        # Start background threads
        threading.Thread(target=self._election_timer, daemon=True).start()
        logger.info(f"Node {self.node_id} started on port {self.port} | state: FOLLOWER")

    # -------------------------------------------------------------------------
    # Election Timer
    # -------------------------------------------------------------------------
    def _election_timer(self):
        """Triggers election if no heartbeat received within timeout."""
        while True:
            time.sleep(0.1)
            with self.lock:
                if self.state == State.LEADER:
                    continue
                elapsed = time.time() - self.last_heartbeat
                if elapsed > self.election_timeout:
                    logger.info(f"Node {self.node_id} election timeout — starting election")
                    self._start_election()

    def _start_election(self):
        self.state = State.CANDIDATE
        self.current_term += 1
        self.voted_for = self.node_id
        self.votes_received = 1  # vote for self
        self.last_heartbeat = time.time()
        self.election_timeout = random.uniform(1.5, 3.0)

        term = self.current_term
        last_log_index = len(self.log) - 1
        last_log_term = self.log[-1].term if self.log else 0

        logger.info(f"Node {self.node_id} starting election for term {term}")

        # Send RequestVote RPCs in background threads
        for peer in self.peers:
            threading.Thread(
                target=self._request_vote,
                args=(peer, term, last_log_index, last_log_term),
                daemon=True
            ).start()

    def _request_vote(self, peer: str, term: int, last_log_index: int, last_log_term: int):
        try:
            resp = requests.post(f"{peer}/raft/request_vote", json={
                "term": term,
                "candidate_id": self.node_id,
                "last_log_index": last_log_index,
                "last_log_term": last_log_term,
            }, timeout=0.5)
            data = resp.json()
            with self.lock:
                # If we got a higher term, step down
                if data["term"] > self.current_term:
                    self.current_term = data["term"]
                    self.state = State.FOLLOWER
                    self.voted_for = None
                    return
                if self.state == State.CANDIDATE and data.get("vote_granted"):
                    self.votes_received += 1
                    quorum = len(self.peers) // 2 + 1
                    if self.votes_received >= quorum:
                        self._become_leader()
        except Exception:
            pass  # peer unreachable

    def _become_leader(self):
        self.state = State.LEADER
        self.leader_id = self.node_id
        logger.info(f"Node {self.node_id} became LEADER for term {self.current_term}")
        threading.Thread(target=self._send_heartbeats, daemon=True).start()

    # -------------------------------------------------------------------------
    # Heartbeats (Leader → Followers)
    # -------------------------------------------------------------------------
    def _send_heartbeats(self):
        while True:
            with self.lock:
                if self.state != State.LEADER:
                    return
                term = self.current_term
                commit_index = self.commit_index

            for peer in self.peers:
                threading.Thread(
                    target=self._send_append_entries,
                    args=(peer, term, commit_index, []),
                    daemon=True
                ).start()
            time.sleep(0.5)

    def _send_append_entries(self, peer: str, term: int, commit_index: int, entries: list):
        try:
            requests.post(f"{peer}/raft/append_entries", json={
                "term": term,
                "leader_id": self.node_id,
                "commit_index": commit_index,
                "entries": entries,
            }, timeout=0.5)
        except Exception:
            pass

    # -------------------------------------------------------------------------
    # RPC Handlers (called by Flask routes in server.py)
    # -------------------------------------------------------------------------
    def handle_request_vote(self, data: dict) -> dict:
        with self.lock:
            term = data["term"]
            candidate_id = data["candidate_id"]
            vote_granted = False

            if term > self.current_term:
                self.current_term = term
                self.state = State.FOLLOWER
                self.voted_for = None

            if (term >= self.current_term and
                    (self.voted_for is None or self.voted_for == candidate_id)):
                self.voted_for = candidate_id
                vote_granted = True
                self.last_heartbeat = time.time()

            logger.info(f"Node {self.node_id} vote for {candidate_id}: {vote_granted}")
            return {"term": self.current_term, "vote_granted": vote_granted}

    def handle_append_entries(self, data: dict) -> dict:
        with self.lock:
            term = data["term"]
            leader_id = data["leader_id"]

            if term < self.current_term:
                return {"term": self.current_term, "success": False}

            # Valid heartbeat — reset timer
            self.last_heartbeat = time.time()
            self.current_term = term
            self.state = State.FOLLOWER
            self.leader_id = leader_id

            # Apply new log entries
            for entry_data in data.get("entries", []):
                entry = LogEntry(**entry_data)
                self.log.append(entry)
                self._apply_entry(entry)

            return {"term": self.current_term, "success": True}

    def _apply_entry(self, entry: LogEntry):
        if entry.operation == "SET":
            self.store[entry.key] = entry.value
        elif entry.operation == "DELETE":
            self.store.pop(entry.key, None)

    # -------------------------------------------------------------------------
    # Client API (called by Flask routes in server.py)
    # -------------------------------------------------------------------------
    def client_set(self, key: str, value: str) -> dict:
        with self.lock:
            if self.state != State.LEADER:
                return {"error": "not_leader", "leader_id": self.leader_id}

            entry = LogEntry(
                term=self.current_term,
                key=key,
                value=value,
                operation="SET"
            )
            self.log.append(entry)
            self._apply_entry(entry)
            self.commit_index = len(self.log) - 1

            # Replicate to peers
            entry_dict = {"term": entry.term, "key": entry.key,
                          "value": entry.value, "operation": entry.operation}

        for peer in self.peers:
            threading.Thread(
                target=self._send_append_entries,
                args=(peer, self.current_term, self.commit_index, [entry_dict]),
                daemon=True
            ).start()

        return {"success": True, "key": key, "value": value}

    def client_get(self, key: str) -> dict:
        with self.lock:
            value = self.store.get(key)
            if value is None:
                return {"error": "key_not_found"}
            return {"key": key, "value": value}

    def client_delete(self, key: str) -> dict:
        with self.lock:
            if self.state != State.LEADER:
                return {"error": "not_leader", "leader_id": self.leader_id}
            if key not in self.store:
                return {"error": "key_not_found"}

            entry = LogEntry(
                term=self.current_term,
                key=key,
                value=None,
                operation="DELETE"
            )
            self.log.append(entry)
            self._apply_entry(entry)
            self.commit_index = len(self.log) - 1

        return {"success": True, "key": key}

    def get_status(self) -> dict:
        with self.lock:
            return {
                "node_id": self.node_id,
                "state": self.state.value,
                "term": self.current_term,
                "leader_id": self.leader_id,
                "log_length": len(self.log),
                "commit_index": self.commit_index,
                "store_size": len(self.store),
            }
