"""
NexusDB - HTTP Server
Exposes Raft node state via REST API.
Run with: python server.py --id node1 --port 5000 --peers http://localhost:5001 http://localhost:5002
"""

import argparse
from flask import Flask, request, jsonify
from flask_cors import CORS
from node import RaftNode

app = Flask(__name__)
CORS(app)
node: RaftNode = None


# -------------------------------------------------------------------------
# Raft RPC endpoints (node-to-node)
# -------------------------------------------------------------------------
@app.route("/raft/request_vote", methods=["POST"])
def request_vote():
    return jsonify(node.handle_request_vote(request.json))


@app.route("/raft/append_entries", methods=["POST"])
def append_entries():
    return jsonify(node.handle_append_entries(request.json))


# -------------------------------------------------------------------------
# Client API endpoints
# -------------------------------------------------------------------------
@app.route("/store/<key>", methods=["GET"])
def get_key(key):
    return jsonify(node.client_get(key))


@app.route("/store/<key>", methods=["PUT"])
def set_key(key):
    value = request.json.get("value")
    return jsonify(node.client_set(key, value))


@app.route("/store/<key>", methods=["DELETE"])
def delete_key(key):
    return jsonify(node.client_delete(key))


# -------------------------------------------------------------------------
# Status endpoint (used by dashboard)
# -------------------------------------------------------------------------
@app.route("/status", methods=["GET"])
def status():
    return jsonify(node.get_status())


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--id", required=True, help="Node ID e.g. node1")
    parser.add_argument("--port", type=int, required=True, help="Port to listen on")
    parser.add_argument("--peers", nargs="*", default=[], help="Peer URLs")
    args = parser.parse_args()

    node = RaftNode(node_id=args.id, port=args.port, peers=args.peers)
    app.run(host="0.0.0.0", port=args.port)
