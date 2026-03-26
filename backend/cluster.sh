#!/bin/bash
# cluster.sh — Launch a 3-node NexusDB cluster locally
# Usage: bash cluster.sh
# Stop with: Ctrl+C

echo "Starting NexusDB 3-node cluster..."

python server.py --id node1 --port 5000 --peers http://localhost:5001 http://localhost:5002 &
PID1=$!

python server.py --id node2 --port 5001 --peers http://localhost:5000 http://localhost:5002 &
PID2=$!

python server.py --id node3 --port 5002 --peers http://localhost:5000 http://localhost:5001 &
PID3=$!

echo "Cluster running:"
echo "  node1 → http://localhost:5000/status"
echo "  node2 → http://localhost:5001/status"
echo "  node3 → http://localhost:5002/status"
echo ""
echo "Example commands:"
echo "  Set:    curl -X PUT http://localhost:5000/store/name -H 'Content-Type: application/json' -d '{\"value\": \"rafael\"}'"
echo "  Get:    curl http://localhost:5000/store/name"
echo "  Delete: curl -X DELETE http://localhost:5000/store/name"
echo "  Status: curl http://localhost:5000/status"
echo ""
echo "Kill leader to test election: kill \$PID1"
echo "Press Ctrl+C to stop all nodes"

wait
