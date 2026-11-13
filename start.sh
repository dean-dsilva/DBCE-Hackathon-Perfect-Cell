#!/usr/bin/env bash
# Perfect Cell launcher: kills any old instance, starts the server, opens the browser.
cd "$(dirname "$0")"

# stop an already-running instance (if we own its pidfile)
if [ -f /tmp/pq.pid ] && kill -0 "$(cat /tmp/pq.pid)" 2>/dev/null; then
  kill "$(cat /tmp/pq.pid)"
  sleep 1
fi

# port 3000 still busy (e.g. an old orphan instance)? free it, no matter who holds it
if ss -tln 2>/dev/null | grep -q ":3000 "; then
  echo "Port 3000 busy — freeing it…"
  for pid in $(ss -tlnp 2>/dev/null | grep ":3000 " | grep -oP "pid=\K[0-9]+"); do kill "$pid" 2>/dev/null; done
  sleep 1
fi

# start server in background, remember pid, log to /tmp
nohup node server.js > /tmp/pq.log 2>&1 &
echo $! > /tmp/pq.pid

sleep 1
if kill -0 "$(cat /tmp/pq.pid)" 2>/dev/null; then
  echo "✅ Perfect Cell running at http://localhost:3000  (log: /tmp/pq.log)"
  xdg-open http://localhost:3000 2>/dev/null &
else
  echo "❌ Server failed to start — check /tmp/pq.log"
  cat /tmp/pq.log
fi
